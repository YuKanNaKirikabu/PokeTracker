#!/usr/bin/env python3
import json
import os
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import sys


def env_flag(name: str, default: bool = False) -> bool:
    raw = str(os.getenv(name, "1" if default else "0")).strip().lower()
    return raw in ("1", "true", "yes", "on")


SAFE_MODE = env_flag("POKETRACKER_SAFE_MODE", False)

class APIHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/bootstrap':
            self.handle_bootstrap()
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
            
            # Create data directory
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            
            # Save to file
            collection_file = data_dir / 'collection.json'
            with open(collection_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
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
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            collection_file = data_dir / 'collection.json'
            
            # If file doesn't exist, create empty template
            if not collection_file.exists():
                data = {
                    'version': '1.0',
                    'exportDate': None,
                    'owned': [],
                    'wishlist': []
                }
                with open(collection_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                with open(collection_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
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
            
            # Create data directory
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            
            # Save to file
            settings_file = data_dir / 'settings.json'
            with open(settings_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
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
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            settings_file = data_dir / 'settings.json'
            
            # If file doesn't exist, create empty template
            if not settings_file.exists():
                data = {
                    'version': '1.0',
                    'exportDate': None,
                    'ui': {
                        'packsHomeMode': 'grid',
                        'language': 'ru',
                        'theme': 'dark'
                    }
                }
                with open(settings_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
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
            
            # Create data directory
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            
            # Save to file
            game_pokedex_file = data_dir / 'game-pokedex.json'
            with open(game_pokedex_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
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
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            game_pokedex_file = data_dir / 'game-pokedex.json'
            
            # If file doesn't exist, create empty template
            if not game_pokedex_file.exists():
                data = {
                    'version': '1.0',
                    'exportDate': None,
                    'pokedexes': {}
                }
                with open(game_pokedex_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                with open(game_pokedex_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
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
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)

            collection_file = data_dir / 'collection.json'
            if not collection_file.exists():
                collection_data = {
                    'version': '1.0',
                    'exportDate': None,
                    'owned': [],
                    'wishlist': []
                }
                with open(collection_file, 'w', encoding='utf-8') as f:
                    json.dump(collection_data, f, ensure_ascii=False, indent=2)
            else:
                with open(collection_file, 'r', encoding='utf-8') as f:
                    collection_data = json.load(f)

            settings_file = data_dir / 'settings.json'
            if not settings_file.exists():
                settings_data = {
                    'version': '1.0',
                    'exportDate': None,
                    'ui': {
                        'packsHomeMode': 'grid',
                        'language': 'ru',
                        'theme': 'dark'
                    }
                }
                with open(settings_file, 'w', encoding='utf-8') as f:
                    json.dump(settings_data, f, ensure_ascii=False, indent=2)
            else:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings_data = json.load(f)

            game_pokedex_file = data_dir / 'game-pokedex.json'
            if not game_pokedex_file.exists():
                game_pokedex_data = {
                    'version': '1.0',
                    'exportDate': None,
                    'pokedexes': {}
                }
                with open(game_pokedex_file, 'w', encoding='utf-8') as f:
                    json.dump(game_pokedex_data, f, ensure_ascii=False, indent=2)
            else:
                with open(game_pokedex_file, 'r', encoding='utf-8') as f:
                    game_pokedex_data = json.load(f)

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
    project_root = Path(__file__).resolve().parent.parent
    os.chdir(project_root)
    
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
