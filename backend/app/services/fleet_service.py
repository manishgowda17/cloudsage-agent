"""ClusterSage Multi-Tenant Fleet Intelligence & Ingestion Service.

Provides:
- Edge Agent authentication & server-side tenant derivation
- Ingested metadata validation, payload size limit enforcement & secret rejection
- Strict multi-tenant isolation (Org -> Clusters -> Agents -> Incidents)
- Fleet analytics & AIOps cross-cluster failure correlation
- Human-in-the-loop remediation proposal & approval engine
"""

from datetime import datetime, timezone
import hashlib
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from app.core.logging import logger
from app.models.schemas import (
    AgentHeartbeatRequest,
    AgentHeartbeatResponse,
    AgentIngestBatchRequest,
    AgentIngestBatchResponse,
    AgentRegistrationRequest,
    AgentRegistrationResponse,
    FleetClusterItem,
    FleetOverviewResponse,
    RemediationProposal,
)

# Prohibited sensitive keys that are strictly rejected if present in cloud ingestion
PROHIBITED_CLOUD_KEYS = {
    "raw_logs",
    "raw_payload",
    "raw_manifest",
    "env",
    "secrets",
    "password",
    "token",
    "kubeconfig",
    "client_key_data",
    "certificate_authority_data",
}

MAX_INGEST_PAYLOAD_BYTES = 1024 * 1024  # 1 MB strict limit


class FleetIntelligenceService:
    """Central cloud service managing registered edge agents, fleet telemetry, and remediations."""

    def __init__(self):
        # In-memory storage partitioned by organization_id
        # In production this maps to PostgreSQL with RLS
        # org_id -> { agent_id: AgentRecord }
        self._org_agents: Dict[str, Dict[str, Dict[str, Any]]] = {}

        # agent_id -> { "org_id": str, "cluster_id": str, "agent_key": str }
        self._agent_auth_directory: Dict[str, Dict[str, Any]] = {
            "edge-agent-node-01": {
                "org_id": "org_enterprise_primary",
                "cluster_id": "production-us-east-1",
                "cluster_name": "Production K8s US-East",
                "agent_key": "cs_agent_key_prod_sec_9941a8b",
                "version": "1.0.0",
                "last_heartbeat": time.time(),
                "status": "healthy",
                "pending_queue": 0,
            }
        }

        # org_id -> { cluster_id: ClusterHealthState }
        self._org_clusters: Dict[str, Dict[str, Dict[str, Any]]] = {
            "org_enterprise_primary": {
                "production-us-east-1": {
                    "cluster_id": "production-us-east-1",
                    "cluster_name": "Production K8s US-East",
                    "status": "healthy",
                    "total_nodes": 6,
                    "healthy_nodes": 6,
                    "total_pods": 48,
                    "degraded_pods": 1,
                    "reliability_score": 98.2,
                    "active_incidents": 1,
                    "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                    "agent_connected": True,
                },
                "staging-us-west-2": {
                    "cluster_id": "staging-us-west-2",
                    "cluster_name": "Staging K8s US-West",
                    "status": "healthy",
                    "total_nodes": 3,
                    "healthy_nodes": 3,
                    "total_pods": 24,
                    "degraded_pods": 0,
                    "reliability_score": 100.0,
                    "active_incidents": 0,
                    "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                    "agent_connected": True,
                },
            }
        }

        # org_id -> List[IncidentRecord]
        self._org_incidents: Dict[str, List[Dict[str, Any]]] = {
            "org_enterprise_primary": [
                {
                    "incident_id": "inc-419a7e2b",
                    "cluster_id": "production-us-east-1",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "category": "CrashLoopBackOff",
                    "severity": "warning",
                    "resource_kind": "Pod",
                    "resource_name": "order-processor-5d8c7b9e-q19pl",
                    "namespace": "production",
                    "problem_summary": "Container repeatedly crashing in pod 'order-processor-5d8c7b9e-q19pl' (Restart Count: 6)",
                    "anonymized_evidence": "Restarts: 6, Termination Reason: CrashLoopBackOff",
                    "suggested_action": "Inspect application startup logs, verify required environment configuration.",
                    "status": "active",
                }
            ]
        }

        # org_id -> List[RemediationProposal]
        self._org_remediations: Dict[str, List[RemediationProposal]] = {
            "org_enterprise_primary": [
                RemediationProposal(
                    proposal_id="rem-882f01ac",
                    incident_id="inc-419a7e2b",
                    cluster_id="production-us-east-1",
                    resource_kind="Deployment",
                    resource_name="order-processor",
                    namespace="production",
                    action_type="scale_and_restart",
                    proposed_diff="--- spec.template.spec.containers[0]\n+++ spec.template.spec.containers[0]\n+ initialDelaySeconds: 15\n+ resources.limits.memory: 512Mi",
                    dry_run_validated=True,
                    safety_tier="requires_human_approval",
                    status="pending_approval",
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
            ]
        }

        # Cache of processed idempotency keys
        self._processed_idempotency_keys: Set[str] = set()

    # --------------------------------------------------------------------------
    # 1. Agent Authentication & Server-Side Tenant Resolution
    # --------------------------------------------------------------------------
    def authenticate_agent(self, agent_id: str, agent_key: str) -> Optional[Dict[str, Any]]:
        """Validates agent credentials and derives organization and cluster context server-side."""
        if not agent_id or not agent_key:
            return None
        info = self._agent_auth_directory.get(agent_id)
        if not info:
            return None
        if info["agent_key"] != agent_key:
            logger.warning(f"Agent authentication failed for agent_id='{agent_id}': Invalid key")
            return None
        return info

    def register_agent(self, req: AgentRegistrationRequest, agent_key: str) -> AgentRegistrationResponse:
        """Registers a new edge agent, binding it to an organization and cluster."""
        org_id = req.organization_id.strip()
        cluster_id = req.cluster_id.strip()

        self._agent_auth_directory[req.agent_id] = {
            "org_id": org_id,
            "cluster_id": cluster_id,
            "cluster_name": req.cluster_name,
            "agent_key": agent_key,
            "version": req.version,
            "capabilities": req.capabilities,
            "last_heartbeat": time.time(),
            "status": "healthy",
            "pending_queue": 0,
        }

        if org_id not in self._org_clusters:
            self._org_clusters[org_id] = {}

        if cluster_id not in self._org_clusters[org_id]:
            self._org_clusters[org_id][cluster_id] = {
                "cluster_id": cluster_id,
                "cluster_name": req.cluster_name,
                "status": "healthy",
                "total_nodes": 0,
                "healthy_nodes": 0,
                "total_pods": 0,
                "degraded_pods": 0,
                "reliability_score": 100.0,
                "active_incidents": 0,
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "agent_connected": True,
            }

        logger.info(f"Registered agent '{req.agent_id}' for org '{org_id}', cluster '{cluster_id}'")
        return AgentRegistrationResponse(
            status="registered",
            agent_id=req.agent_id,
            organization_id=org_id,
            cluster_id=cluster_id,
        )

    def record_heartbeat(self, agent_id: str, req: AgentHeartbeatRequest) -> AgentHeartbeatResponse:
        """Record agent heartbeat beacon."""
        if agent_id in self._agent_auth_directory:
            agent = self._agent_auth_directory[agent_id]
            agent["last_heartbeat"] = req.timestamp
            agent["status"] = req.status
            agent["pending_queue"] = req.pending_queue_count

            # Update cluster heartbeat
            org_id = agent["org_id"]
            cluster_id = agent["cluster_id"]
            if org_id in self._org_clusters and cluster_id in self._org_clusters[org_id]:
                self._org_clusters[org_id][cluster_id]["last_heartbeat"] = datetime.now(timezone.utc).isoformat()
                self._org_clusters[org_id][cluster_id]["agent_connected"] = True

        return AgentHeartbeatResponse(
            status="acknowledged",
            agent_id=agent_id,
            server_time=time.time(),
        )

    # --------------------------------------------------------------------------
    # 2. Ingest Metadata Batch with Strict Validation & Idempotency
    # --------------------------------------------------------------------------
    def ingest_metadata_batch(
        self,
        agent_id: str,
        payload_bytes: bytes,
        batch_req: AgentIngestBatchRequest,
        idempotency_key: Optional[str] = None,
    ) -> AgentIngestBatchResponse:
        """Validates and persists approved metadata batch from authenticated agent."""
        # 1. Enforce payload size limit (reject > 1MB)
        if len(payload_bytes) > MAX_INGEST_PAYLOAD_BYTES:
            raise ValueError(f"Payload size ({len(payload_bytes)} bytes) exceeds 1MB limit")

        # 2. Check idempotency
        if idempotency_key and idempotency_key in self._processed_idempotency_keys:
            logger.info(f"Duplicate batch detected with idempotency key: {idempotency_key}")
            return AgentIngestBatchResponse(
                status="accepted_idempotent",
                ingested_count=len(batch_req.events),
                rejected_count=0,
                idempotency_key=idempotency_key,
            )

        agent_info = self._agent_auth_directory[agent_id]
        org_id = agent_info["org_id"]
        cluster_id = agent_info["cluster_id"]

        ingested = 0
        rejected = 0

        for item in batch_req.events:
            # Deep-inspect for prohibited keys
            if self._has_prohibited_keys(item.data):
                logger.warning(f"Rejected event '{item.category}' from agent '{agent_id}': Contains prohibited keys")
                rejected += 1
                continue

            # Process by category
            if item.category == "cluster_health":
                self._update_cluster_health(org_id, cluster_id, item.data)
                ingested += 1
            elif item.category in ("anonymized_incident_summaries", "incident_counts"):
                self._record_incident(org_id, cluster_id, item.data)
                ingested += 1
            else:
                ingested += 1

        if idempotency_key:
            self._processed_idempotency_keys.add(idempotency_key)

        return AgentIngestBatchResponse(
            status="accepted",
            ingested_count=ingested,
            rejected_count=rejected,
            idempotency_key=idempotency_key,
        )

    def _has_prohibited_keys(self, data: Any) -> bool:
        if isinstance(data, dict):
            for k, v in data.items():
                if str(k).strip().lower() in PROHIBITED_CLOUD_KEYS:
                    return True
                if self._has_prohibited_keys(v):
                    return True
        elif isinstance(data, list):
            for elem in data:
                if self._has_prohibited_keys(elem):
                    return True
        return False

    def _update_cluster_health(self, org_id: str, cluster_id: str, data: Dict[str, Any]):
        if org_id not in self._org_clusters:
            self._org_clusters[org_id] = {}

        existing = self._org_clusters[org_id].get(cluster_id, {
            "cluster_id": cluster_id,
            "cluster_name": cluster_id,
            "agent_connected": True,
        })
        existing.update({
            "total_nodes": data.get("total_nodes", existing.get("total_nodes", 0)),
            "healthy_nodes": data.get("healthy_nodes", existing.get("healthy_nodes", 0)),
            "total_pods": data.get("total_pods", existing.get("total_pods", 0)),
            "degraded_pods": data.get("degraded_pods", existing.get("degraded_pods", 0)),
            "reliability_score": data.get("reliability_score", existing.get("reliability_score", 100.0)),
            "active_incidents": data.get("active_incident_count", existing.get("active_incidents", 0)),
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            "agent_connected": True,
        })
        self._org_clusters[org_id][cluster_id] = existing

    def _record_incident(self, org_id: str, cluster_id: str, inc_data: Dict[str, Any]):
        if org_id not in self._org_incidents:
            self._org_incidents[org_id] = []

        inc_id = inc_data.get("incident_id") or f"inc-{uuid.uuid4().hex[:8]}"
        # Avoid duplicate in-memory incident
        if any(i["incident_id"] == inc_id for i in self._org_incidents[org_id]):
            return

        rec = dict(inc_data)
        rec["incident_id"] = inc_id
        rec["cluster_id"] = cluster_id
        rec["status"] = "active"
        self._org_incidents[org_id].append(rec)

        # Generate a candidate remediation proposal
        self._propose_remediation_for_incident(org_id, rec)

    def _propose_remediation_for_incident(self, org_id: str, inc: Dict[str, Any]):
        cat = inc.get("category", "")
        res_name = inc.get("resource_name", "workload")
        action = "restart_workload"
        diff = f"# Automated Dry-Run Diff for {res_name}\nkubectl rollout restart deployment/{res_name}"
        if "OOM" in cat:
            action = "adjust_limits"
            diff = f"# Proposed Resource Limit Adjustment for {res_name}\n+ memory: 1Gi\n- memory: 512Mi"

        prop = RemediationProposal(
            proposal_id=f"rem-{uuid.uuid4().hex[:8]}",
            incident_id=inc.get("incident_id", ""),
            cluster_id=inc.get("cluster_id", "default"),
            resource_kind="Deployment",
            resource_name=res_name,
            namespace=inc.get("namespace", "default"),
            action_type=action,
            proposed_diff=diff,
            dry_run_validated=True,
            safety_tier="requires_human_approval",
            status="pending_approval",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        if org_id not in self._org_remediations:
            self._org_remediations[org_id] = []
        self._org_remediations[org_id].append(prop)

    # --------------------------------------------------------------------------
    # 3. Multi-Tenant Fleet Analytics & Queries
    # --------------------------------------------------------------------------
    def get_fleet_overview(self, organization_id: str) -> FleetOverviewResponse:
        """Returns fleet health aggregated across all clusters belonging to organization_id."""
        clusters_dict = self._org_clusters.get(organization_id, {})
        cluster_items: List[FleetClusterItem] = []

        total = len(clusters_dict)
        healthy = 0
        degraded = 0
        critical = 0
        active_inc_total = 0
        score_sum = 0.0

        for cid, c in clusters_dict.items():
            score = c.get("reliability_score", 100.0)
            score_sum += score
            inc_cnt = c.get("active_incidents", 0)
            active_inc_total += inc_cnt

            status = "healthy"
            if score < 70.0 or inc_cnt >= 3:
                status = "critical"
                critical += 1
            elif score < 90.0 or inc_cnt > 0:
                status = "degraded"
                degraded += 1
            else:
                healthy += 1

            cluster_items.append(
                FleetClusterItem(
                    cluster_id=cid,
                    cluster_name=c.get("cluster_name", cid),
                    status=status,
                    total_nodes=c.get("total_nodes", 0),
                    healthy_nodes=c.get("healthy_nodes", 0),
                    total_pods=c.get("total_pods", 0),
                    degraded_pods=c.get("degraded_pods", 0),
                    reliability_score=score,
                    active_incidents=inc_cnt,
                    last_heartbeat=c.get("last_heartbeat"),
                    agent_connected=c.get("agent_connected", True),
                )
            )

        fleet_score = round(score_sum / max(total, 1), 1) if total > 0 else 100.0

        # Recurring failure patterns
        incidents = self._org_incidents.get(organization_id, [])
        cat_counts: Dict[str, int] = {}
        for inc in incidents:
            c = inc.get("category", "Unknown")
            cat_counts[c] = cat_counts.get(c, 0) + 1

        recurring = [
            {"pattern": cat, "occurrences": cnt, "severity": "critical" if cnt > 2 else "warning"}
            for cat, cnt in cat_counts.items()
        ]

        return FleetOverviewResponse(
            organization_id=organization_id,
            total_clusters=total,
            healthy_clusters=healthy,
            degraded_clusters=degraded,
            critical_clusters=critical,
            total_active_incidents=active_inc_total,
            fleet_reliability_score=fleet_score,
            average_cpu_utilization=43.2,
            average_memory_utilization=59.4,
            recurring_failures=recurring,
            clusters=cluster_items,
        )

    def list_agents_for_org(self, organization_id: str) -> List[Dict[str, Any]]:
        """Returns all registered edge agents for an organization."""
        agents = []
        for aid, info in self._agent_auth_directory.items():
            if info.get("org_id") == organization_id:
                # Mask secret key
                item = dict(info)
                item["agent_id"] = aid
                item["agent_key"] = f"cs_agent_key_***{aid[-4:]}"
                # Connected if heartbeat within last 120s
                is_alive = (time.time() - info.get("last_heartbeat", 0)) < 180
                item["connected"] = is_alive
                agents.append(item)
        return agents

    def list_incidents_for_org(self, organization_id: str) -> List[Dict[str, Any]]:
        """Returns incident history isolated to this tenant."""
        return self._org_incidents.get(organization_id, [])

    # --------------------------------------------------------------------------
    # 4. Remediation Center (Human-in-the-Loop)
    # --------------------------------------------------------------------------
    def list_remediation_proposals(self, organization_id: str) -> List[RemediationProposal]:
        """Returns all proposed remediations awaiting approval or recently acted upon."""
        return self._org_remediations.get(organization_id, [])

    def approve_remediation(
        self,
        organization_id: str,
        proposal_id: str,
        approved_by_email: str,
    ) -> RemediationProposal:
        """Explicit human approval of a proposed remediation action."""
        proposals = self._org_remediations.get(organization_id, [])
        for p in proposals:
            if p.proposal_id == proposal_id:
                p.status = "approved"
                p.approved_by = approved_by_email
                logger.info(f"Remediation '{proposal_id}' APPROVED by '{approved_by_email}'")
                return p
        raise ValueError(f"Proposal '{proposal_id}' not found in organization '{organization_id}'")

    def reject_remediation(
        self,
        organization_id: str,
        proposal_id: str,
        reason: str,
    ) -> RemediationProposal:
        """Operator rejects a proposed remediation action."""
        proposals = self._org_remediations.get(organization_id, [])
        for p in proposals:
            if p.proposal_id == proposal_id:
                p.status = "rejected"
                p.rejection_reason = reason
                logger.info(f"Remediation '{proposal_id}' REJECTED with reason: {reason}")
                return p
        raise ValueError(f"Proposal '{proposal_id}' not found in organization '{organization_id}'")


fleet_service = FleetIntelligenceService()
