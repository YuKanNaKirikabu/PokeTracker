# PokeTracker — настройки запуска через bat

## 1) Пункты главного меню settings.bat

1. **Console log mode**
   Управляет только консольным отображением логов.
- `same` — логи идут в текущее окно `run.bat`.
- `separate` — логи идут в отдельное окно консоли.
- `off` — консольный вывод логов отключён.

2. **File logs keep count**
   Управляет только файловыми логами (`data/logs`).
- `0` — файловые логи отключены, папка `data/logs` удаляется при старте.
- `N` (целое число больше 0) — хранить последние `N` файлов логов.

3. **Toggle AUTO_OPEN_BROWSER**
   Автооткрытие браузера после старта.
- `1` — открывать `Local URL` автоматически.
- `0` — не открывать автоматически.

4. **Toggle START_MINIMIZED**
   Режим сворачивания окна запуска.
- `1` — окно запуска пытается свернуться при старте.
- `0` — окно остаётся в обычном виде.

5. **Set PORT manually**
   Ручной ввод порта сервера.
- Допустимый диапазон: `1..65535`.
- Если введено невалидное значение — используется безопасный fallback `1025`.

6. **Toggle SAFE_MODE**
   Режим защиты от записи.
- `1` — `POST`-сохранения запрещены (сервер отвечает `403`).
- `0` — обычный рабочий режим с сохранениями.

7. **Profiles**
   Настройки профилей.
- `Save current settings as profile` — сохранить текущие параметры в `profiles/run/<name>.bat`.
- `Load profile into current settings` — загрузить профиль в текущую сессию меню.
- `Show profile list` — показать список профилей.
- `Delete profile` — удалить профиль из `profiles/run`.
- `Back` — вернуться в главное меню.

Важно: после `Load profile into current settings` профиль действует в текущей сессии меню, пока ты не изменишь отдельные параметры или не загрузишь другой профиль.  
Чтобы это стало постоянной конфигурацией для запусков, нужно выбрать `9 Save and exit`.

8. **Host and startup summary settings**
   Подменю сети и шапки запуска.
- `Host mode`:
  - `localhost` — доступ только с этого ПК.
  - `0.0.0.0` — доступ с других устройств в локальной сети.
- `Startup summary`:
  - `full` — подробный блок запуска.
  - `compact` — краткий блок запуска.
  - `off` — блок запуска скрыт.
- `Reset all settings to defaults` — сброс всех параметров к дефолтам.
- `Back` — вернуться в главное меню.

9. **Save and exit**
   Записать текущие параметры в `run.config.bat` и выйти.

0. **Exit without saving**
   Выйти из меню без записи в `run.config.bat`.

---

## 2) Параметры в run.config.bat

- `PORT` — порт сервера (`1..65535`, fallback `1025`).
- `HOST` — режим bind: `localhost` или `0.0.0.0`.
- `AUTO_OPEN_BROWSER` — автооткрытие браузера (`1`/`0`).
- `START_MINIMIZED` — попытка свернуть окно (`1`/`0`).
- `SAFE_MODE` — read-only режим (`1`/`0`).
- `STARTUP_SUMMARY_MODE` — `full` / `compact` / `off`.
- `CONSOLE_LOG_MODE` — `same` / `separate` / `off`.
- `FILE_LOG_KEEP_COUNT` — `0` или `N` последних файлов логов.

Дополнительно:
- `run.defaults.bat` — редактируемые дефолтные значения для `settings.bat`.
   - Они применяются при `Reset all settings to defaults`.
   - Это место, где можно выставить свои собственные значения по умолчанию.

---

## 3) Как run.bat применяет настройки

1. Загружает `run.config.bat`.
2. Валидирует значения и подставляет safe-default при ошибке.
3. Печатает ASCII-баннер и summary (по `STARTUP_SUMMARY_MODE`).
4. При `HOST=0.0.0.0` пытается автоопределить LAN IP и показать LAN URL.
5. Настраивает файловые логи по `FILE_LOG_KEEP_COUNT`.
6. Запускает сервер и применяет `CONSOLE_LOG_MODE`.
7. Пробрасывает env в Python:
- `POKETRACKER_PORT`
- `POKETRACKER_HOST`
- `POKETRACKER_SAFE_MODE`

---

## 4) SAFE_MODE в server.py

При `SAFE_MODE=1` блокируются:
- `POST /api/save`
- `POST /api/save-settings`
- `POST /api/save-game-pokedex`

Что остаётся доступным:
- Все `GET`-эндпоинты.
- Чтение статики и данных.

---

## 5) Независимость консольных и файловых логов

Сделано раздельно:
- `CONSOLE_LOG_MODE` влияет только на вывод в консоль.
- `FILE_LOG_KEEP_COUNT` влияет только на запись/хранение файлов.

Рабочие комбинации:
- Консоль есть, файлов нет.
- Консоли нет, файлы есть.
- Оба включены.
- Оба отключены.

---

## 6) Быстрые пресеты

- **Тихий режим**
- `CONSOLE_LOG_MODE=off`
- `FILE_LOG_KEEP_COUNT=0`

- **Отладка в одном окне**
- `CONSOLE_LOG_MODE=same`
- `FILE_LOG_KEEP_COUNT=5`

- **LAN-демо**
- `HOST=0.0.0.0`
- `PORT=1025`
- `AUTO_OPEN_BROWSER=1`
- `STARTUP_SUMMARY_MODE=full`

- **Безопасный просмотр (read-only)**
- `SAFE_MODE=1`
