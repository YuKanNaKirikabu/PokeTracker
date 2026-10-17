from __future__ import annotations
import json, os, sqlite3
from pathlib import Path
from typing import Any
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
ROOT=Path(__file__).resolve().parent.parent
STATIC=Path(__file__).resolve().parent/"static"
DB_PATH=Path(os.getenv("POKETRACKER_DB",str(Path(__file__).resolve().parent/"poketracker.sqlite3")))
app=FastAPI(title="PokeTracker API",version="2.0.0")
app.mount("/static",StaticFiles(directory=STATIC),name="static")
def db():
 c=sqlite3.connect(DB_PATH); c.row_factory=sqlite3.Row
 c.execute("CREATE TABLE IF NOT EXISTS favorites (item_key TEXT PRIMARY KEY,item_type TEXT NOT NULL,item_name TEXT NOT NULL,image_url TEXT NOT NULL DEFAULT '')"); c.commit(); return c
def load_cards()->list[dict[str,Any]]:
 for p in (ROOT/"data"/"cards.json",ROOT/"cards.json",ROOT/"server"/"data"/"cards.json"):
  if p.is_file():
   try:
    d=json.loads(p.read_text(encoding="utf-8-sig"))
    if isinstance(d,list): return [x for x in d if isinstance(x,dict)]
    if isinstance(d,dict):
     for k in ("cards","data","items"):
      if isinstance(d.get(k),list): return [x for x in d[k] if isinstance(x,dict)]
   except (OSError,json.JSONDecodeError): pass
 return []
def val(row,*keys,default=""):
 for k in keys:
  v=row.get(k)
  if v is not None and not isinstance(v,(dict,list)): return str(v)
 return default
@app.get("/")
def index(): return FileResponse(STATIC/"index.html")
@app.get("/api/health")
def health(): return {"ok":True,"framework":"FastAPI","cards_loaded":len(load_cards())}
@app.get("/api/cards")
def cards(q:str="",pack:str="",limit:int=5000):
 out=[]
 for row in load_cards():
  name=val(row,"name","card_name","title","en_name","name_en") or "Без названия"
  pack_name=val(row,"pack","pack_name","set","expansion","set_name") or "Без пакета"
  if q and q.casefold() not in json.dumps(row,ensure_ascii=False).casefold(): continue
  if pack and pack.casefold() not in pack_name.casefold(): continue
  out.append({"id":val(row,"id","card_id","code",default=name),"name":name,"pack":pack_name,"type":val(row,"type","category","supertype","rarity"),"image":val(row,"image","image_url","img","url")})
  if len(out)>=max(1,min(limit,10000)): break
 return {"items":out,"total":len(out)}
class FavoriteInput(BaseModel):
 key:str
 type:str="card"
 name:str
 image:str=""
@app.get("/api/favorites")
def favorites():
 with db() as c: rows=c.execute("SELECT item_key,item_type,item_name,image_url FROM favorites ORDER BY item_name COLLATE NOCASE").fetchall()
 return {"items":[dict(r) for r in rows]}
@app.put("/api/favorites")
def add_favorite(item:FavoriteInput):
 with db() as c: c.execute("INSERT INTO favorites VALUES(?,?,?,?) ON CONFLICT(item_key) DO UPDATE SET item_type=excluded.item_type,item_name=excluded.item_name,image_url=excluded.image_url",(item.key,item.type,item.name,item.image))
 return {"ok":True,"key":item.key}
@app.delete("/api/favorites/{key:path}")
def remove_favorite(key:str):
 with db() as c: c.execute("DELETE FROM favorites WHERE item_key=?",(key,))
 return {"ok":True}
@app.on_event("startup")
def startup(): db().close()
