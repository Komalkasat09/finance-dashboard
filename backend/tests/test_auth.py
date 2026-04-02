from __future__ import annotations


def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.dev", "password": "Password123", "full_name": "New User"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "new@test.dev"


def test_register_duplicate_email(client):
    client.post("/api/v1/auth/register", json={"email": "dup@test.dev", "password": "Password123", "full_name": "One"})
    response = client.post("/api/v1/auth/register", json={"email": "dup@test.dev", "password": "Password123", "full_name": "Two"})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_login_success(client):
    client.post("/api/v1/auth/register", json={"email": "login@test.dev", "password": "Password123", "full_name": "Login"})
    response = client.post("/api/v1/auth/login", json={"email": "login@test.dev", "password": "Password123"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["refresh_token"]


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={"email": "wrong@test.dev", "password": "Password123", "full_name": "Wrong"})
    response = client.post("/api/v1/auth/login", json={"email": "wrong@test.dev", "password": "bad-password"})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


def test_protected_route_without_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_refresh_flow(client):
    client.post("/api/v1/auth/register", json={"email": "refresh@test.dev", "password": "Password123", "full_name": "Refresh"})
    login = client.post("/api/v1/auth/login", json={"email": "refresh@test.dev", "password": "Password123"})
    refresh_token = login.json()["refresh_token"]
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["refresh_token"]


def test_logout_revokes_token(client):
    client.post("/api/v1/auth/register", json={"email": "logout@test.dev", "password": "Password123", "full_name": "Logout"})
    login = client.post("/api/v1/auth/login", json={"email": "logout@test.dev", "password": "Password123"})
    tokens = login.json()
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 200
    refresh_again = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh_again.status_code == 401
