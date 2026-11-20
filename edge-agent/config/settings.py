"""ClusterSage Edge Agent Configuration."""

import os
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


@dataclass
class EdgeAgentSettings:
    """Settings for ClusterSage Local Edge Agent."""

    # Agent Identity & Organization
    AGENT_ID: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_AGENT_ID", "edge-agent-node-01")
    )
    AGENT_VERSION: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_AGENT_VERSION", "1.0.0")
    )
    ORGANIZATION_ID: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_ORG_ID", "org_enterprise_primary")
    )
    CLUSTER_ID: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_CLUSTER_ID", "production-us-east-1")
    )
    CLUSTER_NAME: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_CLUSTER_NAME", "Production K8s US-East")
    )

    # Cloud SaaS Endpoint & Authentication
    CLOUD_INGEST_URL: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_CLOUD_URL", "http://backend:8000/api/v1/agent")
    )
    AGENT_API_KEY: str = field(
        default_factory=lambda: os.getenv("CLUSTERSAGE_AGENT_KEY", "cs_agent_key_prod_sec_9941a8b")
    )

    # Local Memory Engine (Private Hindsight URL)
    HINDSIGHT_LOCAL_URL: str = field(
        default_factory=lambda: os.getenv("HINDSIGHT_LOCAL_URL", "http://hindsight:8888")
    )

    # Operational Intervals
    POLL_INTERVAL_SECONDS: int = field(
        default_factory=lambda: int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
    )
    HEARTBEAT_INTERVAL_SECONDS: int = field(
        default_factory=lambda: int(os.getenv("HEARTBEAT_INTERVAL_SECONDS", "60"))
    )
    MAX_BATCH_SIZE: int = field(
        default_factory=lambda: int(os.getenv("MAX_BATCH_SIZE", "50"))
    )

    # Offline Queue Persistence
    OFFLINE_DB_PATH: str = field(
        default_factory=lambda: os.getenv("OFFLINE_DB_PATH", "edge_agent_queue.db")
    )

    # Local Privacy & Export Policy
    FAIL_CLOSED_ON_PRIVACY_ERROR: bool = field(
        default_factory=lambda: os.getenv("FAIL_CLOSED_ON_PRIVACY_ERROR", "true").lower() in ("true", "1", "yes")
    )
    ALLOWLISTED_METADATA_CATEGORIES: List[str] = field(
        default_factory=lambda: [
            "cluster_health",
            "node_health",
            "pod_health",
            "resource_utilization",
            "error_categories",
            "incident_counts",
            "anonymized_incident_summaries",
            "alert_context",
            "reliability_scores",
            "approved_diagnostic_metadata",
        ]
    )

    # Server daemon mode
    HOST: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    PORT: int = field(default_factory=lambda: int(os.getenv("PORT", "8081")))


agent_settings = EdgeAgentSettings()
