"""Comprehensive Test Runner for AI Kubernetes Agent Backend.

Executes all unit and integration test assertions without requiring external pytest binary.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user

MOCK_USER = {"id": "usr_sre_lead_7712", "email": "sre-lead@infrastructure.ai"}

def run_tests():
    print("======================================================================")
    print("STARTING TEST SUITE: Runbooks, Post-Mortems, Memory & Insights")
    print("======================================================================")

    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    client = TestClient(app)
    passed = 0
    failed = 0

    def test(name, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f" [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f" [FAIL] {name}: {e}")
            failed += 1

    def test_health():
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

    def test_list_runbooks():
        res = client.get("/api/v1/runbooks")
        assert res.status_code == 200
        runbooks = res.json()
        assert len(runbooks) >= 5, f"Expected >= 5 runbooks, got {len(runbooks)}"
        ids = [rb["id"] for rb in runbooks]
        assert "RB-K8S-001" in ids
        assert "RB-K8S-002" in ids
        assert "RB-K8S-004" in ids

        rb1 = next(rb for rb in runbooks if rb["id"] == "RB-K8S-001")
        assert len(rb1["prerequisites"]) > 0
        assert len(rb1["steps"]) > 0
        assert rb1["validation_instructions"]
        assert rb1["rollback_guidance"]
        assert rb1["historical_success_rate"] > 90.0

    def test_get_runbook_detail():
        res = client.get("/api/v1/runbooks/RB-K8S-001")
        assert res.status_code == 200
        rb = res.json()
        assert rb["title"] == "Readiness & Liveness Probe Misconfiguration Triage"
        assert rb["category"] == "Probes & Lifecycle"
        assert len(rb["steps"]) >= 4

    def test_postmortem_workflow():
        # List
        res = client.get("/api/v1/postmortems")
        assert res.status_code == 200
        initial_list = res.json()
        assert len(initial_list) >= 1

        # Create
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
        create_res = client.post("/api/v1/postmortems", json=pm_payload)
        assert create_res.status_code == 200
        created_pm = create_res.json()
        assert created_pm["incident_id"] == "inc-test-checkout-99"
        assert created_pm["was_successful"] is True
        assert "pm-" in created_pm["id"]

        # Detail
        get_res = client.get(f"/api/v1/postmortems/{created_pm['id']}")
        assert get_res.status_code == 200
        assert get_res.json()["key_lessons"] == pm_payload["key_lessons"]

    def test_hindsight_memories_browser():
        res = client.get("/api/v1/hindsight/memories")
        assert res.status_code == 200
        data = res.json()
        assert "bank_id" in data
        assert "user_usr_sre_lead_7712" in data["bank_id"] or "usr_sre_lead_7712" in data["bank_id"]
        assert "memories" in data
        assert isinstance(data["memories"], list)

    def test_hindsight_insights():
        res = client.get("/api/v1/hindsight/insights")
        assert res.status_code == 200
        data = res.json()
        assert "recurring_patterns" in data
        assert len(data["recurring_patterns"]) > 0
        first_pattern = data["recurring_patterns"][0]
        assert "pattern_name" in first_pattern
        assert "effective_remediation" in first_pattern
        assert "historical_success_rate" in first_pattern
        assert "top_misconfigurations" in data

    test("GET /health", test_health)
    test("GET /api/v1/runbooks", test_list_runbooks)
    test("GET /api/v1/runbooks/{id}", test_get_runbook_detail)
    test("POST & GET /api/v1/postmortems", test_postmortem_workflow)
    test("GET /api/v1/hindsight/memories", test_hindsight_memories_browser)
    test("GET /api/v1/hindsight/insights", test_hindsight_insights)

    app.dependency_overrides.clear()
    print("======================================================================")
    print(f"TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("======================================================================")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
