from __future__ import annotations


def _create_transaction(client, token, amount, tx_type, category_id, date_value):
    return client.post(
        "/api/v1/transactions/",
        json={"amount": str(amount), "type": tx_type, "category_id": category_id, "date": date_value, "notes": "Analytics"},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_dashboard_returns_required_keys(client, admin_token, category):
    _create_transaction(client, admin_token, 1000, "INCOME", str(category.id), "2026-04-01")
    response = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    payload = response.json()
    assert {"summary", "category_breakdown", "monthly_trend", "recent_transactions"}.issubset(payload.keys())


def test_monthly_trend_has_six_items(client, admin_token):
    response = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()["monthly_trend"]) == 6


def test_net_balance_correct(client, admin_token, category):
    _create_transaction(client, admin_token, 1000, "INCOME", str(category.id), "2026-04-01")
    _create_transaction(client, admin_token, 2000, "INCOME", str(category.id), "2026-04-02")
    _create_transaction(client, admin_token, 3000, "INCOME", str(category.id), "2026-04-03")
    _create_transaction(client, admin_token, 400, "EXPENSE", str(category.id), "2026-04-04")
    _create_transaction(client, admin_token, 600, "EXPENSE", str(category.id), "2026-04-05")
    response = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    summary = response.json()["summary"]
    assert summary["net_balance"] == "5000.00" or summary["net_balance"] == 5000


def test_category_breakdown_roughly_100(client, admin_token, category):
    _create_transaction(client, admin_token, 1000, "EXPENSE", str(category.id), "2026-04-01")
    _create_transaction(client, admin_token, 1000, "EXPENSE", str(category.id), "2026-04-02")
    response = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    total = sum(item["percentage"] for item in response.json()["category_breakdown"])
    assert 99.0 <= total <= 101.0