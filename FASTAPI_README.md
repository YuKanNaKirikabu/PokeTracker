# PokeTracker — FastAPI migration

The FastAPI application is now the HTTP server and API layer. The existing frontend modules, styling, pages, translations, pack catalog logic and game Pokédex UI are served from the repository root rather than replaced by a toy frontend.

## Run on Windows
Run `run.bat`. It loads `run.config.bat`, checks the Python dependencies and installs `requirements.txt` when needed. The app opens at the configured port (default 1025).

## API
- `GET /api/cards?limit=150&offset=0` — paginated cards and full pack metadata.
- `GET /api/bootstrap`, `GET /api/load-settings`, `POST /api/save-settings`
- `GET /api/load-game-pokedex`, `POST /api/save-game-pokedex`
- `GET /api/game-dex`
- `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/collection`, `POST /api/collection`

Card metadata and shared settings/game-Pokédex JSON continue to use the configured Yandex Storage data URL. User accounts and collections continue to use MongoDB. Set MongoDB credentials only through environment/configuration outside version control.

## Important
This branch is a migration baseline, not a claim that all flows have been integration-tested. Validate login/registration, MongoDB access, cloud writes, pack/subpack navigation, both Pokédexes, collection, wishlist and settings before replacing the stable branch.
