# PokeTracker FastAPI rewrite

This branch introduces an isolated FastAPI application while preserving the current application and data files for comparison and rollback.

## Launch on Windows

Run run.bat. It checks whether FastAPI and Uvicorn can be imported, installs requirements.txt if not, and starts the app at http://127.0.0.1:8000.

API health: http://127.0.0.1:8000/api/health

## Data

The first iteration looks for data/cards.json, cards.json, or server/data/cards.json in the repository root. Supported JSON shapes are an array or an object containing cards, data, or items. Favorites persist in a local SQLite database; set POKETRACKER_DB to change its path.

## Status

This is an initial isolated rewrite branch, not yet a feature-complete replacement of main. The legacy frontend and backend are retained until the existing data sources and feature parity are verified. The new UI has separate search state, persistent favorites, normal document scrolling, and no full-page reload when toggling favorites.
