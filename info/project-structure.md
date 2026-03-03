# PokeTracker — структура проекта

## 1) Корень проекта

- `index.html` — основной HTML-контейнер.
- `styles.css` — глобальные стили.
- `run.bat` — запуск сервера с параметрами из `run.config.bat`.
- `settings.bat` — интерактивная настройка запуска.
- `run.config.bat` — текущая конфигурация запуска.
- `run.defaults.bat` — дефолты для сброса настроек.

## 2) Данные (cloud-only)

Runtime-данные хранятся в облаке по `REMOTE_DATA_BASE_URL`:
- `cards.json`
- `collection.json`
- `settings.json`
- `game-pokedex.json`

Текущее ожидаемое облако:
- `https://storage.yandexcloud.net/poketracker/data`

Локальный `DATA_DIR` больше не используется.

## 3) Папки проекта

- `src/` — фронтенд (роутер, страницы, фичи, состояние, storage).
- `server/` — Python HTTP/API сервер.
- `Lists/` — исходные текстовые списки паков и игровых покедексов.
- `banners/` — ASCII-баннеры для bat-скриптов.
- `profiles/run/` — профили `settings.bat`.
- `info/` — документация проекта.

## 4) Поток данных

1. `run.bat` читает `run.config.bat` и запускает `server/server.py`.
2. Сервер отдаёт статику (`index.html`, `src/**`, `styles.css`) и API.
3. Фронтенд грузит карточки через `GET /api/cards` и bootstrap через `GET /api/bootstrap`.
4. Изменения отправляются на `POST /api/save`, `POST /api/save-settings`, `POST /api/save-game-pokedex`.
5. Сервер читает/пишет JSON только в облачный каталог `REMOTE_DATA_BASE_URL`.

## 5) Что пушится в git

- Пушится: код, батники, документация.
- Не пушится: runtime JSON с пользовательским прогрессом и настройками.
