"""Edge Agent Comprehensive Unit & Integration Tests."""

import os
import sys
import tempfile
import pytest

# Add edge-agent to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from collector.k8s_collector import KubernetesCollector
from normalizer.normalizer import TelemetryNormalizer
from normalizer.schemas import ErrorCategory, NodeHealthRecord, PodHealthRecord
from privacy.gateway import PrivacyGateway, PrivacyViolationError
from policy.export_policy import CustomerExportPolicy, PolicyRule, get_default_customer_policy
from analyzer.local_analyzer import LocalDefectAnalyzer

import importlib.util
from pathlib import Path
_q_path = Path(__file__).resolve().parent.parent / "queue" / "offline_queue.py"
_spec = importlib.util.spec_from_file_location("edge_agent_offline_queue", _q_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
PersistentOfflineQueue = _mod.PersistentOfflineQueue


# -----------------------------------------------------------------------------
# TEST 1: Kubernetes Collector Collects Pod & Node Health
# -----------------------------------------------------------------------------
def test_collector_pods_and_nodes():
    collector = KubernetesCollector()
    nodes = collector.collect_nodes()
    assert len(nodes) > 0, "Collector should return node health records"
    assert isinstance(nodes[0], NodeHealthRecord)
    assert hasattr(nodes[0], "is_ready")

    pods = collector.collect_pods()
    assert len(pods) > 0, "Collector should return pod health records"
    assert isinstance(pods[0], PodHealthRecord)
    assert hasattr(pods[0], "restart_count")


# -----------------------------------------------------------------------------
# TEST 2: Sensitive AWS Credentials are Detected and Redacted
# -----------------------------------------------------------------------------
def test_privacy_redacts_aws_credentials():
    gateway = PrivacyGateway()

    raw_text = "Deploy failed with AWS key AKIAIOSFODNN7EXAMPLE and secret aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    redacted, count = gateway.redact_text(raw_text)

    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" not in redacted
    assert "[REDACTED_AWS_KEY_ID]" in redacted
    assert "[REDACTED_AWS_SECRET]" in redacted
    assert count >= 2


# -----------------------------------------------------------------------------
# TEST 3: Passwords, JWT Tokens, and Bearer Tokens are Redacted
# -----------------------------------------------------------------------------
def test_privacy_redacts_passwords_and_tokens():
    gateway = PrivacyGateway()

    sample = "Connecting with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDN and password=SuperSecretP@ssw0rd!"
    redacted, count = gateway.redact_text(sample)

    assert "SuperSecretP@ssw0rd!" not in redacted
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted
    assert "[REDACTED_TOKEN]" in redacted
    assert "[REDACTED_PASSWORD]" in redacted
    assert count >= 2


# -----------------------------------------------------------------------------
# TEST 4: Prohibited Fields are Deep-Inspected and Rejected
# -----------------------------------------------------------------------------
def test_prohibited_fields_rejected():
    gateway = PrivacyGateway(fail_closed=True)

    # Payload with forbidden raw logs and secrets
    leaky_payload = {
        "cluster_id": "test-cluster-1",
        "raw_logs": "Exception in thread main: java.lang.NullPointerException with password=123",
        "status": "degraded",
    }

    approved, sanitized, error = gateway.filter_and_approve_export(
        category="cluster_health",
        payload=leaky_payload,
    )

    assert approved is False
    assert sanitized is None
    assert "Prohibited field detected" in error
    assert gateway.blocked_export_counter >= 1


# -----------------------------------------------------------------------------
# TEST 5: Unapproved Categories are Dropped (Export Allowlist Enforcement)
# -----------------------------------------------------------------------------
def test_unapproved_category_dropped():
    gateway = PrivacyGateway()

    approved, sanitized, error = gateway.filter_and_approve_export(
        category="internal_customer_secret_audit",
        payload={"sensitive_key": "value"},
    )

    assert approved is False
    assert sanitized is None
    assert "not in export allowlist" in error


# -----------------------------------------------------------------------------
# TEST 6: Approved Metadata Successfully Approved and Sanitized
# -----------------------------------------------------------------------------
def test_approved_metadata_passes():
    gateway = PrivacyGateway()

    valid_payload = {
        "cluster_id": "prod-cluster-01",
        "total_nodes": 5,
        "healthy_nodes": 5,
        "reliability_score": 98.5,
    }

    approved, sanitized, error = gateway.filter_and_approve_export(
        category="cluster_health",
        payload=valid_payload,
    )

    assert approved is True
    assert sanitized is not None
    assert error is None
    assert sanitized["cluster_id"] == "prod-cluster-01"


# -----------------------------------------------------------------------------
# TEST 7: Local Defect Analyzer Diagnoses CrashLoopBackOff & OOMKilled Offline
# -----------------------------------------------------------------------------
def test_local_defect_analyzer():
    analyzer = LocalDefectAnalyzer()

    # 1. CrashLoopBackOff Pod
    crash_pod = PodHealthRecord(
        namespace="default",
        pod_name="api-server-xyz",
        phase="Running",
        restart_count=8,
        ready_containers=0,
        total_containers=1,
        error_reason="CrashLoopBackOff",
    )
    inc_crash = analyzer.analyze_pod_issue(crash_pod)
    assert inc_crash is not None
    assert inc_crash.category == ErrorCategory.CRASH_LOOP
    assert inc_crash.severity == "critical"
    assert "restarting" in inc_crash.problem_summary.lower() or "crashing" in inc_crash.problem_summary.lower()

    # 2. OOMKilled Pod
    oom_pod = PodHealthRecord(
        namespace="default",
        pod_name="worker-mem-xyz",
        phase="Failed",
        restart_count=2,
        ready_containers=0,
        total_containers=1,
        error_reason="OOMKilled",
    )
    inc_oom = analyzer.analyze_pod_issue(oom_pod)
    assert inc_oom is not None
    assert inc_oom.category == ErrorCategory.OOM_KILLED
    assert "memory" in inc_oom.suggested_action.lower()


# -----------------------------------------------------------------------------
# TEST 8: Persistent Offline Queue Guarantees Local Durability
# -----------------------------------------------------------------------------
def test_persistent_offline_queue():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = f.name

    try:
        queue = PersistentOfflineQueue(db_path=temp_db)
        assert queue.pending_count() == 0

        # Enqueue 3 approved items
        id1 = queue.enqueue("cluster_health", {"score": 95.0})
        id2 = queue.enqueue("anonymized_incident_summaries", {"inc_id": "inc-01"})
        id3 = queue.enqueue("node_health", {"node": "node-1"})
        assert queue.pending_count() == 3

        # Simulate agent restart by creating new queue instance on same DB file
        queue_restarted = PersistentOfflineQueue(db_path=temp_db)
        assert queue_restarted.pending_count() == 3

        # Peek batch
        batch = queue_restarted.peek_batch(limit=2)
        assert len(batch) == 2
        assert batch[0]["category"] == "cluster_health"
        assert batch[1]["category"] == "anonymized_incident_summaries"

        # Ack batch
        acked = queue_restarted.ack([b["queue_id"] for b in batch])
        assert acked == 2
        assert queue_restarted.pending_count() == 1

    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)


# -----------------------------------------------------------------------------
# TEST 9: Normalizer Deduplicates Flapping Events
# -----------------------------------------------------------------------------
def test_normalizer_deduplication():
    normalizer = TelemetryNormalizer(deduplication_window_seconds=10)

    # First event: should NOT be duplicate
    is_dup1 = normalizer.is_duplicate("Pod", "auth-service", "default", "CrashLoopBackOff")
    assert is_dup1 is False

    # Immediate second event: SHOULD be duplicate
    is_dup2 = normalizer.is_duplicate("Pod", "auth-service", "default", "CrashLoopBackOff")
    assert is_dup2 is True

    # Different pod: should NOT be duplicate
    is_dup3 = normalizer.is_duplicate("Pod", "payment-service", "default", "CrashLoopBackOff")
    assert is_dup3 is False
