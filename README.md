# PokeTracker

PokeTracker is a static frontend served by the included Python server. The application reads TCG Pocket pack metadata and card records from the single `cards.json` source.

## Single source of truth

The server reads `https://storage.yandexcloud.net/poketracker/data/cards.json` using the existing `run.config.bat` setting. Replace that object with the prepared `cards.json` file when updating the live dataset. The frontend does not contain a second pack catalogue or pack-specific branches.

- `packs[]` order determines the pack display order.
- `series` determines the series grouping.
- `kind: "pack"` describes one booster pack and includes its own `artwork`, `logo`, `folder`, and `count`.
- `kind: "collection"` describes a container for multiple boosters. It has no parent booster artwork/logo/folder. Its `subpacks[]` entries each have their own `id`, `display`, `artwork`, `logo`, and derived `count`.
- A card in a collection uses the collection ID in `pack`; `subpacks[]` lists the booster(s) that contain that card. Shared cards belong to every matching subpack, but remain a single card record with the collection's global numbering.
- `All` is a UI-only view and must not be stored as a pack or subpack.
- Card `image`, `rarity`, and Pokémon `type` values are used as the supplied URLs. Non-Pokémon category values such as `TRAINER`, `ARENA`, `ENERGY`, `ITEM`, and `TOOL` remain text.

## Run locally

1. Keep `run.config.bat` configured for the Yandex Storage data URL.
2. Run `run.bat`.
3. Open the local URL printed by the launcher.

The server needs Python 3. Pack metadata and subpack navigation are generated from `cards.json`; adding a pack or collection should not require editing JavaScript configuration.

## MongoDB and accounts

Install the Python dependency with `pip install -r requirements.txt`. The default local
connection is `mongodb://127.0.0.1:27017`, which is suitable for a MongoDB instance
managed through Compass. Configure `MONGODB_URI` and `MONGODB_DATABASE` as environment
variables before deployment; never commit a MongoDB password.

Users are stored in `users`, while each user's collection is stored in MongoDB
`user_collections` with stable card IDs in `owned` and `wishlist` arrays. An empty
`user_collections` document is created during registration, and changes are saved
automatically through `POST /api/collection` after a card or wishlist change. The
save button remains available for a manual save. The old shared `collection.json`
and cloud data storage are not used for collection or wishlist data.
