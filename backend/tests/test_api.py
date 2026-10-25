from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_meta_describes_scope_data_and_cache_headers():
    response = client.get("/api/meta")
    assert response.status_code == 200
    payload = response.json()
    assert payload["timezone"] == "Europe/London"
    assert payload["deliveryWindow"] == {"from": "2026-01-01", "toExclusive": "2026-02-01"}
    assert payload["dataQuality"]["actualRows"] == 1488
    assert payload["resolutions"] == {"actualMinutes": 30, "forecastMinutes": 60}
    assert response.headers["cache-control"].startswith("public, max-age=300")


def test_decision_returns_requested_day_and_never_uses_future_forecasts():
    response = client.get("/api/decision", params={"date": "2026-01-01"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["deliveryDate"] == "2026-01-01"
    assert payload["cutoffLocal"] == "09:00"
    assert payload["expectedHours"] == payload["matchedHours"] == 24
    cutoff = "2025-12-31T09:00:00Z"
    assert all(point["publishTime"] <= cutoff for point in payload["points"])
    assert payload["points"][0]["bandLow"] is not None
    assert payload["publishTimesUsed"] == [payload["points"][0]["publishTime"]]


def test_decision_cutoff_is_configurable_and_changes_forecast_selection():
    default = client.get("/api/decision", params={"date": "2026-01-01", "cutoff": "09:00"}).json()
    earlier = client.get("/api/decision", params={"date": "2026-01-01", "cutoff": "06:00"}).json()
    assert default["points"][0]["forecast"] != earlier["points"][0]["forecast"]


def test_decision_rejects_dates_outside_january_with_standard_error_shape():
    response = client.get("/api/decision", params={"date": "2025-12-31"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"
    assert response.json()["error"]["message"] == "Only delivery dates in January 2026 are supported."


def test_invalid_date_and_cutoff_have_consistent_validation_errors():
    bad_date = client.get("/api/decision", params={"date": "not-a-date"})
    bad_cutoff = client.get("/api/decision", params={"date": "2026-01-01", "cutoff": "25:61"})
    assert bad_date.status_code == bad_cutoff.status_code == 422
    assert bad_date.json()["error"]["code"] == "validation_error"
    assert bad_cutoff.json()["error"]["details"]


def test_accuracy_endpoints_return_expected_groups_and_metrics():
    summary = client.get("/api/accuracy/summary").json()
    horizon = client.get("/api/accuracy/by-horizon").json()
    hour = client.get("/api/accuracy/by-hour").json()
    wind = client.get("/api/accuracy/by-wind-level").json()
    distribution = client.get("/api/accuracy/distribution").json()
    assert summary["metrics"]["matched"] == 744
    assert summary["metrics"]["mae"] > 0
    assert [group["horizon"] for group in horizon["groups"]] == ["12–24h", "24–48h"]
    assert len(hour["groups"]) == 24
    assert [group["windLevel"] for group in wind["groups"]] == ["low", "mid", "high"]
    assert len(distribution["bins"]) == 20
    assert sum(bin["count"] for bin in distribution["bins"]) == 744


def test_cutoff_query_timezone_is_rejected():
    response = client.get("/api/accuracy/summary", params={"cutoff": "09:00Z"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_cutoff"


def test_cors_preflight_allows_local_frontend():
    response = client.options(
        "/api/meta",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_documents_api_paths_and_error_envelope():
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert "/api/decision" in spec["paths"]
    assert "/api/accuracy/by-wind-level" in spec["paths"]
    assert "422" in spec["paths"]["/api/decision"]["get"]["responses"]


def test_not_found_uses_standard_error_envelope():
    response = client.get("/api/not-a-route")
    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "Not Found"}
    }
