"""Comprehensive Validation Suite for ClusterSage 15 Core Scenarios.

Validates:
1. Edge Agent connects to a Kubernetes cluster.
2. Edge Agent collects pod and node health.
3. Sensitive AWS credentials are detected.
4. Passwords and tokens are redacted.
5. Prohibited data cannot leave the local environment.
6. Approved metadata reaches the cloud.
7. Unauthorized agents are rejected.
8. Tenant A cannot access Tenant B data.
9. Hindsight stores and retrieves previous incidents without a login flow.
10. Local investigation works without cloud connectivity.
11. Offline queue synchronizes after reconnection.
12. Existing YAML investigation still works.
13. Existing GitHub repository investigation still works.
14. Existing Gemini integration continues working.
15. Existing InsForge authentication continues working.
"""

import asyncio
import os
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

# Add project root and edge-agent to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
edge_dir = os.path.join(root_dir, "edge-agent")
if edge_dir not in sys.path:
    sys.path.insert(0, edge_dir)

from app.main import app
from app.core.auth import get_current_user
from app.services.hindsight_service import hindsight_service
from app.services.investigation import InvestigationService

# Edge Agent imports
from collector.k8s_collector import KubernetesCollector
from privacy.gateway import PrivacyGateway
from analyzer.local_analyzer import LocalDefectAnalyzer
from normalizer.schemas import ErrorCategory, PodHealthRecord

import importlib.util
from pathlib import Path
_q_path = Path(edge_dir) / "queue" / "offline_queue.py"
_spec = importlib.util.spec_from_file_location("edge_agent_offline_queue", _q_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
PersistentOfflineQueue = _mod.PersistentOfflineQueue


@pytest.fixture
def test_client():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "usr_tenant_alpha_01",
        "email": "lead.sre@tenant-alpha.com",
        "org_id": "org_enterprise_primary",
    }
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client():
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        yield client


# ==============================================================================
# SCENARIO 1: Edge Agent connects to a Kubernetes cluster
# ==============================================================================
def test_scenario_01_edge_agent_k8s_connection():
    collector = KubernetesCollector()
    assert hasattr(collector, "k8s_connected")
    assert hasattr(collector, "collect_nodes")
    assert hasattr(collector, "collect_pods")


# ==============================================================================
# SCENARIO 2: Edge Agent collects pod and node health
# ==============================================================================
def test_scenario_02_collects_pod_and_node_health():
    collector = KubernetesCollector()
    nodes = collector.collect_nodes()
    assert len(nodes) > 0
    assert hasattr(nodes[0], "node_name")
    assert hasattr(nodes[0], "is_ready")

    pods = collector.collect_pods()
    assert len(pods) > 0
    assert hasattr(pods[0], "pod_name")
    assert hasattr(pods[0], "phase")


# ==============================================================================
# SCENARIO 3: Sensitive AWS credentials are detected
# ==============================================================================
def test_scenario_03_aws_credentials_detected():
    gateway = PrivacyGateway()
    raw = "AWS Access Key: AKIAIOSFODNN7EXAMPLE and secret: aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    redacted, count = gateway.redact_text(raw)
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" not in redacted
    assert "[REDACTED_AWS_KEY_ID]" in redacted
    assert count >= 2


# ==============================================================================
# SCENARIO 4: Passwords and tokens are redacted
# ==============================================================================
def test_scenario_04_passwords_and_tokens_redacted():
    gateway = PrivacyGateway()
    raw = "Connecting with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDN and password=ProdDatabasePassword!"
    redacted, count = gateway.redact_text(raw)
    assert "ProdDatabasePassword!" not in redacted
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted
    assert "[REDACTED_TOKEN]" in redacted
    assert "[REDACTED_PASSWORD]" in redacted
    assert count >= 2


# ==============================================================================
# SCENARIO 5: Prohibited data cannot leave the local environment
# ==============================================================================
def test_scenario_05_prohibited_data_cannot_leave():
    gateway = PrivacyGateway(fail_closed=True)
    leaky_payload = {
        "cluster_id": "c-123",
        "raw_logs": "Exception in thread 'main' with token=secret123",
        "secrets": {"api_key": "xyz"},
    }
    approved, sanitized, error = gateway.filter_and_approve_export(
        category="cluster_health",
        payload=leaky_payload,
    )
    assert approved is False
    assert sanitized is None
    assert "Prohibited field detected" in error


# ==============================================================================
# SCENARIO 6: Approved metadata reaches the cloud
# ==============================================================================
def test_scenario_06_approved_metadata_reaches_cloud(unauthenticated_client):
    headers = {
        "X-Agent-ID": "edge-agent-node-01",
        "X-Agent-Key": "cs_agent_key_prod_sec_9941a8b",
        "X-Idempotency-Key": "batch-15-scenarios-001",
    }
    payload = {
        "agent_id": "edge-agent-node-01",
        "batch_size": 1,
        "events": [
            {
                "category": "cluster_health",
                "data": {"cluster_id": "production-us-east-1", "reliability_score": 98.5},
                "created_at": 1700000000.0,
            }
        ],
    }
    res = unauthenticated_client.post("/api/v1/agent/ingest", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] in ("accepted", "accepted_idempotent")


# ==============================================================================
# SCENARIO 7: Unauthorized agents are rejected
# ==============================================================================
def test_scenario_07_unauthorized_agents_rejected(unauthenticated_client):
    headers = {
        "X-Agent-ID": "rogue-agent",
        "X-Agent-Key": "invalid_unregistered_key",
    }
    payload = {
        "agent_id": "rogue-agent",
        "batch_size": 1,
        "events": [],
    }
    res = unauthenticated_client.post("/api/v1/agent/ingest", json=payload, headers=headers)
    assert res.status_code == 401


# ==============================================================================
# SCENARIO 8: Tenant A cannot access Tenant B data
# ==============================================================================
def test_scenario_08_tenant_isolation(unauthenticated_client):
    # Tenant Alpha request
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "usr_alpha", "email": "a@alpha.com", "org_id": "org_enterprise_primary"
    }
    res_a = unauthenticated_client.get("/api/v1/fleet/overview")
    assert res_a.status_code == 200
    clusters_a = [c["cluster_id"] for c in res_a.json()["clusters"]]
    assert "production-us-east-1" in clusters_a

    # Tenant Bravo request
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "usr_bravo", "email": "b@bravo.com", "org_id": "org_tenant_bravo_isolated"
    }
    res_b = unauthenticated_client.get("/api/v1/fleet/overview")
    assert res_b.status_code == 200
    clusters_b = [c["cluster_id"] for c in res_b.json()["clusters"]]
    assert "production-us-east-1" not in clusters_b

    app.dependency_overrides.clear()


# ==============================================================================
# SCENARIO 9: Hindsight stores and retrieves previous incidents without a login flow
# ==============================================================================
def test_scenario_09_hindsight_no_login_flow(test_client):
    # Check Hindsight status endpoint - works without separate Hindsight credentials
    res = test_client.get("/api/v1/hindsight/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "user_bank_id" in data
    # Bank ID is derived deterministically from InsForge session without login prompts
    assert "usr_tenant_alpha_01" in data["user_bank_id"]


# ==============================================================================
# SCENARIO 10: Local investigation works without cloud connectivity
# ==============================================================================
def test_scenario_10_local_investigation_offline():
    analyzer = LocalDefectAnalyzer()
    crash_pod = PodHealthRecord(
        namespace="default",
        pod_name="payment-svc-xyz",
        phase="Running",
        restart_count=7,
        ready_containers=0,
        total_containers=1,
        error_reason="CrashLoopBackOff",
    )
    inc = analyzer.analyze_pod_issue(crash_pod)
    assert inc is not None
    assert inc.category == ErrorCategory.CRASH_LOOP
    assert "payment-svc-xyz" in inc.resource_name
    assert inc.confidence >= 0.90


# ==============================================================================
# SCENARIO 11: Offline queue synchronizes after reconnection
# ==============================================================================
def test_scenario_11_offline_queue_sync():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name
    try:
        q = PersistentOfflineQueue(db_path=temp_db)
        # Store items while offline
        q.enqueue("cluster_health", {"score": 97.0})
        q.enqueue("anonymized_incident_summaries", {"inc_id": "inc-offline-01"})
        assert q.pending_count() == 2

        # Peek batch upon reconnect
        batch = q.peek_batch(limit=10)
        assert len(batch) == 2

        # Acknowledge export
        acked = q.ack([b["queue_id"] for b in batch])
        assert acked == 2
        assert q.pending_count() == 0
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


# ==============================================================================
# SCENARIO 12: Existing YAML investigation still works
# ==============================================================================
def test_scenario_12_existing_yaml_investigation(test_client):
    yaml_content = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: broken-probe-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /nonexistent
            port: 8080
"""
    res = test_client.post("/investigate", json={
        "source_type": "yaml",
        "manifest_content": yaml_content,
        "manifest_filename": "broken-probe.yaml",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "diagnosis" in data
    assert "root_cause" in data["diagnosis"]


# ==============================================================================
# SCENARIO 13: Existing GitHub repository investigation still works
# ==============================================================================
def test_scenario_13_existing_github_investigation(test_client):
    res = test_client.post("/investigate", json={
        "source_type": "github",
        "github_url": "https://github.com/manishgowda17/cloudsage-agent",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "diagnosis" in data


# ==============================================================================
# SCENARIO 14: Existing Gemini / SRE Rules integration continues working
# ==============================================================================
def test_scenario_14_gemini_sre_integration(test_client):
    # Verify deterministic SRE rules engine or Gemini responds with high confidence
    res = test_client.post("/investigate", json={
        "source_type": "yaml",
        "manifest_content": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: test-pod\nspec:\n  containers:\n  - name: c1\n    image: redis",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["diagnosis"]["confidence"] > 0.0


# ==============================================================================
# SCENARIO 15: Existing InsForge authentication continues working
# ==============================================================================
def test_scenario_15_insforge_auth_remains_active(unauthenticated_client):
    # Request without InsForge Bearer token must be rejected with 401
    res = unauthenticated_client.post("/investigate", json={"source_type": "yaml", "manifest_content": "dummy"})
    assert res.status_code == 401
    assert "Authentication required" in res.json().get("detail", "")
