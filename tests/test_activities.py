from fastapi.testclient import TestClient
from src.app import app, activities
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    # snapshot participants
    orig = {name: list(details["participants"]) for name, details in activities.items()}
    yield
    # restore
    for name, details in activities.items():
        details["participants"] = list(orig[name])


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Soccer Team" in data


def test_signup_new():
    email = "test_student@example.com"
    resp = client.post("/activities/Soccer Team/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities["Soccer Team"]["participants"]
    assert "Signed up" in resp.json()["message"]


def test_signup_existing():
    existing = activities["Soccer Team"]["participants"][0]
    resp = client.post("/activities/Soccer Team/signup", params={"email": existing})
    assert resp.status_code == 400


def test_signup_activity_not_found():
    resp = client.post("/activities/NoSuchActivity/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404


def test_unregister_existing():
    email = activities["Swimming Club"]["participants"][0]
    resp = client.delete("/activities/Swimming Club/unregister", params={"email": email})
    assert resp.status_code == 200
    assert email not in activities["Swimming Club"]["participants"]


def test_unregister_not_signed():
    resp = client.delete("/activities/Swimming Club/unregister", params={"email": "not@here.com"})
    assert resp.status_code == 400


def test_unregister_activity_not_found():
    resp = client.delete("/activities/NoSuchActivity/unregister", params={"email": "a@b.com"})
    assert resp.status_code == 404
