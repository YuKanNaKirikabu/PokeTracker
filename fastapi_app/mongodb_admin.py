from __future__ import annotations
import hashlib, hmac, os, secrets, threading, time, json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import json_util

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "mongo_admin"
URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017").strip()
DB_NAME = os.getenv("MONGODB_DATABASE", "poketracker").strip() or "poketracker"
COOKIE = "poketracker_mdb_session"
TTL = 28800
sessions: dict[str, dict[str, Any]] = {}
lock = threading.Lock()
client_instance = None
client_lock = threading.Lock()
app = FastAPI(title="PokeTracker MongoDB Admin", docs_url=None, redoc_url=None, openapi_url=None)

def mongo():
    global client_instance
    with client_lock:
        if client_instance is None:
            client_instance = MongoClient(URI, serverSelectionTimeoutMS=4000)
            client_instance.admin.command("ping")
    return client_instance

def verify_password(password, encoded):
    try:
        algorithm, rounds, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "pbkdf2_sha256": return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError, AttributeError):
        return False

def session_for(request):
    token = request.cookies.get(COOKIE)
    if not token: return None
    with lock:
        session = sessions.get(token)
        if not session or session["expires"] <= time.time():
            sessions.pop(token, None)
            return None
        session["expires"] = time.time() + TTL
        return session

def current_user(request):
    session = session_for(request)
    if not session: raise HTTPException(401, "Требуется авторизация.")
    try:
        user = mongo()[DB_NAME].users.find_one({"_id": session["user_id"]}, {"ismdb": 1, "username": 1})
        if not user or user.get("ismdb") is not True:
            token = request.cookies.get(COOKIE)
            if token:
                with lock: sessions.pop(token, None)
            raise HTTPException(403, "У этого аккаунта нет доступа к обозревателю MongoDB.")
        return user
    except HTTPException: raise
    except PyMongoError as exc: raise HTTPException(503, "Не удалось проверить доступ в MongoDB.") from exc

class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=1, max_length=256)

@app.get("/api/mdb/auth/me")
def auth_me(request: Request):
    try:
        user = current_user(request)
        return {"authenticated": True, "username": user.get("username")}
    except HTTPException as exc:
        if exc.status_code in (401, 403): return {"authenticated": False, "username": None}
        raise

@app.post("/api/mdb/auth/login")
def login(payload: Credentials):
    try:
        user = mongo()[DB_NAME].users.find_one({"username": payload.username.strip()})
        if not user or not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(401, "Неверный логин или пароль.")
        if user.get("ismdb") is not True:
            raise HTTPException(403, "У этого аккаунта нет доступа к обозревателю MongoDB.")
        token = secrets.token_urlsafe(36)
        with lock:
            sessions[token] = {"user_id": user["_id"], "username": user["username"], "expires": time.time() + TTL}
        response = JSONResponse({"success": True, "username": user["username"]})
        response.set_cookie(COOKIE, token, max_age=TTL, httponly=True, samesite="strict",
                            secure=os.getenv("MDB_ADMIN_COOKIE_SECURE", "0") == "1", path="/")
        return response
    except HTTPException: raise
    except PyMongoError as exc: raise HTTPException(503, "Не удалось подключиться к MongoDB.") from exc

@app.post("/api/mdb/auth/logout")
def logout(request: Request):
    token = request.cookies.get(COOKIE)
    if token:
        with lock: sessions.pop(token, None)
    response = JSONResponse({"success": True})
    response.delete_cookie(COOKIE, path="/")
    return response

def safe(value): return json.loads(json_util.dumps(value))

@app.get("/api/mdb/databases")
def databases(request: Request):
    current_user(request)
    try:
        result = []
        for name in sorted(mongo().list_database_names()):
            try:
                s = mongo()[name].command("dbStats")
                result.append({"name": name, "collections": int(s.get("collections", 0)), "documents": int(s.get("objects", 0)),
                               "size": int(s.get("dataSize", 0)), "storageSize": int(s.get("storageSize", 0))})
            except PyMongoError:
                result.append({"name": name, "collections": None, "documents": None, "size": None, "storageSize": None})
        return {"databases": result}
    except PyMongoError as exc: raise HTTPException(503, "Не удалось прочитать базы данных.") from exc

@app.get("/api/mdb/databases/{database}/collections")
def collections(database: str, request: Request):
    current_user(request)
    try:
        db = mongo()[database]
        result = []
        for name in sorted(db.list_collection_names()):
            try:
                s = db.command("collStats", name)
                result.append({"name": name, "documents": int(s.get("count", 0)), "size": int(s.get("size", 0)),
                               "storageSize": int(s.get("storageSize", 0)), "indexes": int(s.get("nindexes", 0))})
            except PyMongoError:
                result.append({"name": name, "documents": None, "size": None, "storageSize": None, "indexes": None})
        return {"database": database, "collections": result}
    except PyMongoError as exc: raise HTTPException(503, "Не удалось прочитать коллекции.") from exc

@app.get("/api/mdb/databases/{database}/collections/{collection}/documents")
def documents(database: str, collection: str, request: Request, skip: int = 0, limit: int = 50):
    current_user(request)
    skip, limit = max(0, min(skip, 1000000)), max(1, min(limit, 200))
    try:
        coll = mongo()[database][collection]
        return {"database": database, "collection": collection, "skip": skip, "limit": limit,
                "total": coll.estimated_document_count(),
                "documents": [safe(d) for d in coll.find({}).skip(skip).limit(limit)]}
    except PyMongoError as exc: raise HTTPException(503, "Не удалось прочитать документы.") from exc

def resolve_timezone(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def month_offset(value, offset):
    total = value.year * 12 + value.month - 1 + offset
    return value.replace(year=total // 12, month=total % 12 + 1, day=1,
                         hour=0, minute=0, second=0, microsecond=0)


def period_start(period, timezone_name="UTC"):
    now_utc = datetime.now(timezone.utc)
    rolling_hours = {"1h": 1, "24h": 24, "7d": 168, "30d": 720}
    if period in rolling_hours:
        return now_utc - timedelta(hours=rolling_hours[period])
    tz = resolve_timezone(timezone_name)
    now = datetime.now(tz)
    if period == "hours":
        start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
    elif period == "days":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30)
    elif period == "months":
        start = month_offset(now, -11)
    elif period == "years":
        return None
    else:
        return now_utc - timedelta(hours=24)
    return start.astimezone(timezone.utc)


def profiler_rows(period, limit=5000, timezone_name="UTC"):
    rows, missing = [], []
    since = period_start(period, timezone_name)
    query = {"ts": {"$gte": since}} if since is not None else {}
    client = mongo()
    for name in client.list_database_names():
        try:
            db = client[name]
            if "system.profile" not in db.list_collection_names():
                missing.append(name)
                continue
            for doc in db["system.profile"].find(query).sort("ts", -1).limit(limit):
                cmd = doc.get("command") or {}
                op = str(doc.get("op", "unknown"))
                coll = next((cmd[k] for k in ("find", "aggregate", "insert", "update", "delete", "count", "distinct") if k in cmd), doc.get("ns", "").split(".", 1)[-1])
                rows.append({"time": doc.get("ts"), "database": name, "operation": op, "collection": str(coll),
                             "durationMs": int(doc.get("millis", 0)), "namespace": str(doc.get("ns", "")),
                             "command": safe(cmd), "nReturned": doc.get("nreturned", doc.get("nReturned"))})
        except PyMongoError: missing.append(name)
    rows.sort(key=lambda r: r["time"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return rows[:limit], sorted(set(missing))

def activity_rows(period, limit=5000, timezone_name="UTC"):
    """Only successful data mutations recorded by the PokeTracker API; excludes dashboard/admin reads."""
    since = period_start(period, timezone_name)
    query = {"ts": {"$gte": since}} if since is not None else {}
    cursor = mongo()[DB_NAME]["activity_log"].find(query).sort("ts", -1).limit(max(1, min(limit, 50000)))
    rows = []
    for doc in cursor:
        stamp = doc.get("ts")
        rows.append({
            "time": stamp,
            "database": DB_NAME,
            "operation": str(doc.get("operation", "update")),
            "collection": str(doc.get("collection", "")),
            "durationMs": float(doc.get("durationMs", 0)),
            "namespace": DB_NAME + "." + str(doc.get("collection", "")),
            "command": {"source": "PokeTracker"},
            "nReturned": None,
        })
    return rows



@app.get("/api/mdb/dashboard/stream")
def dashboard_stream(request: Request):
    current_user(request)
    def events():
        activity = mongo()[DB_NAME]["activity_log"]
        latest = activity.find_one({}, {"_id": 1}, sort=[("_id", -1)])
        last_id = latest["_id"] if latest else None
        yield "event: ready\\ndata: {}\\n\\n"
        while True:
            time.sleep(1.5)
            latest = activity.find_one({}, {"_id": 1}, sort=[("_id", -1)])
            current_id = latest["_id"] if latest else None
            if current_id is not None and current_id != last_id:
                last_id = current_id
                yield "event: change\\ndata: {}\\n\\n"
    return StreamingResponse(events(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})

@app.get("/api/mdb/query-log")
def query_log(request: Request, period: str = "24h", limit: int = 200):
    current_user(request)
    try:
        rows = activity_rows(period, max(1, min(limit, 500)))
        return {"period": period, "rows": safe(rows), "profilingUnavailable": []}
    except PyMongoError as exc: raise HTTPException(503, "Не удалось прочитать журнал изменений PokeTracker.") from exc

@app.get("/api/mdb/dashboard")
def dashboard(request: Request, period: str = "days", timezone_name: str = "UTC"):
    current_user(request)
    try:
        client = mongo()
        server = client.admin.command("serverStatus")
        dbs, totals = [], {"collections": 0, "documents": 0, "dataSize": 0, "storageSize": 0}
        for name in client.list_database_names():
            try:
                s = client[name].command("dbStats")
                row = {"name": name, "collections": int(s.get("collections", 0)), "documents": int(s.get("objects", 0)),
                       "dataSize": int(s.get("dataSize", 0)), "storageSize": int(s.get("storageSize", 0))}
                dbs.append(row)
                for key in totals: totals[key] += row[key]
            except PyMongoError: pass

        tz = resolve_timezone(timezone_name)
        now = datetime.now(tz)
        rows = activity_rows(period, 50000 if period == "years" else 5000, timezone_name)
        missing = []
        if period == "hours":
            first = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
            bucket_keys = [first + timedelta(hours=i) for i in range(24)]
            label_format = "%d.%m %H:00"
        elif period == "days":
            first = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30)
            bucket_keys = [first + timedelta(days=i) for i in range(31)]
            label_format = "%d.%m"
        elif period == "months":
            first = month_offset(now, -11)
            bucket_keys = [month_offset(first, i) for i in range(12)]
            label_format = "%m.%Y"
        else:
            observed_years = []
            for row in rows:
                stamp = row.get("time")
                if stamp:
                    if stamp.tzinfo is None:
                        stamp = stamp.replace(tzinfo=timezone.utc)
                    observed_years.append(stamp.astimezone(tz).year)
            first_year = min(observed_years) if observed_years else now.year
            bucket_keys = [datetime(year, 1, 1, tzinfo=tz) for year in range(first_year, now.year + 1)]
            label_format = "%Y"

        timeline = {key: {"queries": 0, "durationMs": 0} for key in bucket_keys}
        for row in rows:
            stamp = row.get("time")
            if not stamp:
                continue
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=timezone.utc)
            local_stamp = stamp.astimezone(tz)
            if period == "hours":
                key = local_stamp.replace(minute=0, second=0, microsecond=0)
            elif period == "days":
                key = local_stamp.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "months":
                key = local_stamp.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                key = datetime(local_stamp.year, 1, 1, tzinfo=tz)
            if key in timeline:
                timeline[key]["queries"] += 1
                timeline[key]["durationMs"] += row["durationMs"]

        ordered_timeline = [
            {"label": key.strftime(label_format), **values}
            for key, values in sorted(timeline.items(), key=lambda item: item[0])
        ]
        return {"period": period, "server": {"version": server.get("version", "?"), "uptimeSeconds": int(server.get("uptime", 0)),
                "connections": server.get("connections", {}), "opcounters": server.get("opcounters", {})},
                "totals": totals, "databases": dbs, "queryCount": len(rows),
                "averageDurationMs": round(sum(r["durationMs"] for r in rows) / len(rows), 2) if rows else 0,
                "timeline": ordered_timeline, "profilingUnavailable": missing}
    except PyMongoError as exc: raise HTTPException(503, "Не удалось получить статистику MongoDB.") from exc

@app.get("/")
def index(): return FileResponse(WEB / "index.html")

app.mount("/", StaticFiles(directory=WEB), name="static")
