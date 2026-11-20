"""ClusterSage Edge Agent Main Daemon and Local REST Service."""

import asyncio
import os
import sys
import time
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Ensure edge-agent parent directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from config.settings import agent_settings
from collector.k8s_collector import KubernetesCollector
from collector.prometheus_collector import PrometheusCollector
from normalizer.normalizer import TelemetryNormalizer
from normalizer.schemas import ClusterHealthSummary, NormalizedIncident
from privacy.gateway import PrivacyGateway
from policy.export_policy import get_default_customer_policy
from analyzer.local_analyzer import LocalDefectAnalyzer
from memory.local_memory import LocalMemoryManager
from exporter.cloud_exporter import CloudExporter

import importlib.util
from pathlib import Path
_q_path = Path(__file__).resolve().parent / "queue" / "offline_queue.py"
_spec = importlib.util.spec_from_file_location("edge_agent_offline_queue", _q_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
PersistentOfflineQueue = _mod.PersistentOfflineQueue


# Initialize Components
privacy_gateway = PrivacyGateway(
    fail_closed=agent_settings.FAIL_CLOSED_ON_PRIVACY_ERROR,
    allowlist=set(agent_settings.ALLOWLISTED_METADATA_CATEGORIES),
)
k8s_collector = KubernetesCollector()
prom_collector = PrometheusCollector()
normalizer = TelemetryNormalizer()
local_analyzer = LocalDefectAnalyzer(privacy_gateway=privacy_gateway)
local_memory = LocalMemoryManager(
    base_url=agent_settings.HINDSIGHT_LOCAL_URL,
    organization_id=agent_settings.ORGANIZATION_ID,
    cluster_id=agent_settings.CLUSTER_ID,
    privacy_gateway=privacy_gateway,
)
offline_queue = PersistentOfflineQueue(db_path=agent_settings.OFFLINE_DB_PATH)
cloud_exporter = CloudExporter(
    cloud_url=agent_settings.CLOUD_INGEST_URL,
    agent_id=agent_settings.AGENT_ID,
    agent_key=agent_settings.AGENT_API_KEY,
    queue=offline_queue,
)
customer_policy = get_default_customer_policy(
    org_id=agent_settings.ORGANIZATION_ID,
    cluster_id=agent_settings.CLUSTER_ID,
)


class EdgeAgentCycle:
    """Executes the core Edge Agent operational pipeline."""

    def __init__(self):
        self.is_running = False
        self.last_cycle_timestamp: Optional[float] = None
        self.total_cycles = 0
        self.total_incidents_detected = 0

    async def run_single_cycle(self) -> Dict[str, Any]:
        """Runs: COLLECT -> NORMALIZE -> FILTER -> REDACT -> ANALYZE -> MEMORY -> QUEUE -> EXPORT."""
        cycle_start = time.time()
        self.total_cycles += 1

        # 1. COLLECT
        nodes = k8s_collector.collect_nodes()
        pods = k8s_collector.collect_pods()
        warning_events = k8s_collector.collect_warning_events()

        # 2. LOCAL DEFECT ANALYSIS & DEDUPLICATION
        detected_incidents: List[NormalizedIncident] = []
        for pod in pods:
            if pod.error_reason or pod.restart_count > 0:
                inc = local_analyzer.analyze_pod_issue(pod, events=warning_events)
                if inc:
                    if not normalizer.is_duplicate(inc.resource_kind, inc.resource_name, inc.namespace, inc.category.value):
                        detected_incidents.append(inc)
                        self.total_incidents_detected += 1

        for node in nodes:
            inc = local_analyzer.analyze_node_issue(node)
            if inc:
                if not normalizer.is_duplicate(inc.resource_kind, inc.resource_name, inc.namespace, inc.category.value):
                    detected_incidents.append(inc)
                    self.total_incidents_detected += 1

        # 3. LOCAL MEMORY RETENTION (Internal Hindsight)
        for incident in detected_incidents:
            await local_memory.retain_incident(incident)

        # 4. PRIVACY GATEWAY & CUSTOMER POLICY EVALUATION -> ENQUEUE APPROVED METADATA
        for incident in detected_incidents:
            if customer_policy.is_category_permitted("anonymized_incident_summaries", namespace=incident.namespace):
                inc_dict = incident.model_dump()
                approved, sanitized_payload, error = privacy_gateway.filter_and_approve_export(
                    category="anonymized_incident_summaries",
                    payload=inc_dict,
                )
                if approved and sanitized_payload:
                    offline_queue.enqueue(
                        category="anonymized_incident_summaries",
                        payload=sanitized_payload,
                    )

        # 5. HIGH-LEVEL CLUSTER SUMMARY -> ENQUEUE
        cluster_summary = normalizer.build_cluster_summary(
            cluster_id=agent_settings.CLUSTER_ID,
            nodes=nodes,
            pods=pods,
            incidents=detected_incidents,
        )
        if customer_policy.is_category_permitted("cluster_health"):
            summary_dict = cluster_summary.model_dump()
            approved, sanitized_summary, _ = privacy_gateway.filter_and_approve_export(
                category="cluster_health",
                payload=summary_dict,
            )
            if approved and sanitized_summary:
                offline_queue.enqueue(
                    category="cluster_health",
                    payload=sanitized_summary,
                )

        # 6. EXPORT / FLUSH QUEUE TO CLOUD
        flushed_count = await cloud_exporter.flush_offline_queue(batch_size=agent_settings.MAX_BATCH_SIZE)

        # 7. HEARTBEAT
        pending_count = offline_queue.pending_count()
        await cloud_exporter.send_heartbeat(pending_queue_count=pending_count)

        self.last_cycle_timestamp = time.time()
        return {
            "duration_seconds": round(time.time() - cycle_start, 2),
            "nodes_checked": len(nodes),
            "pods_checked": len(pods),
            "incidents_detected": len(detected_incidents),
            "flushed_to_cloud": flushed_count,
            "pending_offline_queue": pending_count,
            "privacy_redactions_total": privacy_gateway.redaction_counter,
            "privacy_blocked_exports": privacy_gateway.blocked_export_counter,
        }

    async def background_loop(self):
        """Continuous execution loop."""
        self.is_running = True
        # Initial registration attempt
        await cloud_exporter.register(
            organization_id=agent_settings.ORGANIZATION_ID,
            cluster_id=agent_settings.CLUSTER_ID,
            cluster_name=agent_settings.CLUSTER_NAME,
            agent_version=agent_settings.AGENT_VERSION,
        )

        while self.is_running:
            try:
                await self.run_single_cycle()
            except Exception as e:
                print(f"[EdgeAgent Loop Error] {e}")
            await asyncio.sleep(agent_settings.POLL_INTERVAL_SECONDS)


cycle_manager = EdgeAgentCycle()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background loop as task
    task = asyncio.create_task(cycle_manager.background_loop())
    yield
    cycle_manager.is_running = False
    task.cancel()


app = FastAPI(
    title="ClusterSage Edge Agent",
    description="Privacy-First Distributed Kubernetes SRE Edge Agent",
    version=agent_settings.AGENT_VERSION,
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "agent_id": agent_settings.AGENT_ID,
        "cluster_id": agent_settings.CLUSTER_ID,
        "k8s_connected": k8s_collector.k8s_connected,
        "cloud_connected": cloud_exporter.is_connected,
        "pending_queue": offline_queue.pending_count(),
    }


@app.get("/status")
async def get_status():
    return {
        "agent_id": agent_settings.AGENT_ID,
        "version": agent_settings.AGENT_VERSION,
        "organization_id": agent_settings.ORGANIZATION_ID,
        "cluster_id": agent_settings.CLUSTER_ID,
        "cluster_name": agent_settings.CLUSTER_NAME,
        "total_cycles": cycle_manager.total_cycles,
        "last_cycle": cycle_manager.last_cycle_timestamp,
        "pending_queue_count": offline_queue.pending_count(),
        "privacy": {
            "fail_closed": agent_settings.FAIL_CLOSED_ON_PRIVACY_ERROR,
            "total_redactions": privacy_gateway.redaction_counter,
            "total_blocked_exports": privacy_gateway.blocked_export_counter,
            "allowlist": list(privacy_gateway.allowlist),
        },
        "cloud_sync": {
            "is_connected": cloud_exporter.is_connected,
            "last_heartbeat": cloud_exporter.last_heartbeat_timestamp,
        },
    }


@app.post("/trigger-cycle")
async def trigger_cycle():
    """Manually trigger an on-demand collection and analysis cycle."""
    res = await cycle_manager.run_single_cycle()
    return {"status": "completed", "cycle_result": res}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=agent_settings.HOST, port=agent_settings.PORT, reload=False)
