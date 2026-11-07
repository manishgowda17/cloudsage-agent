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
        manifest_audit = investigation.get("manifest_audit")
        source_info = investigation.get("source_info", {})

        # Format recalled memories if present
        recalled_memories = investigation.get("recalled_memories", [])
        memory_section = ""
        if recalled_memories:
            memory_section = "\n#### Historical Incident Memories & Verified Fixes (Retrieved from Hindsight)\n"
            for idx, m in enumerate(recalled_memories, 1):
                text = m.get("text") if isinstance(m, dict) else str(m)
                tags = m.get("tags") if isinstance(m, dict) else []
                memory_section += f"- [Historical Memory #{idx}] (Tags: {', '.join(tags) if tags else 'none'}):\n  {text}\n"
            memory_section += (
                "\nCRITICAL SRE INSTRUCTION: The historical memories above represent previously verified resolutions "
                "to similar incidents in this environment. Use them as trusted lessons and prior context, "
                "but ALWAYS validate the recommended fix against the current manifest and telemetry.\n"
            )

        # Specialized prompt for static Manifest, GitHub repo, or ZIP audits
        if manifest_audit or source_info.get("type") in ("yaml", "github", "zip"):
            return f"""### Kubernetes Manifest & GitOps Audit Evidence

#### Source Information
- Ingestion Mode: {source_info.get('type', 'manifest')}
- Source Label: {source_info.get('url') or source_info.get('filename') or (manifest_audit.get('source_label') if manifest_audit else 'manifest.yaml')}
- Scanned Files: {json.dumps(source_info.get('files', []))}
- Total Resources: {manifest_audit.get('total_resources', 0) if manifest_audit else 0}

#### Detected Manifest Issues & Defects
{json.dumps(events.get('detected_issues', []), indent=2)}

#### Probe Omissions & Diagnostics
{json.dumps(events.get('probe_events', []), indent=2)}

#### Workload Deployments
{json.dumps(deployments.get('problematic_deployments', []), indent=2)}

#### Service Routing & Selectors
{json.dumps(network.get('problematic_services', []), indent=2)}
{memory_section}
Analyze these Kubernetes manifest definitions. Identify the primary root cause defects (such as missing liveness/readiness probes, selector mismatches, or missing resource limits), explain their operational risk, and return actionable remediation advice and kubectl commands in the required JSON format.
"""

        prompt = f"""### Kubernetes Incident Evidence

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
- Problematic Services:
{json.dumps(network.get('problematic_services', []), indent=2)}
"""

        if manifest_audit or source_info:
            prompt += f"""
#### 6. Manifest & Repository Audit
- Ingestion Source: {source_info.get('type', 'manifest')} ({source_info.get('url') or source_info.get('filename') or (manifest_audit.get('source_label') if manifest_audit else '')})
- Scanned Files: {json.dumps(source_info.get('files', []))}
- Total Resources: {manifest_audit.get('total_resources', 0) if manifest_audit else 0}
- Probe Issues:
{json.dumps(events.get('probe_events', []), indent=2)}
"""

        if memory_section:
            prompt += memory_section

        prompt += "\nAnalyze this evidence, correlate the symptoms, and return your diagnosis in the required JSON format.\n"
        return prompt
