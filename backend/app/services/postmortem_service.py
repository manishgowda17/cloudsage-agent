"""Post-Mortem Learning & Knowledge Retention Service.

Captures structured post-mortem reports after incident resolution:
- What happened & root cause
- Effective vs ineffective remediation procedures
- Associated runbook and resolution time (TTR)
- Preventive action items
- Extracts reusable engineering lessons
- Retains verified post-mortems as VERIFIED_SUCCESSFUL memories in Hindsight
"""

import datetime
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.core.logging import logger
from app.services.hindsight_service import hindsight_service, sanitize_sensitive_data


class PostMortemCreate(BaseModel):
    incident_id: str
    incident_title: str
    resource_kind: str = "Deployment"
    resource_name: str
    namespace: str = "default"
    summary: str
    root_cause: str
    resolution_steps_taken: str
    steps_that_worked: str
    steps_that_failed: Optional[str] = None
    runbook_used: Optional[str] = None
    time_to_detect_minutes: Optional[int] = None
    time_to_resolve_minutes: Optional[int] = None
    preventive_actions: str
    key_lessons: str
    was_successful: bool = True


class PostMortemRecord(BaseModel):
    id: str
    incident_id: str
    incident_title: str
    resource_kind: str
    resource_name: str
    namespace: str
    summary: str
    root_cause: str
    resolution_steps_taken: str
    steps_that_worked: str
    steps_that_failed: Optional[str] = None
    runbook_used: Optional[str] = None
    time_to_detect_minutes: Optional[int] = None
    time_to_resolve_minutes: Optional[int] = None
    preventive_actions: str
    key_lessons: str
    was_successful: bool
    created_at: str
    user_id: Optional[str] = None
    retained_in_hindsight: bool = False
    hindsight_operation_id: Optional[str] = None


class PostMortemService:
    """Manages post-mortem reports and feeds reusable lessons into Hindsight long-term memory."""

    def __init__(self):
        # In-memory storage for active session with fallback demo records
        self._records: Dict[str, PostMortemRecord] = {}
        self._init_seed_data()

    def _init_seed_data(self):
        """Seed realistic past post-mortems for immediate exploration."""
        seed = PostMortemRecord(
            id="pm-k8s-001",
            incident_id="inc-prod-probe-882",
            incident_title="Production Payments API Readiness Probe Outage",
            resource_kind="Deployment",
            resource_name="payments-api",
            namespace="production",
            summary="During v2.4.0 rollout, payment pods were repeatedly terminated and failed traffic ingress due to a 404 on the configured readiness probe.",
            root_cause="The deployment spec readinessProbe pointed to legacy '/healthz' instead of the new Spring Boot actuator endpoint '/ready' on port 8080.",
            resolution_steps_taken="Patched deployment readinessProbe httpGet path to '/ready' and increased initialDelaySeconds to 15s.",
            steps_that_worked="Updating path to /ready immediately resolved 404; pods achieved 1/1 READY within 12 seconds.",
            steps_that_failed="Attempted restarting pods with 'kubectl rollout restart' without fixing manifest path; resulted in immediate CrashLoopBackOff repeat.",
            runbook_used="RB-K8S-001",
            time_to_detect_minutes=4,
            time_to_resolve_minutes=11,
            preventive_actions="Added static CI/CD lint check enforcing that probe paths exist in application OpenAPI contracts.",
            key_lessons="Never trust legacy probe paths during framework migrations. Application endpoint contracts must be validated in CI before manifest deployment.",
            was_successful=True,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            user_id="default",
            retained_in_hindsight=True,
            hindsight_operation_id="op-seed-pm-001"
        )
        self._records[seed.id] = seed

    def list_postmortems(self, user_id: Optional[str] = None) -> List[PostMortemRecord]:
        """Return all recorded post-mortems."""
        records = list(self._records.values())
        records.sort(key=lambda x: x.created_at, reverse=True)
        return records

    def get_postmortem(self, pm_id: str) -> Optional[PostMortemRecord]:
        """Retrieve single post-mortem record by ID."""
        return self._records.get(pm_id)

    async def record_postmortem(
        self,
        pm_data: PostMortemCreate,
        user_id: Optional[str] = None
    ) -> PostMortemRecord:
        """Create and retain a structured post-mortem in Hindsight.
        
        Extracts reusable engineering lessons and persists as VERIFIED_SUCCESSFUL memory.
        """
        pm_id = f"pm-{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Sanitize sensitive fields before storage
        clean_summary = sanitize_sensitive_data(pm_data.summary)
        clean_root_cause = sanitize_sensitive_data(pm_data.root_cause)
        clean_steps_worked = sanitize_sensitive_data(pm_data.steps_that_worked)
        clean_steps_failed = sanitize_sensitive_data(pm_data.steps_that_failed or "")
        clean_lessons = sanitize_sensitive_data(pm_data.key_lessons)
        clean_prevention = sanitize_sensitive_data(pm_data.preventive_actions)

        # Structure reusable lessons content for Hindsight
        hindsight_content = (
            f"KUBERNETES SRE POST-MORTEM LESSON: {pm_data.incident_title}\n"
            f"Incident ID: {pm_data.incident_id}\n"
            f"Resource: {pm_data.resource_kind}/{pm_data.resource_name} (Namespace: {pm_data.namespace})\n"
            f"Root Cause: {clean_root_cause}\n"
            f"Proven Working Resolution: {clean_steps_worked}\n"
        )
        if clean_steps_failed:
            hindsight_content += f"Ineffective Steps / Pitfalls: {clean_steps_failed}\n"
        if pm_data.runbook_used:
            hindsight_content += f"Runbook Used: {pm_data.runbook_used}\n"
        hindsight_content += (
            f"Resolution Status: VERIFIED_SUCCESSFUL\n"
            f"Preventive Measures: {clean_prevention}\n"
            f"Core Engineering Lesson: {clean_lessons}\n"
        )

        tags = [
            "post-mortem",
            "verified-resolution",
            f"kind:{pm_data.resource_kind.lower()}",
            f"resource:{pm_data.resource_name.lower()}",
            "kubernetes",
            "sre-lesson"
        ]
        if pm_data.runbook_used:
            tags.append(f"runbook:{pm_data.runbook_used.lower()}")

        hindsight_retained = False
        operation_id = None

        try:
            retain_res = await hindsight_service.retain_incident(
                user_id=user_id,
                incident_id=f"pm-{pm_data.incident_id}",
                resource_kind=pm_data.resource_kind,
                resource_name=pm_data.resource_name,
                detected_problem=pm_data.incident_title,
                root_cause=clean_root_cause,
                suggested_remediation=clean_steps_worked,
                resolution_status="VERIFIED_SUCCESSFUL",
                evidence_summary=f"Post-Mortem: {clean_lessons}",
                tags=tags,
            )
            hindsight_retained = retain_res.get("success", False)
            operation_id = retain_res.get("operation_id")
            logger.info(f"Post-Mortem '{pm_id}' retained into Hindsight bank for user '{user_id}' (success={hindsight_retained})")
        except Exception as e:
            logger.error(f"Failed to retain post-mortem in Hindsight: {e}")

        record = PostMortemRecord(
            id=pm_id,
            incident_id=pm_data.incident_id,
            incident_title=pm_data.incident_title,
            resource_kind=pm_data.resource_kind,
            resource_name=pm_data.resource_name,
            namespace=pm_data.namespace,
            summary=clean_summary,
            root_cause=clean_root_cause,
            resolution_steps_taken=pm_data.resolution_steps_taken,
            steps_that_worked=clean_steps_worked,
            steps_that_failed=clean_steps_failed,
            runbook_used=pm_data.runbook_used,
            time_to_detect_minutes=pm_data.time_to_detect_minutes,
            time_to_resolve_minutes=pm_data.time_to_resolve_minutes,
            preventive_actions=clean_prevention,
            key_lessons=clean_lessons,
            was_successful=pm_data.was_successful,
            created_at=now,
            user_id=user_id,
            retained_in_hindsight=hindsight_retained,
            hindsight_operation_id=operation_id,
        )

        self._records[pm_id] = record
        return record


postmortem_service = PostMortemService()
