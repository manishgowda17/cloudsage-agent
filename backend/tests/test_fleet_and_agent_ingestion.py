"""Tests for Edge Agent Cloud Ingestion, Multi-Tenant Fleet Analytics, and Remediation Center."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user
from app.services.fleet_service import fleet_service


@pytest.fixture
def mock_user_org_a():
    return {
        "id": "usr_tenant_alpha_01",
        "email": "lead.sre@tenant-alpha.com",
        "org_id": "org_enterprise_primary",
    }


@pytest.fixture
def mock_user_org_b():
    return {
        "id": "usr_tenant_bravo_99",
        "email": "devops@tenant-bravo.com",
        "org_id": "org_tenant_bravo_isolated",
    }


@pytest.fixture
def client_org_a(mock_user_org_a):
    app.dependency_overrides[get_current_user] = lambda: mock_user_org_a
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def client_org_b(mock_user_org_b):
    app.dependency_overrides[get_current_user] = lambda: mock_user_org_b
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client():
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        yield client


# -----------------------------------------------------------------------------
# TEST 1: Agent Registration with Key Succeeds
# -----------------------------------------------------------------------------
def test_agent_registration(unauthenticated_client):
    reg_payload = {
        "agent_id": "edge-agent-qa-cluster-01",
        "organization_id": "org_enterprise_primary",
        "cluster_id": "qa-cluster-us-central",
        "cluster_name": "QA Kubernetes Cluster",
        "version": "1.0.0",
        "capabilities": ["k8s_events", "pod_metrics"],
    }
    headers = {"X-Agent-Key": "sec_agent_key_qa_test_99"}
    res = unauthenticated_client.post("/api/v1/agent/register", json=reg_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "registered"
    assert data["agent_id"] == "edge-agent-qa-cluster-01"


def test_agent_registration_missing_key(unauthenticated_client):
    reg_payload = {
        "agent_id": "rogue-agent",
        "organization_id": "org_enterprise_primary",
        "cluster_id": "rogue-cluster",
        "cluster_name": "Rogue Cluster",
    }
    res = unauthenticated_client.post("/api/v1/agent/register", json=reg_payload)
    assert res.status_code == 401


# -----------------------------------------------------------------------------
# TEST 2: Agent Heartbeat Verification
# -----------------------------------------------------------------------------
def test_agent_heartbeat(unauthenticated_client):
    headers = {
        "X-Agent-ID": "edge-agent-node-01",
        "X-Agent-Key": "cs_agent_key_prod_sec_9941a8b",
    }
    hb_payload = {
        "agent_id": "edge-agent-node-01",
        "timestamp": 1700000000.0,
        "status": "healthy",
        "pending_queue_count": 0,
    }
    res = unauthenticated_client.post("/api/v1/agent/heartbeat", json=hb_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "acknowledged"


def test_agent_heartbeat_unauthorized(unauthenticated_client):
    headers = {
        "X-Agent-ID": "edge-agent-node-01",
        "X-Agent-Key": "invalid_wrong_key",
    }
    hb_payload = {
        "agent_id": "edge-agent-node-01",
        "timestamp": 1700000000.0,
        "status": "healthy",
    }
    res = unauthenticated_client.post("/api/v1/agent/heartbeat", json=hb_payload, headers=headers)
    assert res.status_code == 401


# -----------------------------------------------------------------------------
# TEST 3: Metadata Batch Ingestion
# -----------------------------------------------------------------------------
def test_metadata_batch_ingest_approved(unauthenticated_client):
    headers = {
        "X-Agent-ID": "edge-agent-node-01",
        "X-Agent-Key": "cs_agent_key_prod_sec_9941a8b",
        "X-Idempotency-Key": "batch-qa-uuid-001",
    }
    ingest_payload = {
        "agent_id": "edge-agent-node-01",
        "batch_size": 1,
        "events": [
            {
                "category": "cluster_health",
                "data": {
                    "cluster_id": "production-us-east-1",
                    "total_nodes": 6,
                    "healthy_nodes": 6,
                    "reliability_score": 99.1,
                },
                "created_at": 1700000000.0,
            }
        ],
    }
    res = unauthenticated_client.post("/api/v1/agent/ingest", json=ingest_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "accepted"
    assert data["ingested_count"] == 1


# -----------------------------------------------------------------------------
# TEST 4: Prohibited Field Rejection in Cloud Ingestion
# -----------------------------------------------------------------------------
def test_metadata_ingest_rejects_prohibited_fields(unauthenticated_client):
    headers = {
        "X-Agent-ID": "edge-agent-node-01",
        "X-Agent-Key": "cs_agent_key_prod_sec_9941a8b",
        "X-Idempotency-Key": "batch-qa-uuid-leak",
    }
    leaky_batch = {
        "agent_id": "edge-agent-node-01",
        "batch_size": 1,
        "events": [
            {
                "category": "incident_counts",
                "data": {
                    "raw_logs": "FATAL: connect failed with secret password=TopSecret123!",
                    "cluster_id": "production-us-east-1",
                },
                "created_at": 1700000000.0,
            }
        ],
    }
    res = unauthenticated_client.post("/api/v1/agent/ingest", json=leaky_batch, headers=headers)
    assert res.status_code == 200
    data = res.json()
    # The event with raw_logs must be rejected
    assert data["rejected_count"] == 1
    assert data["ingested_count"] == 0


# -----------------------------------------------------------------------------
# TEST 5: Strict Multi-Tenant Isolation
# -----------------------------------------------------------------------------
def test_tenant_data_isolation(unauthenticated_client, mock_user_org_a, mock_user_org_b):
    # Org A requests overview
    app.dependency_overrides[get_current_user] = lambda: mock_user_org_a
    res_a = unauthenticated_client.get("/api/v1/fleet/overview")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["organization_id"] == "org_enterprise_primary"
    assert data_a["total_clusters"] >= 1
    cluster_ids_a = [c["cluster_id"] for c in data_a["clusters"]]
    assert "production-us-east-1" in cluster_ids_a

    # Org B requests overview
    app.dependency_overrides[get_current_user] = lambda: mock_user_org_b
    res_b = unauthenticated_client.get("/api/v1/fleet/overview")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["organization_id"] == "org_tenant_bravo_isolated"
    # Org B must NOT see Org A's clusters
    cluster_ids_b = [c["cluster_id"] for c in data_b["clusters"]]
    assert "production-us-east-1" not in cluster_ids_b

    app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# TEST 6: Remediation Center Human Approval Workflow
# -----------------------------------------------------------------------------
def test_remediation_approval_workflow(client_org_a):
    # 1. List proposals
    res = client_org_a.get("/api/v1/remediation/proposals")
    assert res.status_code == 200
    proposals = res.json()
    assert len(proposals) > 0
    prop_id = proposals[0]["proposal_id"]
    assert proposals[0]["status"] == "pending_approval"

    # 2. Approve proposal
    appr_res = client_org_a.post(f"/api/v1/remediation/{prop_id}/approve")
    assert appr_res.status_code == 200
    approved_prop = appr_res.json()
    assert approved_prop["status"] == "approved"
    assert approved_prop["approved_by"] == "lead.sre@tenant-alpha.com"
