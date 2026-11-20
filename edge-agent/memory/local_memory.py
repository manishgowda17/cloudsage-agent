"""Local Hindsight Agent Memory Client for Edge Agent."""

import json
from typing import Any, Dict, List, Optional
import httpx

try:
    from normalizer.schemas import NormalizedIncident
    from privacy.gateway import PrivacyGateway
except (ImportError, ValueError):
    from ..normalizer.schemas import NormalizedIncident
    from ..privacy.gateway import PrivacyGateway

try:
    from hindsight_client import Hindsight
    HINDSIGHT_SDK_AVAILABLE = True
except ImportError:
    HINDSIGHT_SDK_AVAILABLE = False


class LocalMemoryManager:
    """Manages local incident memory using internal Hindsight service."""

    def __init__(
        self,
        base_url: str = "http://localhost:8888",
        organization_id: str = "default_org",
        cluster_id: str = "default_cluster",
        privacy_gateway: Optional[PrivacyGateway] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.bank_id = f"customer_{organization_id}_{cluster_id}".replace("-", "_")
        self.privacy = privacy_gateway or PrivacyGateway()
        self._local_fallback_cache: List[Dict[str, Any]] = []

    def get_client(self) -> Optional[Any]:
        if HINDSIGHT_SDK_AVAILABLE:
            try:
                return Hindsight(base_url=self.base_url)
            except Exception:
                return None
        return None

    async def is_healthy(self) -> bool:
        """Check if internal Hindsight service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/health")
                return res.status_code in (200, 204)
        except Exception:
            return False

    async def retain_incident(
        self,
        incident: NormalizedIncident,
        resolution_notes: Optional[str] = None,
    ) -> bool:
        """Retain verified incident resolution strictly into the local memory bank."""
        # Sanitize any remaining sensitive data
        clean_problem, _ = self.privacy.redact_text(incident.problem_summary)
        clean_evidence, _ = self.privacy.redact_text(incident.anonymized_evidence)
        clean_action, _ = self.privacy.redact_text(incident.suggested_action)

        content = (
            f"Edge Agent Incident: {incident.incident_id}\n"
            f"Resource: {incident.resource_kind}/{incident.resource_name} (ns: {incident.namespace})\n"
            f"Category: {incident.category.value}\n"
            f"Problem: {clean_problem}\n"
            f"Evidence: {clean_evidence}\n"
            f"Remediation: {clean_action}\n"
        )
        if resolution_notes:
            clean_notes, _ = self.privacy.redact_text(resolution_notes)
            content += f"Resolution Notes: {clean_notes}\n"

        record = {
            "incident_id": incident.incident_id,
            "bank_id": self.bank_id,
            "category": incident.category.value,
            "content": content,
            "timestamp": incident.timestamp,
        }

        # Attempt SDK retain if available and healthy
        if HINDSIGHT_SDK_AVAILABLE:
            c = self.get_client()
            if c:
                try:
                    await c.aretain(
                        bank_id=self.bank_id,
                        content=content,
                        tags=["edge-agent", incident.category.value.lower(), incident.resource_kind.lower()],
                        context=f"Edge incident {incident.incident_id}",
                    )
                    return True
                except Exception:
                    pass
                finally:
                    try:
                        await c.aclose()
                    except Exception:
                        pass

        # Fallback local in-memory retention buffer
        self._local_fallback_cache.append(record)
        return True

    async def recall_similar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Query local memory bank for historical incidents matching symptoms."""
        clean_query, _ = self.privacy.redact_text(query)

        if HINDSIGHT_SDK_AVAILABLE:
            c = self.get_client()
            if c:
                try:
                    res = await c.arecall(
                        bank_id=self.bank_id,
                        query=clean_query,
                        top_k=limit,
                    )
                    memories = []
                    for item in getattr(res, "memories", []):
                        memories.append({
                            "id": getattr(item, "id", ""),
                            "text": getattr(item, "text", ""),
                            "score": getattr(item, "score", 0.9),
                        })
                    if memories:
                        return memories
                except Exception:
                    pass
                finally:
                    try:
                        await c.aclose()
                    except Exception:
                        pass

        # Fallback matching on local cache
        results = []
        q_lower = clean_query.lower()
        for item in reversed(self._local_fallback_cache):
            if any(word in item["content"].lower() for word in q_lower.split() if len(word) > 3):
                results.append({
                    "id": item["incident_id"],
                    "text": item["content"],
                    "score": 0.85,
                })
                if len(results) >= limit:
                    break
        return results
