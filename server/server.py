#!/usr/bin/env python3
import json
import os
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import sys
import time


def env_flag(name: str, default: bool = False) -> bool:
    raw = str(os.getenv(name, "1" if default else "0")).strip().lower()
    return raw in ("1", "true", "yes", "on")


SAFE_MODE = env_flag("POKETRACKER_SAFE_MODE", False)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
REMOTE_DATA_BASE_URL = str(
    os.getenv(
        "POKETRACKER_DATA_BASE_URL",
        "https://storage.yandexcloud.net/poketracker/data",
    )
).strip().rstrip("/")
REMOTE_DATA_WRITE_ENABLED = env_flag("POKETRACKER_REMOTE_WRITE", False)


def remote_data_url(file_name: str) -> str:
    if not REMOTE_DATA_BASE_URL:
        return ""
    return f"{REMOTE_DATA_BASE_URL}/{file_name}"


def normalize_payload(file_name: str, payload, default_payload):
    if not isinstance(payload, dict):
        return default_payload

    if file_name == 'collection.json':
        owned = payload.get('owned')
        wishlist = payload.get('wishlist')
        if not isinstance(owned, list) or not isinstance(wishlist, list):
            return default_payload
        normalized = dict(payload)
        normalized['owned'] = owned
        normalized['wishlist'] = wishlist
        normalized.setdefault('version', '1.0')
        normalized.setdefault('exportDate', None)
        return normalized

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
        elif parsed.path == '/api/load':
            self.handle_load()
        elif parsed.path == '/api/load-settings':
            self.handle_load_settings()
        elif parsed.path == '/api/load-game-pokedex':
            self.handle_load_game_pokedex()
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/save':
            self.handle_save()
        elif parsed.path == '/api/save-settings':
            self.handle_save_settings()
        elif parsed.path == '/api/save-game-pokedex':
            self.handle_save_game_pokedex()
        else:
            self.send_error(404)
    
    def handle_save(self):
        if SAFE_MODE:
            return self.handle_read_only_error()

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
            
            # Validate
            if not isinstance(data.get('owned'), list) or not isinstance(data.get('wishlist'), list):
                raise ValueError("Invalid data format")
            
            write_data_payload('collection.json', data)
            
            # Response
            response = {
                'success': True,
                'owned_count': len(data['owned']),
                'wishlist_count': len(data['wishlist'])
            }
            
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
    
    def handle_load(self):
        try:
            data = read_data_payload('collection.json', {
                'version': '1.0',
                'exportDate': None,
                'owned': [],
                'wishlist': []
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
            collection_data = read_data_payload('collection.json', {
                'version': '1.0',
                'exportDate': None,
                'owned': [],
                'wishlist': []
            })

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
                'collection': collection_data,
                'settings': settings_data,
                'gamePokedex': game_pokedex_data
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode('utf-8'))

        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_cards(self):
        try:
            data = read_data_payload('cards.json', {
                'packs': [],
                'cards': []
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
    
    def end_headers(self):
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
