"""Tests for Runbook Intelligence, Post-Mortem Learning, Memory Browser, and Insights."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user

# Mock authenticated user fixture
MOCK_USER = {"id": "usr_sre_lead_7712", "email": "sre-lead@infrastructure.ai"}


@pytest.fixture
def auth_client():
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_list_runbooks(auth_client):
    """Verify runbooks can be listed and contain required SRE operational fields."""
    res = auth_client.get("/api/v1/runbooks")
    assert res.status_code == 200
    runbooks = res.json()
    assert len(runbooks) >= 5
    ids = [rb["id"] for rb in runbooks]
    assert "RB-K8S-001" in ids  # Probe triage
    assert "RB-K8S-002" in ids  # CrashLoop triage
    assert "RB-K8S-004" in ids  # OOMKilled triage

    # Verify structural integrity of a runbook
    rb1 = next(rb for rb in runbooks if rb["id"] == "RB-K8S-001")
    assert "prerequisites" in rb1 and len(rb1["prerequisites"]) > 0
    assert "steps" in rb1 and len(rb1["steps"]) > 0
    assert "validation_instructions" in rb1
    assert "rollback_guidance" in rb1
    assert rb1["historical_success_rate"] > 90.0


def test_get_runbook_detail(auth_client):
    """Verify single runbook retrieval by ID."""
    res = auth_client.get("/api/v1/runbooks/RB-K8S-001")
    assert res.status_code == 200
    rb = res.json()
    assert rb["title"] == "Readiness & Liveness Probe Misconfiguration Triage"
    assert rb["category"] == "Probes & Lifecycle"
    assert len(rb["steps"]) >= 4


def test_postmortem_workflow(auth_client):
    """Verify post-mortem creation, lesson extraction, and listing."""
    # 1. List existing post-mortems
    res = auth_client.get("/api/v1/postmortems")
    assert res.status_code == 200
    initial_list = res.json()
    assert len(initial_list) >= 1

    # 2. Submit new post-mortem
    pm_payload = {
        "incident_id": "inc-test-checkout-99",
        "incident_title": "Checkout API Readiness Probe 404 Outage",
        "resource_kind": "Deployment",
        "resource_name": "checkout-api",
        "namespace": "staging",
        "summary": "Checkout pods failed readiness checks following path migration to /ready.",
        "root_cause": "Readiness probe path specified /healthz instead of /ready endpoint.",
        "resolution_steps_taken": "Updated deployment manifest readinessProbe path from /healthz to /ready.",
        "steps_that_worked": "Manifest patch to /ready port 8080 immediately transitioned pods to 1/1 READY.",
        "steps_that_failed": "Pod delete did not fix the problem as ReplicaSet relaunched with same bad spec.",
        "runbook_used": "RB-K8S-001",
        "time_to_detect_minutes": 2,
        "time_to_resolve_minutes": 6,
        "preventive_actions": "Enforce OpenAPI path validation in pull request review pipeline.",
        "key_lessons": "Always verify application health endpoints in unit test contracts before deploying Kubernetes manifests.",
        "was_successful": True,
    }
    create_res = auth_client.post("/api/v1/postmortems", json=pm_payload)
    assert create_res.status_code == 200
    created_pm = create_res.json()
    assert created_pm["incident_id"] == "inc-test-checkout-99"
    assert created_pm["was_successful"] is True
    assert "pm-" in created_pm["id"]

    # 3. Retrieve created post-mortem
    get_res = auth_client.get(f"/api/v1/postmortems/{created_pm['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["key_lessons"] == pm_payload["key_lessons"]


def test_hindsight_memories_browser_endpoint(auth_client):
    """Verify memory bank search endpoint returns memory items."""
    res = auth_client.get("/api/v1/hindsight/memories")
    assert res.status_code == 200
    data = res.json()
    assert "bank_id" in data
    assert "user_usr_sre_lead_7712" in data["bank_id"] or "usr_sre_lead_7712" in data["bank_id"]
    assert "memories" in data
    assert isinstance(data["memories"], list)


def test_hindsight_insights_endpoint(auth_client):
    """Verify reliability insights endpoint returns recurring failure patterns and Reflect synthesis."""
    res = auth_client.get("/api/v1/hindsight/insights")
    assert res.status_code == 200
    data = res.json()
    assert "recurring_patterns" in data
    assert len(data["recurring_patterns"]) > 0
    first_pattern = data["recurring_patterns"][0]
    assert "pattern_name" in first_pattern
    assert "effective_remediation" in first_pattern
    assert "historical_success_rate" in first_pattern
    assert "top_misconfigurations" in data
