from __future__ import annotations
import hashlib, hmac, json, os, secrets, threading, time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
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
_mongo_client=None; _mongo_db=None; _mongo_lock=threading.Lock()
try:
 from pymongo import MongoClient
 from bson import ObjectId
except ImportError:
 MongoClient=None; ObjectId=None
app=FastAPI(title="PokeTracker API",version="2.0.0")

def mongo():
 global _mongo_client,_mongo_db
 if MongoClient is None: raise HTTPException(503,"MongoDB dependency missing. Run run.bat to install requirements.")
 with _mongo_lock:
  if _mongo_db is None:
   client=MongoClient(MONGODB_URI,serverSelectionTimeoutMS=4000)
   client.admin.command("ping")
   db=client[MONGODB_DATABASE]
   db.users.create_index("username",unique=True)
   db.user_collections.create_index("user_id",unique=True)
   db.user_preferences.create_index("user_id",unique=True)
   _mongo_client=client; _mongo_db=db
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
  req=Request(REMOTE_BASE+"/"+quote(name,safe="/")+"?_ts="+str(int(time.time())),headers={"Cache-Control":"no-cache"})
  with urlopen(req,timeout=15) as response: payload=json.loads(response.read().decode("utf-8-sig"))
  if name=="cards.json" and isinstance(payload,dict) and isinstance(payload.get("packs"),list) and isinstance(payload.get("cards"),list): return payload
  if name=="GameDex.json" and isinstance(payload,list): return payload
  if name=="settings.json" and isinstance(payload,dict) and isinstance(payload.get("ui"),dict): return payload
  if name=="game-pokedex.json" and isinstance(payload,dict) and isinstance(payload.get("pokedexes"),dict): return payload
  return payload if isinstance(payload,dict) else fallback
 except Exception: return fallback

def remote_write(name,payload):
 if SAFE_MODE: raise HTTPException(403,"SAFE_MODE is enabled: writes are disabled")
 if not REMOTE_BASE: raise HTTPException(503,"Remote data URL is not configured")
 if not REMOTE_WRITE: raise HTTPException(403,"Remote writes are disabled in run.config.bat")
 parsed=urlparse(REMOTE_BASE)
 path_parts=[part for part in parsed.path.split("/") if part]
 if not parsed.scheme or not parsed.netloc or len(path_parts)<1:
  raise HTTPException(503,"Remote data URL must include the bucket and data prefix")
 bucket=path_parts[0]
 key="/".join(path_parts[1:]+[name])
 try:
  import boto3
  client=boto3.client(
   "s3",
   endpoint_url=f"{parsed.scheme}://{parsed.netloc}",
   region_name=os.getenv("AWS_DEFAULT_REGION","ru-central1"),
  )
  client.put_object(
   Bucket=bucket,
   Key=key,
   Body=json.dumps(payload,ensure_ascii=False,indent=2).encode("utf-8"),
   ContentType="application/json; charset=utf-8",
  )
 except Exception as exc:
  raise HTTPException(502,"Yandex Object Storage write failed. Check AWS CLI credentials and bucket permissions: "+str(exc)) from exc

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

@app.get("/api/pocket-mortys")
def pocket_mortys_catalog():
 payload=remote_read("PocketMortys/PocketMortys.json",[])
 if isinstance(payload,list): return JSONResponse(payload,headers={"Cache-Control":"no-store"})
 raise HTTPException(502,"PocketMortys.json must contain an array of Morty entries")

@app.get("/api/game-dex")
def game_dex():
 payload=remote_read("GameDex.json",[])
 if isinstance(payload,list): return JSONResponse(payload,headers={"Cache-Control":"no-store"})
 if not isinstance(payload,dict) or not isinstance(payload.get("games"),list): raise HTTPException(502,"GameDex.json must contain games[]")
 return JSONResponse(payload,headers={"Cache-Control":"no-store"})

def get_user_preferences(request:FastRequest):
 session=require_session(request)
 try:
  return mongo().user_preferences.find_one({"user_id":ObjectId(session["user_id"])}) or {}
 except HTTPException: raise
 except Exception as exc: raise HTTPException(503,"Could not load user data from MongoDB.") from exc

@app.get("/api/bootstrap")
def bootstrap(request:FastRequest):
 session=session_for(request)
 if not session: return {"settings":default_settings(),"gamePokedex":default_game_dex()}
 try:
  user_id=ObjectId(session["user_id"])
  preferences=mongo().user_preferences.find_one({"user_id":user_id}) or {}
  collection=mongo().user_collections.find_one({"user_id":user_id}) or {}
  return {"settings":preferences.get("settings",default_settings()),"gamePokedex":collection.get("game_pokedex",default_game_dex())}
 except Exception as exc: raise HTTPException(503,"Could not load user data from MongoDB.") from exc

@app.get("/api/load-settings")
def load_settings(request:FastRequest):
 doc=get_user_preferences(request)
 return doc.get("settings",default_settings())

@app.post("/api/save-settings")
def save_settings(payload:dict[str,Any],request:FastRequest):
 session=require_session(request)
 if not isinstance(payload.get("ui"),dict): raise HTTPException(400,"Settings payload must contain ui object.")
 try:
  mongo().user_preferences.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"settings":payload,"updated_at":time.time()}},upsert=True)
  return {"success":True}
 except Exception as exc: raise HTTPException(503,"Could not save settings to MongoDB.") from exc

@app.get("/api/load-game-pokedex")
def load_game_pokedex(request:FastRequest):
 session=require_session(request)
 try:
  doc=mongo().user_collections.find_one({"user_id":ObjectId(session["user_id"])}) or {}
  return doc.get("game_pokedex",default_game_dex())
 except Exception as exc: raise HTTPException(503,"Could not load game Pokédex from MongoDB.") from exc

@app.post("/api/save-game-pokedex")
def save_game_pokedex(payload:dict[str,Any],request:FastRequest):
 session=require_session(request)
 if not isinstance(payload.get("pokedexes"),dict): raise HTTPException(400,"Game Pokédex payload must contain pokedexes object.")
 try:
  mongo().user_collections.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"game_pokedex":payload,"updated_at":time.time()}},upsert=True)
  return {"success":True}
 except Exception as exc: raise HTTPException(503,"Could not save game Pokédex to MongoDB.") from exc

@app.get("/api/pocket-mortys-collection")
def get_pocket_mortys_collection(request:FastRequest):
 session=require_session(request)
 try:
  doc=mongo().user_collections.find_one({"user_id":ObjectId(session["user_id"])}) or {}
  return {"owned":doc.get("pocket_mortys",[])}
 except Exception as exc: raise HTTPException(503,"Could not load Pocket Mortys collection from MongoDB.") from exc

@app.post("/api/pocket-mortys-collection")
def save_pocket_mortys_collection(payload:dict[str,Any],request:FastRequest):
 session=require_session(request)
 owned=payload.get("owned")
 if not isinstance(owned,list) or any(not isinstance(item,str) or not item.isdigit() or len(item)>3 for item in owned):
  raise HTTPException(400,"owned must be an array of Morty index strings.")
 unique=sorted(set(owned),key=int)
 try:
  mongo().user_collections.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"pocket_mortys":unique,"updated_at":time.time()}},upsert=True)
  return {"success":True,"owned":unique}
 except Exception as exc: raise HTTPException(503,"Could not save Pocket Mortys collection to MongoDB.") from exc

@app.get("/api/game-favorites")
def load_game_favorites(request:FastRequest):
 session=require_session(request)
 try:
  doc=mongo().user_collections.find_one({"user_id":ObjectId(session["user_id"])}) or {}
  return {"favorites":doc.get("game_favorites",[])}
 except Exception as exc: raise HTTPException(503,"Could not load game favorites from MongoDB.") from exc

@app.post("/api/game-favorites")
def save_game_favorites(payload:dict[str,Any],request:FastRequest):
 session=require_session(request)
 favorites=payload.get("favorites")
 if not isinstance(favorites,list) or any(not isinstance(item,str) for item in favorites):
  raise HTTPException(400,"favorites must be an array of game IDs.")
 try:
  unique=list(dict.fromkeys(favorites))
  mongo().user_collections.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"game_favorites":unique,"updated_at":time.time()}},upsert=True)
  return {"success":True,"favorites":unique}
 except Exception as exc: raise HTTPException(503,"Could not save game favorites to MongoDB.") from exc

class Credentials(BaseModel):
 username:str=Field(min_length=3,max_length=32)
 password:str=Field(min_length=8,max_length=256)

class AvatarPayload(BaseModel):
 pokemon_number:int=Field(ge=1,le=1025)

@app.get("/api/auth/me")
def auth_me(request:FastRequest):
 session=session_for(request)
 if not session: return {"authenticated":False,"username":None,"pokemon_number":1}
 try:
  user=mongo().users.find_one({"_id":ObjectId(session["user_id"])},{"avatar_pokemon_number":1}) or {}
  return {"authenticated":True,"username":session["username"],"pokemon_number":user.get("avatar_pokemon_number",1)}
 except Exception as exc: raise HTTPException(503,"Could not load profile.") from exc

def login_response(user_id,username,pokemon_number=1):
 token=secrets.token_urlsafe(32)
 with _session_lock: _sessions[token]={"user_id":user_id,"username":username,"expires":time.time()+SESSION_TTL}
 response=JSONResponse({"success":True,"username":username,"pokemon_number":pokemon_number})
 response.set_cookie(SESSION_COOKIE,token,max_age=SESSION_TTL,httponly=True,samesite="lax",path="/")
 return response

@app.post("/api/auth/register")
def register(credentials:Credentials):
 username=credentials.username.strip()
 if len(username)<3 or len(username)>32: raise HTTPException(400,"Username must be 3-32 characters.")
 try:
  db=mongo(); result=db.users.insert_one({"username":username,"password_hash":hash_password(credentials.password),"avatar_pokemon_number":1,"created_at":time.time(),"updated_at":time.time()})
  db.user_collections.update_one({"user_id":result.inserted_id},{"$setOnInsert":{"owned":[],"wishlist":[],"created_at":time.time(),"updated_at":time.time()}},upsert=True)
  return login_response(str(result.inserted_id),username)
 except Exception as exc:
  if isinstance(exc,HTTPException): raise
  if "duplicate" in str(exc).lower(): raise HTTPException(409,"Username already exists.") from exc
  raise HTTPException(503,"Could not register account. Check MongoDB connection.") from exc

@app.post("/api/auth/login")
def login(credentials:Credentials):
 try:
  db=mongo(); user=db.users.find_one({"username":credentials.username.strip()})
  if not user or not verify_password(credentials.password,user.get("password_hash","")): raise HTTPException(401,"Invalid username or password.")
  db.user_collections.update_one({"user_id":user["_id"]},{"$setOnInsert":{"owned":[],"wishlist":[],"created_at":time.time(),"updated_at":time.time()}},upsert=True)
  return login_response(str(user["_id"]),user["username"],user.get("avatar_pokemon_number",1))
 except HTTPException: raise
 except Exception as exc: raise HTTPException(503,"Could not sign in. Check MongoDB connection.") from exc

@app.post("/api/auth/avatar")
def save_avatar(payload:AvatarPayload, request:FastRequest):
 session=require_session(request)
 try:
  mongo().users.update_one({"_id":ObjectId(session["user_id"])},{"$set":{"avatar_pokemon_number":payload.pokemon_number,"updated_at":time.time()}})
  return {"success":True,"pokemon_number":payload.pokemon_number}
 except Exception as exc: raise HTTPException(503,"Could not save profile avatar.") from exc

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
 except Exception as exc: raise HTTPException(503,"Could not load collection from MongoDB.") from exc

class CollectionPayload(BaseModel):
 owned:list[str]
 wishlist:list[str]

@app.post("/api/collection")
def save_collection(payload:CollectionPayload,request:FastRequest):
 session=require_session(request)
 try:
  now=time.time(); mongo().user_collections.update_one({"user_id":ObjectId(session["user_id"])},{"$set":{"owned":sorted(set(payload.owned)),"wishlist":sorted(set(payload.wishlist)),"updated_at":now}},upsert=True)
  return {"success":True,"owned_count":len(payload.owned),"wishlist_count":len(payload.wishlist)}
 except Exception as exc: raise HTTPException(503,"Could not save collection to MongoDB.") from exc

@app.get("/api/ping")
def ping():
 try: mongo().command("ping"); return {"ok":True,"mongodb":"connected"}
 except Exception as exc: return JSONResponse({"ok":False,"mongodb":str(exc)},status_code=503)

app.mount("/",StaticFiles(directory=ROOT,html=True),name="frontend")
