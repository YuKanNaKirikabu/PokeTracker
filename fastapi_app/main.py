from __future__ import annotations
import hashlib, hmac, json, os, secrets, threading, time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from fastapi import FastAPI, HTTPException, Request as FastRequest
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT=Path(__file__).resolve().parent.parent
REMOTE_BASE=os.getenv("POKETRACKER_DATA_BASE_URL","https://storage.yandexcloud.net/poketracker/data").strip().rstrip("/")
MONGODB_URI=os.getenv("MONGODB_URI","mongodb://127.0.0.1:27017").strip()
MONGODB_DATABASE=os.getenv("MONGODB_DATABASE","poketracker").strip() or "poketracker"
SAFE_MODE=os.getenv("POKETRACKER_SAFE_MODE","0").lower() in {"1","true","yes","on"}
REMOTE_WRITE=os.getenv("POKETRACKER_REMOTE_WRITE","0").lower() in {"1","true","yes","on"}
SESSION_COOKIE="poketracker_session"; SESSION_TTL=60*60*24*30
_sessions={}; _session_lock=threading.Lock(); _cards_cache=None; _cards_cache_expires=0.0
_mongo_client=None; _mongo_db=None
try:
 from pymongo import MongoClient
 from bson import ObjectId
except ImportError:
 MongoClient=None; ObjectId=None
app=FastAPI(title="PokeTracker API",version="2.0.0")

def mongo():
 global _mongo_client,_mongo_db
 if MongoClient is None: raise HTTPException(503,"MongoDB dependency missing. Run run.bat to install requirements.")
 if _mongo_db is None:
  _mongo_client=MongoClient(MONGODB_URI,serverSelectionTimeoutMS=4000)
  _mongo_client.admin.command("ping"); _mongo_db=_mongo_client[MONGODB_DATABASE]
  _mongo_db.users.create_index("username",unique=True); _mongo_db.user_collections.create_index("user_id",unique=True)
 return _mongo_db

def hash_password(password):
 salt=secrets.token_bytes(16); digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,240000)
 return "pbkdf2_sha256$240000$"+salt.hex()+"$"+digest.hex()

def verify_password(password,encoded):
 try:
  algorithm,rounds,salt_hex,digest_hex=encoded.split("$")
  if algorithm!="pbkdf2_sha256": return False
  digest=hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt_hex),int(rounds))
  return hmac.compare_digest(digest.hex(),digest_hex)
 except (ValueError,TypeError): return False

def session_for(request):
 token=request.cookies.get(SESSION_COOKIE)
 if not token: return None
 with _session_lock:
  session=_sessions.get(token)
  if not session or session["expires"]<time.time(): _sessions.pop(token,None); return None
  session["expires"]=time.time()+SESSION_TTL
  return session

def require_session(request):
 session=session_for(request)
 if not session: raise HTTPException(401,"Authentication required")
 return session

def remote_read(name,fallback):
 try:
  req=Request(REMOTE_BASE+"/"+quote(name)+"?_ts="+str(int(time.time())),headers={"Cache-Control":"no-cache"})
  with urlopen(req,timeout=15) as response: payload=json.loads(response.read().decode("utf-8-sig"))
  if name=="cards.json" and isinstance(payload,dict) and isinstance(payload.get("packs"),list) and isinstance(payload.get("cards"),list): return payload
  if name=="settings.json" and isinstance(payload,dict) and isinstance(payload.get("ui"),dict): return payload
  if name=="game-pokedex.json" and isinstance(payload,dict) and isinstance(payload.get("pokedexes"),dict): return payload
  return payload if isinstance(payload,dict) else fallback
 except Exception: return fallback

def remote_write(name,payload):
 if SAFE_MODE: raise HTTPException(403,"SAFE_MODE is enabled: writes are disabled")
 if not REMOTE_BASE: raise HTTPException(503,"Remote data URL is not configured")
 if not REMOTE_WRITE: raise HTTPException(403,"Remote writes are disabled in run.config.bat")
 req=Request(REMOTE_BASE+"/"+quote(name),data=json.dumps(payload,ensure_ascii=False,indent=2).encode("utf-8"),method="PUT",headers={"Content-Type":"application/json"})
 try:
  with urlopen(req,timeout=20): return
 except HTTPError as exc: raise HTTPException(exc.code,"Remote write failed: HTTP "+str(exc.code)) from exc
 except URLError as exc: raise HTTPException(502,"Remote write failed: "+str(exc)) from exc

def default_settings(): return {"version":"1.0","exportDate":None,"ui":{"packsHomeMode":"grid","language":"ru","theme":"dark"}}
def default_game_dex(): return {"version":"1.0","exportDate":None,"pokedexes":{}}

@app.get("/api/health")
def health(): return {"ok":True,"framework":"FastAPI","mongodb_dependency":MongoClient is not None}

@app.get("/api/cards")
def cards(limit:int=0,offset:int=0):
 global _cards_cache,_cards_cache_expires
 if _cards_cache is None or _cards_cache_expires<=time.time():
  _cards_cache=remote_read("cards.json",{"packs":[],"cards":[]}); _cards_cache_expires=time.time()+300
 data=_cards_cache
 if not isinstance(data,dict) or not isinstance(data.get("cards"),list) or not isinstance(data.get("packs"),list): raise HTTPException(502,"cards.json must contain packs[] and cards[]")
 offset=max(0,offset)
 limit=max(1,min(limit or max(len(data["cards"]),1),2000))
 return JSONResponse({**data,"cards":data["cards"][offset:offset+limit],"offset":offset,"limit":limit,"total":len(data["cards"]),"hasMore":offset+limit<len(data["cards"])},headers={"Cache-Control":"no-store"})

@app.get("/api/game-dex")
def game_dex():
 payload=remote_read("GameDex.json",{})
 if not isinstance(payload,dict) or not isinstance(payload.get("games"),list): raise HTTPException(502,"GameDex.json must contain games[]")
 return JSONResponse(payload,headers={"Cache-Control":"no-store"})

@app.get("/api/bootstrap")
def bootstrap(): return {"settings":remote_read("settings.json",default_settings()),"gamePokedex":remote_read("game-pokedex.json",default_game_dex())}
@app.get("/api/load-settings")
def load_settings(): return remote_read("settings.json",default_settings())
@app.post("/api/save-settings")
def save_settings(payload:dict[str,Any]): remote_write("settings.json",payload); return {"success":True}
@app.get("/api/load-game-pokedex")
def load_game_pokedex(): return remote_read("game-pokedex.json",default_game_dex())
@app.post("/api/save-game-pokedex")
def save_game_pokedex(payload:dict[str,Any]): remote_write("game-pokedex.json",payload); return {"success":True}

class Credentials(BaseModel):
 username:str=Field(min_length=3,max_length=32)
 password:str=Field(min_length=8,max_length=256)

@app.get("/api/auth/me")
def auth_me(request:FastRequest):
 session=session_for(request); return {"authenticated":bool(session),"username":session["username"] if session else None}

def login_response(user_id,username):
 token=secrets.token_urlsafe(32)
 with _session_lock: _sessions[token]={"user_id":user_id,"username":username,"expires":time.time()+SESSION_TTL}
 response=JSONResponse({"success":True,"username":username})
 response.set_cookie(SESSION_COOKIE,token,max_age=SESSION_TTL,httponly=True,samesite="lax",path="/")
 return response

@app.post("/api/auth/register")
def register(credentials:Credentials):
 username=credentials.username.strip()
 if len(username)<3 or len(username)>32: raise HTTPException(400,"Username must be 3-32 characters.")
 try:
  db=mongo(); result=db.users.insert_one({"username":username,"password_hash":hash_password(credentials.password),"created_at":time.time(),"updated_at":time.time()})
  db.user_collections.update_one({"user_id":result.inserted_id},{"$setOnInsert":{"owned":[],"wishlist":[],"created_at":time.time(),"updated_at":time.time()}},upsert=True)
  return login_response(str(result.inserted_id),username)
 except Exception as exc:
  if "duplicate" in str(exc).lower(): raise HTTPException(409,"Username already exists.") from exc
  if isinstance(exc,HTTPException): raise
  raise HTTPException(400,str(exc)) from exc

@app.post("/api/auth/login")
def login(credentials:Credentials):
 try:
  db=mongo(); user=db.users.find_one({"username":credentials.username.strip()})
  if not user or not verify_password(credentials.password,user.get("password_hash","")): raise HTTPException(401,"Invalid username or password.")
  db.user_collections.update_one({"user_id":user["_id"]},{"$setOnInsert":{"owned":[],"wishlist":[],"created_at":time.time(),"updated_at":time.time()}},upsert=True)
  return login_response(str(user["_id"]),user["username"])
 except HTTPException: raise
 except Exception as exc: raise HTTPException(400,str(exc)) from exc

@app.post("/api/auth/logout")
def logout(request:FastRequest):
 token=request.cookies.get(SESSION_COOKIE)
 if token:
  with _session_lock: _sessions.pop(token,None)
 response=JSONResponse({"success":True}); response.delete_cookie(SESSION_COOKIE,path="/"); return response

@app.get("/api/collection")
def get_collection(request:FastRequest):
 session=require_session(request)
 try:
  doc=mongo().user_collections.find_one({"user_id":ObjectId(session["user_id"])}) or {}
  return {"owned":doc.get("owned",[]),"wishlist":doc.get("wishlist",[]),"updatedAt":doc.get("updated_at")}
 except Exception as exc: raise HTTPException(500,str(exc)) from exc

class CollectionPayload(BaseModel):
 owned:list[str]
 wishlist:list[str]

@app.post("/api/collection")
def save_collection(payload:CollectionPayload,request:FastRequest):
 session=require_session(request)
 try:
  now=time.time(); mongo().user_collections.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"owned":sorted(set(payload.owned)),"wishlist":sorted(set(payload.wishlist)),"updated_at":now}},upsert=True)
  return {"success":True,"owned_count":len(payload.owned),"wishlist_count":len(payload.wishlist)}
 except Exception as exc: raise HTTPException(400,str(exc)) from exc

@app.get("/api/ping")
def ping():
 try: mongo().command("ping"); return {"ok":True,"mongodb":"connected"}
 except Exception as exc: return JSONResponse({"ok":False,"mongodb":str(exc)},status_code=503)

app.mount("/",StaticFiles(directory=ROOT,html=True),name="frontend")
