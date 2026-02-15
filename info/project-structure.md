# PokeTracker — структура проекта (что где и зачем)

Этот документ описывает **все текущие папки и файлы** в рабочем проекте.

## 1) Корень проекта

- `app.js`  
  Исторический/вспомогательный входной файл фронтенда (в текущей структуре основной запуск идёт через `index.html` + `src/main.js`).

- `index.html`  
  Основной HTML-контейнер приложения, подключает стили и модульный JS.

- `styles.css`  
  Глобальные стили интерфейса.

- `run.bat`  
  Скрипт запуска локального сервера с учётом настроек из `run.config.bat`.

- `settings.bat`  
  Интерактивное меню конфигурации запуска (`run.bat`): порт, host, логи, safe mode, профили и др.

- `run.config.bat`  
  Постоянный файл настроек запуска; читается `run.bat`, изменяется через `settings.bat`.

## 2) Служебные папки окружения

- `.git/`  
  Git-метаданные репозитория (история, refs, индекс и т.д.).

- `.venv/`  
  Локальное Python-окружение (интерпретатор, pip, установленные пакеты).  
  Нужна для изолированного запуска `server/server.py`.

## 3) Визуальные баннеры bat-скриптов

- `banners/run-banner.txt`  
  ASCII-баннер для `run.bat`.

- `banners/settings-banner.txt`  
  ASCII-баннер для `settings.bat`.

## 4) Данные приложения

Папка: `data/`

- `cards.json`  
  Основная база карточек (паки, карты, изображения, атрибуты).

- `collection.json`  
  Сохранённое состояние коллекции пользователя (владение/вишлист и др.).

- `settings.json`  
  Сохранённые UI-настройки приложения (язык, тема, режимы экрана и т.д.).

- `game-pokedex.json`  
  Сохранённые отметки по игровым покедексам (по играм/версиям).

## 5) Текстовые списки и справочники

Папка: `Lists/`

### 5.1 Общие списки паков
- `1025.txt` — базовый список покемонов/идентификаторов для покедекса.
- `Crimson Blaze.txt`
- `Deluxe Pack ex.txt`
- `EEVEE GROVE.txt`
- `Extradimensional Crisis.txt`
- `Fantastical Parade.txt`
- `Mythical Island.txt`
- `Secluded Springs.txt`
- `Shining Revelry.txt`
- `TRIUMPHANT LIGHT.txt`

Эти файлы используются как источники наборов/контента для соответствующих паков.

### 5.2 Подпапки паков

#### `Lists/Celestial Guardians/`
- `Celestial Guardians.txt`
- `Lunala.txt`
- `Solgaleo.txt`

#### `Lists/Genetic Apex/`
- `Genetic Apex.txt`
- `Charizard.txt`
- `Mewtwo.txt`
- `Pikachu.txt`

#### `Lists/Mega Rising/`
- `Mega Rising.txt`
- `Mega Altaria.txt`
- `Mega Blaziken.txt`
- `Mega Gyarados.txt`

#### `Lists/Space-Time Smackdown/`
- `Space-Time Smackdown.txt`
- `Dialga.txt`
- `Palkia.txt`

#### `Lists/Wisdom of Sea and Sky/`
- `Wisdom of Sea and Sky.txt`
- `Ho-Oh.txt`
- `Lugia.txt`

Во всех этих подпапках лежат специализированные списки карт/покемонов по сабпакам.

### 5.3 Игровые покедексы

Папка: `Lists/GamePokedexes/`

- `Legends Arceus/Pokedex.txt`  
  Список покедекса для Legends Arceus.

- `Legends Z-A/Pokedex.txt`  
  Список покедекса для Legends Z-A.

- `Sword & Shield/Pokedex.txt`  
  Список покедекса для Sword & Shield.

## 6) Профили настроек запуска

Папка: `profiles/run/`

- Здесь `settings.bat` сохраняет profile-файлы (`*.bat`) с наборами параметров запуска.
- Папка может быть пустой, пока профили не созданы вручную через меню.

## 7) Сервер

Папка: `server/`

- `server.py`  
  Локальный HTTP-сервер:
  - отдаёт статические файлы фронтенда,
  - обрабатывает API (`/api/load`, `/api/save`, `/api/bootstrap` и т.д.),
  - читает env-параметры от `run.bat` (порт, host, safe mode).

## 8) Исходники фронтенда

Папка: `src/`

- `main.js`  
  Точка входа фронтенда (инициализация, старт приложения).

- `router.js`  
  Маршрутизация страниц по hash/routes.

### 8.1 Конфиги (`src/config/`)

- `packs.js`  
  Конфигурация паков, константы, иконки/типы/редкости и связанные справочники.

- `pokedex.js`  
  Конфигурация покедекса и данные для покедекс-логики (включая raw-списки/описания).

### 8.2 Ядро (`src/core/`)

- `data.js`  
  Загрузка данных карт (`data/cards.json`) и базовая обработка ошибок.

- `i18n.js`  
  Локализация/переводы интерфейса.

- `state.js`  
  Центральное состояние приложения.

- `storage.js`  
  Работа с сохранением/загрузкой через server API (`collection`, `settings`, `game-pokedex`, bootstrap).

- `theme.js`  
  Управление темой интерфейса.

- `ui.js`  
  Общие UI-хелперы и взаимодействия интерфейса.

### 8.3 Фичи (`src/features/`)

- `cards.js`  
  Логика карточек (идентификаторы, рендер-помощники, операции по картам).

- `filters.js`  
  Фильтрация карточек/списков по параметрам.

- `packs-ui.js`  
  UI-компоненты и рендер блоков для экранов паков.

- `pokedex.js`  
  Функции покедекса: парсинг, кэш, матчинг, рендер карточек покедекса, игровые отметки.

### 8.4 Страницы (`src/pages/`)

- `home.js` — главная страница.
- `mobile.js` — мобильный раздел/представление.
- `collection.js` — страница коллекции.
- `wishlist.js` — страница вишлиста.
- `pack.js` — страница просмотра конкретного пака/сабпака.
- `pokedex.js` — основной покедекс.
- `game-pokedex.js` — покедексы по играм.
- `projects.js` — страница проектов.
- `settings.js` — настройки UI внутри веб-приложения.
- `placeholder.js` — заглушки для неполных маршрутов/состояний.

---

## Как это всё работает вместе (коротко)

1. Запуск: `run.bat` читает `run.config.bat`, выставляет env и поднимает `server/server.py`.  
2. Сервер: отдаёт `index.html`, `styles.css`, `src/**` и API-данные из `data/*.json`.  
3. Фронтенд: `src/main.js` + `router.js` открывают нужную страницу в `src/pages/*`, которая использует `core/*`, `features/*`, `config/*`.  
4. Контент: карточки и покедекс-списки берутся из `data/cards.json` и `Lists/**`.  
5. Сохранения: UI отправляет изменения на API, сервер сохраняет в `data/collection.json`, `data/settings.json`, `data/game-pokedex.json`.
