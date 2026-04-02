from __future__ import annotations


def _create_transaction(client, token, category_id):
    return client.post(
        "/api/v1/transactions/",
        json={"amount": "1000.00", "type": "EXPENSE", "category_id": category_id, "date": "2026-04-02", "notes": "Test"},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_viewer_cannot_create_transaction(client, viewer_token, category):
    response = _create_transaction(client, viewer_token, str(category.id))
    assert response.status_code == 403


def test_analyst_can_create_transaction(client, analyst_token, category):
    response = _create_transaction(client, analyst_token, str(category.id))
    assert response.status_code == 201


def test_admin_can_delete_transaction(client, analyst_token, admin_token, category):
    created = _create_transaction(client, analyst_token, str(category.id))
    transaction_id = created.json()["id"]
    response = client.delete(
        f"/api/v1/transactions/{transaction_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


def test_viewer_cannot_access_user_management(client, viewer_token):
    response = client.get("/api/v1/users/", headers={"Authorization": f"Bearer {viewer_token}"})
    assert response.status_code == 403


def test_admin_can_access_user_management(client, admin_token):
    response = client.get("/api/v1/users/", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200


def test_analyst_can_export_csv(client, analyst_token, category):
    _create_transaction(client, analyst_token, str(category.id))
    response = client.get("/api/v1/transactions/export", headers={"Authorization": f"Bearer {analyst_token}"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")


def test_viewer_cannot_export_csv(client, viewer_token):
    response = client.get("/api/v1/transactions/export", headers={"Authorization": f"Bearer {viewer_token}"})
    assert response.status_code == 403
