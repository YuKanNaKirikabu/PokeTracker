#!/usr/bin/env python3
import json
import hashlib
import hmac
import os
import secrets
import threading
import time
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import sys
import time

try:
    from pymongo import MongoClient, ReturnDocument
except ImportError:
    MongoClient = None
    ReturnDocument = None


def env_flag(name: str, default: bool = False) -> bool:
    raw = str(os.getenv(name, "1" if default else "0")).strip().lower()
    return raw in ("1", "true", "yes", "on")


SAFE_MODE = env_flag("POKETRACKER_SAFE_MODE", False)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
REMOTE_DATA_BASE_URL = str(os.getenv("POKETRACKER_DATA_BASE_URL", "")).strip().rstrip("/")
REMOTE_DATA_WRITE_ENABLED = env_flag("POKETRACKER_REMOTE_WRITE", False)
MONGODB_URI = str(os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")).strip()
MONGODB_DATABASE = str(os.getenv("MONGODB_DATABASE", "poketracker")).strip() or "poketracker"
SESSION_COOKIE = "poketracker_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
_mongo_client = None
_mongo_db = None
_mongo_lock = threading.Lock()
_sessions = {}
_cards_cache = None
_cards_cache_expires = 0


def remote_data_url(file_name: str) -> str:
    if not REMOTE_DATA_BASE_URL:
        return ""
    return f"{REMOTE_DATA_BASE_URL}/{file_name}"


def get_mongo_db():
    global _mongo_client, _mongo_db
    if MongoClient is None:
        raise RuntimeError("MongoDB support is unavailable. Install dependencies from requirements.txt.")
    with _mongo_lock:
        if _mongo_db is None:
            _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
            _mongo_client.admin.command("ping")
            _mongo_db = _mongo_client[MONGODB_DATABASE]
            _mongo_db.users.create_index("username", unique=True)
            _mongo_db.user_collections.create_index("user_id", unique=True)
        return _mongo_db


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240000)
    return f"pbkdf2_sha256$240000${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(rounds)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def request_session(handler):
    cookie = SimpleCookie()
    cookie.load(handler.headers.get("Cookie", ""))
    token = cookie.get(SESSION_COOKIE)
    if not token:
        return None
    session = _sessions.get(token.value)
    if not session or session["expires"] < time.time():
        _sessions.pop(token.value, None)
        return None
    session["expires"] = time.time() + SESSION_TTL_SECONDS
    return session


def new_session(user_id, username):
    token = secrets.token_urlsafe(32)
    _sessions[token] = {
        "user_id": user_id,
        "username": username,
        "expires": time.time() + SESSION_TTL_SECONDS,
    }
    return token


def normalize_payload(file_name: str, payload, default_payload):
    if not isinstance(payload, dict):
        return default_payload

    if file_name == 'settings.json':
        ui = payload.get('ui')
        if not isinstance(ui, dict):
            return default_payload
        normalized = dict(payload)
        normalized['ui'] = ui
        normalized.setdefault('version', '1.0')
        normalized.setdefault('exportDate', None)
        return normalized

    if file_name == 'game-pokedex.json':
        pokedexes = payload.get('pokedexes')
        if not isinstance(pokedexes, dict):
            return default_payload
        normalized = dict(payload)
        normalized['pokedexes'] = pokedexes
        normalized.setdefault('version', '1.0')
        normalized.setdefault('exportDate', None)
        return normalized

    if file_name == 'cards.json':
        packs = payload.get('packs')
        cards = payload.get('cards')
        if not isinstance(packs, list) or not isinstance(cards, list):
            return default_payload
        return payload

    return payload


def read_data_payload(file_name: str, default_payload):
    remote_url = remote_data_url(file_name)
    if not remote_url:
        return default_payload

    try:
        sep = '&' if '?' in remote_url else '?'
        req = Request(f"{remote_url}{sep}_ts={int(time.time())}", method='GET')
        with urlopen(req, timeout=10) as response:
            raw_payload = json.loads(response.read().decode('utf-8'))
            return normalize_payload(file_name, raw_payload, default_payload)
    except Exception:
        return default_payload

    return default_payload


def write_data_payload(file_name: str, payload):
    remote_url = remote_data_url(file_name)
    if not remote_url:
        raise RuntimeError("Remote data URL is not configured.")

    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')

    if not REMOTE_DATA_WRITE_ENABLED:
        raise RuntimeError(
            "Remote data URL is configured in read-only mode. "
            "Enable POKETRACKER_REMOTE_WRITE=1 only if cloud PUT writes are allowed."
        )

    req = Request(
        remote_url,
        data=raw,
        method='PUT',
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urlopen(req, timeout=15):
            return
    except HTTPError as err:
        raise RuntimeError(
            f"Remote write failed ({err.code}) for {file_name}. "
            "Public object URL is read-only; configure signed S3 write or enable write access."
        ) from err
    except URLError as err:
        raise RuntimeError(f"Remote write failed for {file_name}: {err}") from err

class APIHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/bootstrap':
            self.handle_bootstrap()
        elif parsed.path == '/api/cards':
            self.handle_cards()
        elif parsed.path == '/api/auth/me':
            self.handle_auth_me()
        elif parsed.path == '/api/collection':
            self.handle_collection()
        elif parsed.path == '/api/game-dex':
            self.handle_game_dex()
        elif parsed.path == '/api/load-settings':
            self.handle_load_settings()
        elif parsed.path == '/api/load-game-pokedex':
            self.handle_load_game_pokedex()
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/save-settings':
            self.handle_save_settings()
        elif parsed.path == '/api/save-game-pokedex':
            self.handle_save_game_pokedex()
        elif parsed.path == '/api/auth/register':
            self.handle_register()
        elif parsed.path == '/api/auth/login':
            self.handle_login()
        elif parsed.path == '/api/auth/logout':
            self.handle_logout()
        elif parsed.path == '/api/collection':
            self.handle_save_collection()
        else:
            self.send_error(404)

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(content_length).decode('utf-8'))

    def send_json(self, payload, status=200, cache_control="no-store"):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', cache_control)
        self.end_headers()
        self.wfile.write(body)

    def require_session(self):
        session = request_session(self)
        if not session:
            self.send_json({'success': False, 'error': 'Authentication required'}, 401)
            return None
        return session

    def handle_auth_me(self):
        session = request_session(self)
        self.send_json({
            'authenticated': bool(session),
            'username': session['username'] if session else None,
        })

    def handle_register(self):
        try:
            data = self.read_json_body()
            username = str(data.get('username', '')).strip()
            password = str(data.get('password', ''))
            if len(username) < 3 or len(username) > 32:
                raise ValueError("Username must be 3-32 characters.")
            if len(password) < 8:
                raise ValueError("Password must contain at least 8 characters.")
            db = get_mongo_db()
            user = {
                'username': username,
                'password_hash': hash_password(password),
                'created_at': time.time(),
                'updated_at': time.time(),
            }
            result = db.users.insert_one(user)
            db.user_collections.update_one(
                {'user_id': result.inserted_id},
                {'$setOnInsert': {
                    'owned': [],
                    'wishlist': [],
                    'created_at': time.time(),
                    'updated_at': time.time(),
                }},
                upsert=True,
            )
            self.create_session_response(result.inserted_id, username)
        except Exception as err:
            status = 409 if "duplicate key" in str(err).lower() else 400
            self.send_json({'success': False, 'error': str(err)}, status)

    def handle_login(self):
        try:
            data = self.read_json_body()
            username = str(data.get('username', '')).strip()
            password = str(data.get('password', ''))
            user = get_mongo_db().users.find_one({'username': username})
            if not user or not verify_password(password, user.get('password_hash', '')):
                self.send_json({'success': False, 'error': 'Invalid username or password.'}, 401)
                return
            get_mongo_db().user_collections.update_one(
                {'user_id': user['_id']},
                {'$setOnInsert': {
                    'owned': [],
                    'wishlist': [],
                    'created_at': time.time(),
                    'updated_at': time.time(),
                }},
                upsert=True,
            )
            self.create_session_response(user['_id'], user['username'])
        except Exception as err:
            self.send_json({'success': False, 'error': str(err)}, 400)

    def create_session_response(self, user_id, username):
        token = new_session(str(user_id), username)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header(
            'Set-Cookie',
            f'{SESSION_COOKIE}={token}; Max-Age={SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax; Path=/',
        )
        self.end_headers()
        self.wfile.write(json.dumps({'success': True, 'username': username}).encode('utf-8'))

    def handle_logout(self):
        cookie = SimpleCookie()
        cookie.load(self.headers.get("Cookie", ""))
        token = cookie.get(SESSION_COOKIE)
        if token:
            _sessions.pop(token.value, None)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Set-Cookie', f'{SESSION_COOKIE}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/')
        self.end_headers()
        self.wfile.write(b'{"success":true}')

    def handle_collection(self):
        session = self.require_session()
        if not session:
            return
        try:
            from bson import ObjectId
            document = get_mongo_db().user_collections.find_one({'user_id': ObjectId(session['user_id'])}) or {}
            self.send_json({
                'owned': document.get('owned', []),
                'wishlist': document.get('wishlist', []),
                'updatedAt': document.get('updated_at'),
            })
        except Exception as err:
            self.send_json({'success': False, 'error': str(err)}, 500)

    def handle_save_collection(self):
        session = self.require_session()
        if not session:
            return
        try:
            from bson import ObjectId
            data = self.read_json_body()
            owned = data.get('owned')
            wishlist = data.get('wishlist')
            if not isinstance(owned, list) or not isinstance(wishlist, list):
                raise ValueError("owned and wishlist must be arrays.")
            now = time.time()
            get_mongo_db().user_collections.update_one(
                {'user_id': ObjectId(session['user_id'])},
                {'$set': {
                    'owned': sorted({str(value) for value in owned}),
                    'wishlist': sorted({str(value) for value in wishlist}),
                    'updated_at': now,
                }},
                upsert=True,
            )
            self.send_json({'success': True, 'owned_count': len(owned), 'wishlist_count': len(wishlist)})
        except Exception as err:
            self.send_json({'success': False, 'error': str(err)}, 400)
    
    def handle_save_settings(self):
        if SAFE_MODE:
            return self.handle_read_only_error()

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
            
            write_data_payload('settings.json', data)
            
            # Response
            response = {'success': True}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
    
    def handle_load_settings(self):
        try:
            data = read_data_payload('settings.json', {
                'version': '1.0',
                'exportDate': None,
                'ui': {
                    'packsHomeMode': 'grid',
                    'language': 'ru',
                    'theme': 'dark'
                }
            })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def handle_save_game_pokedex(self):
        if SAFE_MODE:
            return self.handle_read_only_error()

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
            
            write_data_payload('game-pokedex.json', data)
            
            # Response
            response = {'success': True}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
    
    def handle_load_game_pokedex(self):
        try:
            data = read_data_payload('game-pokedex.json', {
                'version': '1.0',
                'exportDate': None,
                'pokedexes': {}
            })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_bootstrap(self):
        try:
            settings_data = read_data_payload('settings.json', {
                'version': '1.0',
                'exportDate': None,
                'ui': {
                    'packsHomeMode': 'grid',
                    'language': 'ru',
                    'theme': 'dark'
                }
            })

            game_pokedex_data = read_data_payload('game-pokedex.json', {
                'version': '1.0',
                'exportDate': None,
                'pokedexes': {}
            })

            payload = {
                'settings': settings_data,
                'gamePokedex': game_pokedex_data
            }

            self.send_json(payload)

        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_game_dex(self):
        try:
            remote_url = "https://storage.yandexcloud.net/poketracker/data/GameDex.json"
            req = Request(f"{remote_url}?_ts={int(time.time())}", method='GET')
            with urlopen(req, timeout=15) as response:
                payload = json.loads(response.read().decode('utf-8'))

            if not isinstance(payload, dict) or not isinstance(payload.get('games'), list):
                raise ValueError("GameDex.json must contain a games[] array.")

            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        except HTTPError as err:
            self.send_response(err.code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f"GameDex.json upstream HTTP {err.code}"}).encode('utf-8'))
        except Exception as err:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f"Could not load GameDex.json: {err}"}).encode('utf-8'))

    def handle_cards(self):
        global _cards_cache, _cards_cache_expires
        try:
            if _cards_cache is None or _cards_cache_expires <= time.time():
                _cards_cache = read_data_payload('cards.json', {'packs': [], 'cards': []})
                _cards_cache_expires = time.time() + 300
            data = _cards_cache
            query = parse_qs(urlparse(self.path).query)
            try:
                limit = max(1, min(int(query.get('limit', ['0'])[0]), 500))
                offset = max(0, int(query.get('offset', ['0'])[0]))
            except ValueError:
                raise ValueError("Invalid cards pagination parameters.")
            if limit:
                cards = data['cards']
                data = {
                    **data,
                    'cards': cards[offset:offset + limit],
                    'offset': offset,
                    'limit': limit,
                    'total': len(cards),
                    'hasMore': offset + limit < len(cards),
                }

            self.send_json(data, cache_control='public, max-age=31536000, immutable')

        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def end_headers(self):
        path = urlparse(self.path).path
        if path.startswith("/api/") and not path.startswith("/api/cards"):
            self.send_header("Cache-Control", "no-store")
        elif path.lower().endswith((".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg", ".woff2", ".js", ".css")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.lower().endswith((".html", ".bat")):
            self.send_header("Cache-Control", "no-cache")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def handle_read_only_error(self):
        self.send_response(403)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': False, 'error': 'SAFE_MODE is enabled: writes are disabled'}).encode('utf-8'))

if __name__ == '__main__':
    os.chdir(PROJECT_ROOT)
    
    try:
        PORT = int(str(os.getenv("POKETRACKER_PORT", "1025")))
    except ValueError:
        PORT = 1025

    if PORT < 1 or PORT > 65535:
        PORT = 1025

    HOST = str(os.getenv("POKETRACKER_HOST", "localhost")).strip().lower()
    if HOST not in ("localhost", "0.0.0.0", "127.0.0.1"):
        HOST = "localhost"
    if HOST == "127.0.0.1":
        HOST = "localhost"

    server = HTTPServer((HOST, PORT), APIHandler)
    
    print(f"PokeTracker server running on http://localhost:{PORT}")
    if REMOTE_DATA_BASE_URL:
        print(f"Remote data URL: {REMOTE_DATA_BASE_URL}")
        print(f"Remote write: {'enabled' if REMOTE_DATA_WRITE_ENABLED else 'disabled'}")
    else:
        print("Remote data URL is not configured (API returns defaults, writes are disabled).")
    if HOST == "0.0.0.0":
        print("Host mode: 0.0.0.0 (LAN access enabled)")
    if SAFE_MODE:
        print("SAFE_MODE enabled: save endpoints are read-only")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        sys.exit(0)
