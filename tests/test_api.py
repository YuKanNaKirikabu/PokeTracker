import pytest
from fastapi.testclient import TestClient

from fastapi_app import main as api


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(api, "_cards_cache", None)
    monkeypatch.setattr(api, "_cards_cache_expires", 0)
    return TestClient(api.app)


def test_health_reports_fastapi(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["framework"] == "FastAPI"
    assert response.json()["ok"] is True


def test_cards_pagination_keeps_pack_metadata(client, monkeypatch):
    payload = {
        "packs": [{"id": "A1", "display": "Example"}],
        "cards": [{"id": str(i)} for i in range(5)],
    }
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


def test_bootstrap_returns_settings_and_game_pokedex(client, monkeypatch):
    def fake_read(name, fallback):
        if name == "settings.json":
            return {"version": "1.0", "ui": {"language": "ru"}}
        if name == "game-pokedex.json":
            return {"version": "1.0", "pokedexes": {"sword-shield": {}}}
        return fallback

    monkeypatch.setattr(api, "remote_read", fake_read)
    body = client.get("/api/bootstrap").json()
    assert body["settings"]["ui"]["language"] == "ru"
    assert "sword-shield" in body["gamePokedex"]["pokedexes"]


def test_save_settings_calls_storage_writer(client, monkeypatch):
    writes = []
    monkeypatch.setattr(api, "SAFE_MODE", False)
    monkeypatch.setattr(api, "REMOTE_WRITE", True)
    monkeypatch.setattr(api, "remote_write", lambda name, payload: writes.append((name, payload)))
    payload = {"version": "1.0", "ui": {"theme": "dark"}}
    response = client.post("/api/save-settings", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True}
    assert writes == [("settings.json", payload)]


def test_safe_mode_blocks_remote_writes(client, monkeypatch):
    monkeypatch.setattr(api, "SAFE_MODE", True)
    response = client.post("/api/save-game-pokedex", json={"pokedexes": {}})
    assert response.status_code == 403


def test_collection_requires_login(client):
    response = client.get("/api/collection")
    assert response.status_code == 401


def test_auth_me_is_anonymous_without_cookie(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "username": None}


def test_password_hash_verifies_without_storing_plaintext():
    encoded = api.hash_password("example-password")
    assert encoded != "example-password"
    assert api.verify_password("example-password", encoded)
    assert not api.verify_password("wrong-password", encoded)
