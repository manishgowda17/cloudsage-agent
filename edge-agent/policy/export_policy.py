"""Customer Data Policy Engine."""

from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field


class PolicyRule(BaseModel):
    """Specific export rule."""
    category: str
    allowed: bool = True
    namespaces_allowed: List[str] = Field(default_factory=lambda: ["*"])
    anonymize_resource_names: bool = False


class CustomerExportPolicy(BaseModel):
    """Customer-defined data export policy."""
    policy_version: str = "1.0.0"
    organization_id: str
    cluster_id: str
    allow_raw_logs: bool = False  # NEVER allowed by default
    allow_environment_variables: bool = False  # NEVER allowed by default
    rules: Dict[str, PolicyRule] = Field(default_factory=dict)

    def is_category_permitted(self, category: str, namespace: str = "default") -> bool:
        """Evaluate if the given category and namespace are approved for export."""
        # Hard security guardrails
        if self.allow_raw_logs or self.allow_environment_variables:
            return False  # Strict system override

        clean_cat = category.strip().lower()
        if clean_cat not in self.rules:
            # Check default category allowlist
            return True

        rule = self.rules[clean_cat]
        if not rule.allowed:
            return False

        if "*" in rule.namespaces_allowed or namespace in rule.namespaces_allowed:
            return True

        return False


def get_default_customer_policy(org_id: str, cluster_id: str) -> CustomerExportPolicy:
    """Returns the default privacy-first customer policy."""
    rules = {
        "cluster_health": PolicyRule(category="cluster_health", allowed=True),
        "node_health": PolicyRule(category="node_health", allowed=True),
        "pod_health": PolicyRule(category="pod_health", allowed=True),
        "resource_utilization": PolicyRule(category="resource_utilization", allowed=True),
        "error_categories": PolicyRule(category="error_categories", allowed=True),
        "incident_counts": PolicyRule(category="incident_counts", allowed=True),
        "anonymized_incident_summaries": PolicyRule(category="anonymized_incident_summaries", allowed=True),
        "alert_context": PolicyRule(category="alert_context", allowed=True),
        "reliability_scores": PolicyRule(category="reliability_scores", allowed=True),
        "approved_diagnostic_metadata": PolicyRule(category="approved_diagnostic_metadata", allowed=True),
    }
    return CustomerExportPolicy(
        organization_id=org_id,
        cluster_id=cluster_id,
        rules=rules,
    )
