"""Prompt Builder Component.

Constructs structured, deterministic prompts for the LLM to analyze Kubernetes
incident evidence as a Senior Kubernetes SRE.
"""

import json
from typing import Any, Dict


SYSTEM_PROMPT = """You are a Senior Kubernetes Site Reliability Engineer (SRE) specializing in cloud-native incident triage and root cause analysis.

Your goal is to inspect the raw troubleshooting evidence gathered from a Kubernetes cluster (pod states, container logs, warning events, deployment conditions, and network routing), correlate the signals, and diagnose the exact root cause.

You must follow these strict guidelines:
1. Ground your diagnosis strictly in the evidence provided. Do not invent errors that are not supported by the logs, events, or statuses.
2. Correlate across layers (e.g., if a Pod is in CrashLoopBackOff and its logs show a missing environment variable or connection failure, connect those facts directly).
3. Provide practical, beginner-friendly, and Kubernetes-specific remediation steps.
4. Provide the exact kubectl command needed to remediate or inspect the problematic resource.
5. Provide a realistic confidence score between 0 and 100 based on the clarity of evidence.
6. If the cluster is healthy or no failures are detected, state that clearly with confidence 100.
7. Return ONLY valid JSON adhering strictly to the schema below without markdown code blocks, backticks, or extraneous preamble.

JSON Output Schema:
{
  "root_cause": "Concise summary of the root cause",
  "explanation": "Clear explanation of why the failure occurred and its operational impact",
  "fix": "Actionable, step-by-step remediation advice",
  "kubectl_command": "kubectl <command>",
  "prevention": "Recommended preventative measure (e.g., liveness probes, ConfigMaps, resource limits)",
  "confidence": 92
}
"""


class PromptBuilder:
    """Builds prompts for Senior Kubernetes SRE reasoning."""

    @staticmethod
    def build_user_prompt(investigation: Dict[str, Any]) -> str:
        """Format the investigation evidence into a clear markdown-structured prompt."""
        pods = investigation.get("pods", {})
        logs = investigation.get("logs", {})
        events = investigation.get("events", {})
        deployments = investigation.get("deployments", {})
        network = investigation.get("network", {})

        return f"""### Kubernetes Incident Evidence

#### 1. Pods Telemetry
- Total Pods: {pods.get('total_pods', 0)}
- Unhealthy Count: {pods.get('unhealthy_count', 0)}
- Cluster Overall Pod Health: {'Healthy' if pods.get('healthy') else 'Unhealthy'}
- Problematic Pods:
{json.dumps(pods.get('problematic_pods', []), indent=2)}

#### 2. Pod Logs & Error Signatures
- Logs Collected For: {logs.get('collected_count', 0)} pod(s)
- Extracted Log Telemetry:
{json.dumps(logs.get('pod_logs', {}), indent=2)}

#### 3. Warning Events
- Total Events: {events.get('total_events', 0)}
- Warning Events Count: {events.get('warning_events_count', 0)}
- Detected Issue Events:
{json.dumps(events.get('detected_issues', []), indent=2)}

#### 4. Deployment Health
- Total Deployments: {deployments.get('total_deployments', 0)}
- Unhealthy Count: {deployments.get('unhealthy_count', 0)}
- Problematic Deployments:
{json.dumps(deployments.get('problematic_deployments', []), indent=2)}

#### 5. Network & Service Routing
- Total Services: {network.get('total_services', 0)}
- Routing / Endpoint Discrepancies:
{json.dumps(network.get('problematic_services', []), indent=2)}

Analyze this evidence, correlate the symptoms, and return your diagnosis in the required JSON format.
"""
