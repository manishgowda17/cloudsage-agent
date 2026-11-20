"""Cloud Metadata Exporter with Exponential Backoff and Idempotency."""

import asyncio
import hashlib
import importlib.util
from pathlib import Path
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple
import httpx

try:
    _q_path = Path(__file__).resolve().parent.parent / "queue" / "offline_queue.py"
    _spec = importlib.util.spec_from_file_location("edge_agent_offline_queue", _q_path)
    _mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_mod)
    PersistentOfflineQueue = _mod.PersistentOfflineQueue
except Exception:
    PersistentOfflineQueue = Any


class CloudExporter:
    """Exports approved sanitized metadata batches to ClusterSage Cloud over HTTPS."""

    def __init__(
        self,
        cloud_url: str = "http://localhost:8000/api/v1/agent",
        agent_id: str = "edge-agent-node-01",
        agent_key: str = "cs_agent_key_prod_sec_9941a8b",
        queue: Optional[PersistentOfflineQueue] = None,
        max_retries: int = 4,
        base_backoff_seconds: float = 1.0,
    ):
        self.cloud_url = cloud_url.rstrip("/")
        self.agent_id = agent_id
        self.agent_key = agent_key
        self.queue = queue
        self.max_retries = max_retries
        self.base_backoff = base_backoff_seconds
        self.last_heartbeat_timestamp: Optional[float] = None
        self.is_connected = False

    def _headers(self, idempotency_key: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "X-Agent-ID": self.agent_id,
            "X-Agent-Key": self.agent_key,
        }
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key
        return headers

    async def register(
        self,
        organization_id: str,
        cluster_id: str,
        cluster_name: str,
        agent_version: str = "1.0.0",
    ) -> bool:
        """Register Edge Agent identity with the central SaaS platform."""
        payload = {
            "agent_id": self.agent_id,
            "organization_id": organization_id,
            "cluster_id": cluster_id,
            "cluster_name": cluster_name,
            "version": agent_version,
            "capabilities": ["k8s_events", "pod_metrics", "node_metrics", "local_analyzer"],
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.cloud_url}/register",
                    json=payload,
                    headers=self._headers(),
                )
                if res.status_code in (200, 201):
                    self.is_connected = True
                    return True
        except Exception:
            pass
        return False

    async def send_heartbeat(self, pending_queue_count: int = 0) -> bool:
        """Send heartbeat beacon to inform cloud of online status."""
        payload = {
            "agent_id": self.agent_id,
            "timestamp": time.time(),
            "status": "healthy",
            "pending_queue_count": pending_queue_count,
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{self.cloud_url}/heartbeat",
                    json=payload,
                    headers=self._headers(),
                )
                if res.status_code == 200:
                    self.last_heartbeat_timestamp = time.time()
                    self.is_connected = True
                    return True
        except Exception:
            self.is_connected = False
        return False

    async def export_batch(self, items: List[Dict[str, Any]]) -> Tuple[bool, List[int]]:
        """Exports a batch of approved metadata items with exponential backoff.
        
        Returns:
            Tuple of (success, list_of_exported_queue_ids)
        """
        if not items:
            return True, []

        queue_ids = [item["queue_id"] for item in items]
        export_payloads = [
            {
                "category": item["category"],
                "data": item["payload"],
                "created_at": item.get("created_at", time.time()),
            }
            for item in items
        ]

        # Generate deterministic idempotency key for this exact batch
        raw_key = f"{self.agent_id}:{','.join(str(i) for i in queue_ids)}"
        idempotency_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

        body = {
            "agent_id": self.agent_id,
            "batch_size": len(export_payloads),
            "events": export_payloads,
        }

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        f"{self.cloud_url}/ingest",
                        json=body,
                        headers=self._headers(idempotency_key),
                    )
                    if res.status_code in (200, 201, 202):
                        self.is_connected = True
                        return True, queue_ids
                    elif res.status_code == 401 or res.status_code == 403:
                        # Unauthorized agent, do not retry blindly
                        self.is_connected = False
                        return False, []
            except Exception:
                pass

            # Exponential backoff: 1s, 2s, 4s...
            backoff = self.base_backoff * (2 ** attempt)
            await asyncio.sleep(backoff)

        self.is_connected = False
        return False, []

    async def flush_offline_queue(self, batch_size: int = 50) -> int:
        """Pulls pending approved items from offline queue and exports them to cloud."""
        if not self.queue:
            return 0

        pending_items = self.queue.peek_batch(limit=batch_size)
        if not pending_items:
            return 0

        success, acked_ids = await self.export_batch(pending_items)
        if success and acked_ids:
            return self.queue.ack(acked_ids)
        else:
            # Mark retry
            self.queue.nack([item["queue_id"] for item in pending_items])
            return 0
