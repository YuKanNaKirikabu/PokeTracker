# PokeTracker — bat-настройки (cloud-only)

## 1) Главное

Проект работает в режиме **только облако**:
- чтение и запись JSON идут через `REMOTE_DATA_BASE_URL`;
- локальный `DATA_DIR` больше не используется;
- `run.bat` пробрасывает только cloud-переменные в `server.py`.

## 2) Актуальные переменные в run.config.bat

- `PORT` — порт сервера (`1..65535`, fallback `1025`)
- `HOST` — `localhost` или `0.0.0.0`
- `AUTO_OPEN_BROWSER` — `1` / `0`
- `START_MINIMIZED` — `1` / `0`
- `SAFE_MODE` — `1` / `0`
- `STARTUP_SUMMARY_MODE` — `full` / `compact` / `off`
- `CONSOLE_LOG_MODE` — `same` / `separate` / `off`
- `FILE_LOG_KEEP_COUNT` — `0` или `N`
- `REMOTE_DATA_BASE_URL` — базовый URL каталога данных (без завершающего `/`)
- `REMOTE_WRITE` — `1` (разрешён PUT) / `0` (read-only)
- `ACCESS_KEY_ID` — идентификатор статического ключа Object Storage
- `SECRET_ACCESS_KEY` — секретная часть статического ключа Object Storage

Текущее ожидаемое значение:
- `REMOTE_DATA_BASE_URL=https://storage.yandexcloud.net/poketracker/data`
- Для закрытого Object Storage используйте пару `ACCESS_KEY_ID` + `SECRET_ACCESS_KEY`; она подписывает S3-запросы.

## 3) Что делает settings.bat

- Управляет параметрами запуска и профилями (`profiles/run/*.bat`)
- Пишет выбранные значения в `run.config.bat`
- Не содержит и не сохраняет `DATA_DIR`

## 4) Что пробрасывает run.bat в server.py

- `POKETRACKER_PORT`
- `POKETRACKER_HOST`
- `POKETRACKER_SAFE_MODE`
- `POKETRACKER_DATA_BASE_URL`
- `POKETRACKER_REMOTE_WRITE`

## 5) SAFE_MODE

При `SAFE_MODE=1` блокируются:
- `POST /api/save`
- `POST /api/save-settings`
- `POST /api/save-game-pokedex`

GET-эндпоинты и статика продолжают работать.

## 6) Дефолты

`run.defaults.bat` используется для `Reset all settings to defaults` в `settings.bat`.

В cloud-only дефолтах установлены:
- `REMOTE_DATA_BASE_URL=https://storage.yandexcloud.net/poketracker/data`
- `REMOTE_WRITE=1`
