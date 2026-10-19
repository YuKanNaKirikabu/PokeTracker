# PokeTracker

PokeTracker is served by **FastAPI**. The existing browser interface is retained to preserve the current card catalogue, packs and subpacks, standard Pokédex, game Pokédexes, settings, filters, translations, and collection UI. Python handles HTTP endpoints, authentication, persistence, and static-file delivery; JavaScript remains only for browser-side interactions.

## Run locally

1. Install Python 3.11 or newer.
2. Ensure MongoDB is running at `mongodb://127.0.0.1:27017`, or edit the local configuration.
3. Run `run.bat`. It checks and installs packages from `requirements.txt`.
4. Open the local URL printed by the launcher.

The local `run.config.bat` controls host, port, safe mode, Yandex data URL, remote writes, and MongoDB settings. Do not commit credentials.

## Deploy with Docker

On a server with Docker Compose, copy `.env.example` to `.env`, adjust the
settings if needed, and start the application:

```bash
docker compose up -d --build
```

The application is available at `http://<server>:1025`. MongoDB is
started automatically and its data is stored in the `poketracker-mongodb`
Docker volume.

Check the deployment with:

```bash
docker compose ps
docker compose logs -f app
```

Stop the services without deleting MongoDB data with:

```bash
docker compose down
```

Set `MONGODB_URI`, `MONGODB_DATABASE`, and the Yandex storage settings in
`.env`; do not commit that file because it may contain credentials.

## Data sources

- TCG Pocket packs and cards: `https://storage.yandexcloud.net/poketracker/data/cards.json`.
- Game Pokédex catalogue: `GameDex.json` in the same data prefix.
- UI settings and game Pokédex progress: `settings.json` and `game-pokedex.json` in Yandex Object Storage.
- Per-user owned cards and wishlist: MongoDB collections `users` and `user_collections`. The app does not use a shared cloud `collection.json` for these user-specific records.

Yandex reads use the configured public object URLs. Writes use the S3 API through boto3 and the AWS CLI/default AWS credentials chain. The bucket must permit the configured key to be written. Set `SAFE_MODE=1` to block remote writes.

## Catalogue format

- `packs[]` order determines pack display order.
- `series` determines series grouping.
- `kind: "pack"` describes one booster and includes its own artwork, logo, folder, and count.
- `kind: "collection"` groups multiple boosters; each `subpacks[]` item has its own ID, display name, artwork, and logo.
- A card in a collection uses the collection ID in `pack`; `subpacks[]` identifies the boosters containing it. Shared cards remain one record.
- `All` is a UI-only view and must not be stored as a pack or subpack.
- Non-Pokémon categories such as `TRAINER`, `ARENA`, `ENERGY`, `ITEM`, and `TOOL` remain category text.

## API and checks

FastAPI exposes `/api/cards`, `/api/game-dex`, `/api/bootstrap`, settings and game-Pokédex load/save routes, authentication routes, and `/api/collection`. Interactive browser behaviour stays in the frontend.

Run checks locally with:

```bat
py -3 -m pip install -r requirements-dev.txt
py -3 -m compileall -q fastapi_app
py -3 -m pytest -q
```

GitHub Actions runs the same Python checks for pushes to `main` and `fastapi-rewrite` and for pull requests. Automated tests do not replace a live end-to-end check against the actual MongoDB instance and Yandex bucket.
