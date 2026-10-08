import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BUCKET = "poketracker"
ENDPOINT = "https://storage.yandexcloud.net"
CARDS_KEY = "data/cards.json"

RARITY_FILES = {
    "CROWN": "CROWN.webp",
    "DIAMOND1": "DIAMOND1.webp",
    "DIAMOND2": "DIAMOND2.webp",
    "DIAMOND3": "DIAMOND3.webp",
    "DIAMOND4": "DIAMOND4.webp",
    "SHINY1": "SHINY1.webp",
    "SHINY2": "SHINY2.webp",
    "STAR1": "STAR1.webp",
    "STAR2": "STAR2.webp",
    "STAR3": "STAR3.webp",
}

TYPE_FILES = {
    "COLORLESS": "Colorless.webp",
    "DARKNESS": "Darkness.webp",
    "DRAGON": "Dragon.webp",
    "FIGHTING": "Fighting.webp",
    "FIRE": "Fire.webp",
    "GRASS": "Grass.webp",
    "LIGHTNING": "Lightning.webp",
    "METAL": "Metal.webp",
    "PSYCHIC": "Psychic.webp",
    "WATER": "Water.webp",
}

TEXT_TYPES = {
    "TRAINER",
    "ARENA",
    "ENERGY",
    "ITEM",
    "SUPPORTER",
    "TOOL",
    "STADIUM",
}

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".avif",
    ".webp",
}


def run_aws(args):
    result = subprocess.run(
        ["aws", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.strip()
            or result.stdout.strip()
            or "AWS CLI error"
        )

    return result.stdout


def s3_uri(key):
    return f"s3://{BUCKET}/{key}"


def public_url(key):
    from urllib.parse import quote

    encoded = "/".join(
        quote(part, safe="")
        for part in key.split("/")
    )

    return f"{ENDPOINT}/{BUCKET}/{encoded}"


def download_cards_json(path):
    run_aws([
        "s3",
        "cp",
        s3_uri(CARDS_KEY),
        str(path),
        "--endpoint-url",
        ENDPOINT,
    ])


def upload_cards_json(path):
    run_aws([
        "s3",
        "cp",
        str(path),
        s3_uri(CARDS_KEY),
        "--endpoint-url",
        ENDPOINT,
    ])


def backup_cards_json(path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = path.with_name(
        f"cards_backup_{timestamp}.json"
    )
    backup.write_bytes(path.read_bytes())
    return backup


def rarity_url(value):
    if not isinstance(value, str):
        return value

    value = value.strip()
    upper = value.upper()

    if upper in RARITY_FILES:
        return public_url(
            f"Images/Rarity/{RARITY_FILES[upper]}"
        )

    if upper.startswith(
        f"{ENDPOINT}/{BUCKET}/Images/Rarity/".upper()
    ):
        filename = Path(
            value.split("/")[-1]
        ).stem.upper()

        if filename in RARITY_FILES:
            return public_url(
                f"Images/Rarity/{RARITY_FILES[filename]}"
            )

    filename = Path(
        value.split("/")[-1]
    ).stem.upper()

    if filename in RARITY_FILES:
        return public_url(
            f"Images/Rarity/{RARITY_FILES[filename]}"
        )

    raise ValueError(
        f"Неизвестный rarity: {value}"
    )


def type_url(value):
    if not isinstance(value, str):
        return value

    value = value.strip()
    upper = value.upper()

    if upper in TEXT_TYPES:
        return upper

    if upper in TYPE_FILES:
        return public_url(
            f"Images/Types/{TYPE_FILES[upper]}"
        )

    filename = Path(
        value.split("/")[-1]
    ).stem.upper()

    if filename in TYPE_FILES:
        return public_url(
            f"Images/Types/{TYPE_FILES[filename]}"
        )

    raise ValueError(
        f"Неизвестный type: {value}"
    )


def migrate_image_url(value):
    if not isinstance(value, str):
        return value

    if not re.match(r"^https?://", value, re.IGNORECASE):
        return value

    parsed = urlsplit(value)

    if parsed.netloc.lower() != "storage.yandexcloud.net":
        return value

    expected_prefix = f"/{BUCKET}/"
    if not parsed.path.startswith(expected_prefix):
        return value

    path = parsed.path

    suffix = Path(path).suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        return value

    path = path[: -len(suffix)] + ".webp"

    return urlunsplit((
        parsed.scheme,
        parsed.netloc,
        path,
        parsed.query,
        parsed.fragment,
    ))


def migrate_value(value):
    if isinstance(value, dict):
        result = {}

        for key, item in value.items():
            if key == "rarity":
                result[key] = rarity_url(item)
            elif key == "type":
                result[key] = type_url(item)
            else:
                result[key] = migrate_value(item)

        return result

    if isinstance(value, list):
        return [
            migrate_value(item)
            for item in value
        ]

    if isinstance(value, str):
        return migrate_image_url(value)

    return value


def count_image_urls(value):
    if isinstance(value, dict):
        return sum(
            count_image_urls(item)
            for item in value.values()
        )

    if isinstance(value, list):
        return sum(
            count_image_urls(item)
            for item in value
        )

    if isinstance(value, str):
        suffix = Path(
            urlsplit(value).path
        ).suffix.lower()

        if suffix in IMAGE_EXTENSIONS:
            return 1

    return 0


def main():
    print("==========================================")
    print(" PokeTracker — миграция cards.json")
    print("==========================================")
    print()

    local_file = Path(
        "cards_migration_work.json"
    )

    print("Скачивание текущего cards.json...")
    download_cards_json(local_file)

    print("Создание резервной копии...")
    backup = backup_cards_json(local_file)
    print(f"Backup: {backup}")
    print()

    data = json.loads(
        local_file.read_text(
            encoding="utf-8"
        )
    )

    before_images = count_image_urls(data)

    print("Миграция данных...")
    migrated = migrate_value(data)

    after_images = count_image_urls(migrated)

    local_file.write_text(
        json.dumps(
            migrated,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        f"Обнаружено ссылок на изображения: "
        f"{before_images}"
    )
    print(
        f"Ссылок после миграции: "
        f"{after_images}"
    )
    print()

    print("Загрузка изменённого cards.json...")
    upload_cards_json(local_file)

    print()
    print("Удаление временного файла...")
    try:
        local_file.unlink()
    except OSError:
        pass

    print()
    print("==========================================")
    print(" Миграция завершена")
    print("==========================================")
    print()
    print(f"Резервная копия сохранена: {backup}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print()
        print("ОШИБКА:")
        print(exc)
        sys.exit(1)