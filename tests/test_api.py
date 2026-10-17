import time
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from fastapi_app import main as api


class FakePreferences:
    def __init__(self):
        self.docs = {}

    def find_one(self, query):
        return self.docs.get(str(query["user_id"]))

    def update_one(self, query, update, upsert=False):
        key = str(query["user_id"])
        doc = self.docs.setdefault(key, {"user_id": query["user_id"]})
        doc.update(update.get("$set", {}))


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(api, "_cards_cache", None)
    monkeypatch.setattr(api, "_cards_cache_expires", 0)
    api._sessions.clear()
    return TestClient(api.app)


def authenticate(client, monkeypatch):
    user_id = api.ObjectId("507f1f77bcf86cd799439011")
    api._sessions["test-session"] = {
        "user_id": str(user_id),
        "username": "tester",
        "expires": time.time() + 3600,
    }
    client.cookies.set(api.SESSION_COOKIE, "test-session")
    db = SimpleNamespace(user_preferences=FakePreferences())
    monkeypatch.setattr(api, "mongo", lambda: db)
    return db


def test_health_reports_fastapi(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["framework"] == "FastAPI"
    assert response.json()["ok"] is True


def test_cards_pagination_keeps_pack_metadata(client, monkeypatch):
    payload = {"packs": [{"id": "A1", "display": "Example"}], "cards": [{"id": str(i)} for i in range(5)]}
    monkeypatch.setattr(api, "remote_read", lambda name, fallback: payload)
    response = client.get("/api/cards?limit=2&offset=2")
    assert response.status_code == 200
    body = response.json()
    assert body["packs"] == payload["packs"]
    assert body["cards"] == [{"id": "2"}, {"id": "3"}]
    assert body["total"] == 5
    assert body["hasMore"] is True


def test_cards_default_limit_does_not_drop_records(client, monkeypatch):
    payload = {"packs": [], "cards": [{"id": str(i)} for i in range(600)]}
    monkeypatch.setattr(api, "remote_read", lambda name, fallback: payload)
    body = client.get("/api/cards").json()
    assert len(body["cards"]) == 600
    assert body["hasMore"] is False


def test_game_dex_accepts_array_catalog_format(client, monkeypatch):
    catalog = [{"id": "sword-shield", "title": "Sword & Shield"}]
    monkeypatch.setattr(api, "remote_read", lambda name, fallback: catalog)
    response = client.get("/api/game-dex")
    assert response.status_code == 200
    assert response.json() == catalog


def test_anonymous_bootstrap_does_not_read_shared_cloud_settings(client, monkeypatch):
    def unexpected_cloud_read(*args, **kwargs):
        raise AssertionError("Account settings must not be read from shared cloud JSON")
    monkeypatch.setattr(api, "remote_read", unexpected_cloud_read)
    response = client.get("/api/bootstrap")
    assert response.status_code == 200
    assert response.json()["settings"]["ui"]["language"] == "ru"
    assert response.json()["gamePokedex"]["pokedexes"] == {}


def test_settings_and_game_dex_are_saved_per_authenticated_user(client, monkeypatch):
    db = authenticate(client, monkeypatch)
    settings = {"version": "1.0", "ui": {"language": "ru", "theme": "dark"}}
    game_dex = {"version": "1.0", "pokedexes": {"sword-shield": {"versions": {}}}}

    response = client.post("/api/save-settings", json=settings)
    assert response.status_code == 200 and response.json()["success"] is True
    response = client.post("/api/save-game-pokedex", json=game_dex)
    assert response.status_code == 200 and response.json()["success"] is True

    assert client.get("/api/load-settings").json() == settings
    assert client.get("/api/load-game-pokedex").json() == game_dex
    saved = next(iter(db.user_preferences.docs.values()))
    assert saved["settings"] == settings
    assert saved["game_pokedex"] == game_dex


def test_user_data_writes_require_login(client):
    settings = client.post("/api/save-settings", json={"ui": {}})
    game_dex = client.post("/api/save-game-pokedex", json={"pokedexes": {}})
    assert settings.status_code == 401
    assert game_dex.status_code == 401


def test_collection_requires_login(client):
    assert client.get("/api/collection").status_code == 401
    assert client.post("/api/collection", json={"owned": [], "wishlist": []}).status_code == 401


def test_auth_me_is_anonymous_without_cookie(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "username": None}


def test_password_hash_verifies_without_storing_plaintext():
    encoded = api.hash_password("example-password")
    assert encoded != "example-password"
    assert api.verify_password("example-password", encoded)
    assert not api.verify_password("wrong-password", encoded)
