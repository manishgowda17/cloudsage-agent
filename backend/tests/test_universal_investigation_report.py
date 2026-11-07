"""Comprehensive test suite for Universal Investigation Report architecture.

Verifies:
1. Universal report schema standardization across all sources (Cluster, GitHub, YAML, ZIP, Helm, Scenarios).
2. Intelligent issue grouping (repeated findings grouped without data loss).
3. Universal issue explorer data models & dual explanation levels (simple vs technical).
4. Five-point executive summary generation.
5. Overall health assessment logic (never reporting live cluster healthy from static AST alone).
6. Prioritized remediation (P0 - P3).
7. Validation evidence & limitations tracking.
8. Backward compatibility with existing DiagnosisResult and InvestigationResponse contracts.
"""

import pytest
from app.models.schemas import UniversalInvestigationReport, InvestigationResponse
from app.services.report_normalizer import UniversalReportNormalizer
from app.kubernetes.manifest_inspector import manifest_inspector


# ==============================================================================
# Scenario 1: YAML manifest with deliberate syntax and configuration errors
# ==============================================================================
def test_yaml_manifest_with_syntax_and_config_errors():
    malformed_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broken-app
spec:
  replicas: -1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: api-mismatch
    spec:
      containers:
      - name: web
        image: nginx:latest
        resources:
          limits:
            memory: "invalid-memory-unit"
            cpu: "100m"
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: -5
"""
    resources, errors = manifest_inspector.parse_yaml_documents(malformed_yaml, "broken-app.yaml")
    evidence = manifest_inspector.audit_resources(resources, "broken-app.yaml", parse_errors=errors, scanned_files=["broken-app.yaml"])

    mock_diagnosis = {
        "root_cause": "Deployment selector mismatch and invalid memory units in broken-app",
        "explanation": "Selector does not match pod template labels, and memory limit unit is unrecognized.",
        "fix": "Align labels app: web and specify memory as 256Mi.",
        "kubectl_command": "kubectl apply -f broken-app-fixed.yaml",
        "confidence": 95,
        "incident_id": "inc-yaml-test",
    }

    report = UniversalReportNormalizer.normalize(
        evidence=evidence,
        diagnosis=mock_diagnosis,
        source_type="yaml",
        source_label="broken-app.yaml",
    )

    # 1. Structural checks
    assert isinstance(report, UniversalInvestigationReport)
    assert report.metadata.id == "inc-yaml-test"
    assert report.source.source_type == "yaml"
    assert report.source.source_name == "broken-app.yaml"

    # 2. Assessment checks (Critical / Unhealthy due to errors)
    assert report.assessment.status in ("CRITICAL", "UNHEALTHY")
    assert report.assessment.is_live_cluster is False
    assert report.assessment.validation_type == "STATIC_AST"

    # 3. Statistics checks
    assert report.statistics.errors_count > 0
    assert report.statistics.total_checks_performed > 0

    # 4. Executive summary
    assert "broken-app.yaml" in report.executive_summary.what_was_investigated
    assert report.executive_summary.most_important_problem != ""
    assert report.executive_summary.recommended_action != ""

    # 5. Dual explanations in findings
    for f in report.findings:
        assert f.simple_explanation != ""
        assert f.technical_explanation != ""
        assert f.severity in ("ERROR", "WARNING", "INFO")
        assert f.recommended_fix != ""

    # 6. Remediations
    assert len(report.remediations) > 0
    assert report.remediations[0].priority in ("P0", "P1")


# ==============================================================================
# Scenario 2: Helm chart containing template expressions ({{ .Values... }})
# ==============================================================================
def test_helm_chart_with_template_expressions():
    helm_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    app: {{ .Values.appName | default "backend" }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.appName | default "backend" }}
  template:
    metadata:
      labels:
        app: {{ .Values.appName | default "backend" }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.port }}
"""
    resources, errors = manifest_inspector.parse_yaml_documents(helm_yaml, "templates/deployment.yaml")
    print("DEBUG ERRORS:", errors)
    # Should safely sanitize Helm Go template directives without syntax failure
    assert len(errors) == 0
    assert len(resources) == 1
    assert resources[0]["kind"] == "Deployment"

    evidence = manifest_inspector.audit_resources(resources, "templates/deployment.yaml", parse_errors=errors, scanned_files=["templates/deployment.yaml"])

    mock_diagnosis = {
        "root_cause": "Helm Chart Template Verified",
        "explanation": "Structural AST conforms to Kubernetes Deployment schema.",
        "fix": "No syntax error detected in template structure.",
        "kubectl_command": "helm template .",
        "confidence": 90,
    }

    report = UniversalReportNormalizer.normalize(
        evidence=evidence,
        diagnosis=mock_diagnosis,
        source_type="helm",
        source_label="mychart/templates/deployment.yaml",
    )

    assert isinstance(report, UniversalInvestigationReport)
    assert report.source.source_type == "helm"
    # Verification of limitations tracking for Helm unrendered templates
    has_helm_limitation = any("Helm" in l.message or "placeholder" in l.message for l in report.limitations)
    assert has_helm_limitation is True


# ==============================================================================
# Scenario 3: Healthy configuration with zero errors
# ==============================================================================
def test_healthy_configuration_report():
    clean_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-api
        image: internal-registry.io/order-api:v2.1.0
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
"""
    resources, errors = manifest_inspector.parse_yaml_documents(clean_yaml, "clean-deployment.yaml")
    evidence = manifest_inspector.audit_resources(resources, "clean-deployment.yaml", parse_errors=errors, scanned_files=["clean-deployment.yaml"])

    mock_diagnosis = {
        "root_cause": "No Anomaly Detected (Clean Configuration)",
        "explanation": "All probe endpoints, container ports, resource limits, and selectors satisfy production specifications.",
        "fix": "No remediation required.",
        "kubectl_command": "kubectl get deployment order-service -n prod",
        "confidence": 100,
    }

    report = UniversalReportNormalizer.normalize(
        evidence=evidence,
        diagnosis=mock_diagnosis,
        source_type="yaml",
        source_label="clean-deployment.yaml",
    )

    # 1. Overall assessment must be HEALTHY
    assert report.assessment.status == "HEALTHY"
    assert report.assessment.severity_score == 0
    # Must explicitly state static validation, NOT claiming live cluster is verified
    assert report.assessment.is_live_cluster is False
    assert report.assessment.validation_type == "STATIC_AST"

    # 2. Statistics check
    assert report.statistics.errors_count == 0
    assert report.statistics.warnings_count == 0
    assert report.statistics.passed_checks_count >= 5

    # 3. Clean executive summary
    assert "clean" in report.executive_summary.what_was_discovered.lower() or "0 error" in report.executive_summary.what_was_discovered.lower()


# ==============================================================================
# Scenario 4: Intelligent issue grouping across multiple resources
# ==============================================================================
def test_intelligent_issue_grouping_multiple_resources():
    multi_resource_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-alpha
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alpha
  template:
    metadata:
      labels:
        app: alpha
    spec:
      containers:
      - name: c1
        image: alpha:latest
        resources:
          limits:
            memory: "256MB"  # Defect: Invalid unit 'MB' instead of 'Mi'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-beta
spec:
  replicas: 1
  selector:
    matchLabels:
      app: beta
  template:
    metadata:
      labels:
        app: beta
    spec:
      containers:
      - name: c2
        image: beta:latest
        resources:
          limits:
            memory: "512MB"  # Defect: Same invalid unit 'MB'
"""
    resources, errors = manifest_inspector.parse_yaml_documents(multi_resource_yaml, "multi-service.yaml")
    evidence = manifest_inspector.audit_resources(resources, "multi-service.yaml", parse_errors=errors, scanned_files=["multi-service.yaml"])

    mock_diagnosis = {
        "root_cause": "Invalid memory quantity units 'MB' across multiple deployments",
        "explanation": "Kubernetes uses IEC binary units (Mi, Gi), not decimal metric units (MB).",
        "fix": "Replace MB with Mi.",
        "kubectl_command": "sed -i 's/MB/Mi/g' multi-service.yaml",
        "confidence": 95,
    }

    report = UniversalReportNormalizer.normalize(
        evidence=evidence,
        diagnosis=mock_diagnosis,
        source_type="yaml",
        source_label="multi-service.yaml",
    )

    # 1. Individual findings are preserved in full
    assert len(report.findings) >= 2
    memory_findings = [f for f in report.findings if "memory" in f.technical_explanation.lower() or "mb" in f.technical_explanation.lower()]
    assert len(memory_findings) >= 2

    # 2. Intelligent grouping combines them into a unified group
    assert len(report.finding_groups) >= 1
    group = next((g for g in report.finding_groups if "Resource" in g.category), None)
    assert group is not None
    assert group.occurrence_count >= 2
    # Both service-alpha and service-beta should be listed in affected_resources
    assert any("service-alpha" in res for res in group.affected_resources)
    assert any("service-beta" in res for res in group.affected_resources)


# ==============================================================================
# Scenario 5: Live cluster investigation with actual failure telemetry
# ==============================================================================
def test_live_cluster_investigation_report():
    live_evidence = {
        "namespace": "production",
        "target_ns": "production",
        "pods": {
            "healthy": False,
            "total_pods": 4,
            "unhealthy_count": 1,
            "problematic_pods": [{
                "name": "cart-service-589f-x92",
                "namespace": "production",
                "status": "CrashLoopBackOff",
                "phase": "Running",
                "restart_count": 14,
                "reason": "CrashLoopBackOff",
                "message": "Back-off 5m0s restarting failed container=cart-app pod=cart-service-589f-x92_production",
            }],
        },
        "logs": {
            "collected_count": 1,
            "pod_logs": {
                "cart-service-589f-x92": "Fatal: Redis connection timeout at redis://redis-master:6379"
            },
        },
        "events": {
            "total_events": 5,
            "warning_events_count": 2,
            "detected_issues": [{
                "kind": "Pod",
                "name": "cart-service-589f-x92",
                "namespace": "production",
                "reason": "BackOff",
                "message": "Back-off restarting failed container",
                "count": 14,
            }],
        },
        "deployments": {
            "healthy": False,
            "total_deployments": 2,
            "problematic_deployments": [{
                "name": "cart-service",
                "desired": 1,
                "ready": 0,
                "available": 0,
                "reason": "ReplicasUnavailable",
            }],
        },
        "network": {"healthy": True, "total_services": 2, "problematic_services": []},
    }

    mock_diagnosis = {
        "root_cause": "CrashLoopBackOff in cart-service due to Redis connection timeout",
        "explanation": "cart-app container is crashing immediately upon startup because redis-master endpoint is unreachable.",
        "fix": "Check Redis service DNS and ensure redis-master pod is running in production namespace.",
        "kubectl_command": "kubectl logs cart-service-589f-x92 -n production",
        "confidence": 98,
        "incident_id": "inc-live-cluster-01",
    }

    report = UniversalReportNormalizer.normalize(
        evidence=live_evidence,
        diagnosis=mock_diagnosis,
        source_type="cluster",
        source_label="production-cluster/production",
    )

    # Must be marked as LIVE_TELEMETRY and CRITICAL
    assert report.assessment.is_live_cluster is True
    assert report.assessment.validation_type == "LIVE_TELEMETRY"
    assert report.assessment.status == "CRITICAL"
    assert report.source.target_namespace == "production"

    # Root cause details
    assert len(report.root_causes) >= 1
    assert "CrashLoopBackOff" in report.root_causes[0].what_happened
    assert "cart-service" in str(report.root_causes[0].affected_resources)

    # Remediation Priority P0
    assert report.remediations[0].priority == "P0"


# ==============================================================================
# Scenario 6: Incomplete / unavailable cluster (unreachable)
# ==============================================================================
def test_unreachable_cluster_investigation_report():
    empty_evidence = {
        "pods": {"healthy": False, "total_pods": 0, "unhealthy_count": 0, "problematic_pods": []},
        "logs": {"collected_count": 0, "pod_logs": {}},
        "events": {"total_events": 0, "warning_events_count": 0, "detected_issues": []},
        "deployments": {"healthy": False, "total_deployments": 0, "unhealthy_count": 0, "problematic_deployments": []},
        "network": {"healthy": False, "total_services": 0, "problematic_services": []},
        "cluster_error": "Connection refused: dial tcp 127.0.0.1:6443: connectex: No connection could be made",
    }

    mock_diagnosis = {
        "root_cause": "Kubernetes Cluster API Endpoint Unreachable",
        "explanation": "Cluster context 'kind-test' could not be reached via kubeconfig.",
        "fix": "Verify that your cluster or Docker desktop is running and cluster context is active.",
        "kubectl_command": "kubectl cluster-info",
        "confidence": 70,
    }

    report = UniversalReportNormalizer.normalize(
        evidence=empty_evidence,
        diagnosis=mock_diagnosis,
        source_type="cluster",
        source_label="cluster:kind-test",
    )

    # Must be marked as INCONCLUSIVE or UNHEALTHY, not healthy
    assert report.assessment.status in ("INCONCLUSIVE", "UNHEALTHY")
    # Must communicate limitations
    assert len(report.limitations) > 0
    assert any("unreachable" in l.message.lower() for l in report.limitations)


# ==============================================================================
# Scenario 7: Backward compatibility with InvestigationResponse
# ==============================================================================
def test_investigation_response_backward_compatibility():
    clean_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.25.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
"""
    resources, errors = manifest_inspector.parse_yaml_documents(clean_yaml, "service.yaml")
    evidence = manifest_inspector.audit_resources(resources, "service.yaml", parse_errors=errors, scanned_files=["service.yaml"])

    mock_diagnosis = {
        "root_cause": "Service Spec Verified Clean",
        "explanation": "Valid Kubernetes Service declaration.",
        "fix": "No remediation required.",
        "kubectl_command": "kubectl get svc my-service",
        "confidence": 95,
    }

    report = UniversalReportNormalizer.normalize(
        evidence=evidence,
        diagnosis=mock_diagnosis,
        source_type="yaml",
        source_label="service.yaml",
    )
    mock_diagnosis["report"] = report.model_dump()

    response = InvestigationResponse(
        status="success",
        diagnosis=mock_diagnosis,
        report=report,
        investigation=evidence,
        user_id="test-operator",
    )

    assert response.status == "success"
    assert response.diagnosis.root_cause == "Service Spec Verified Clean"
    assert response.report is not None
    assert response.report.metadata.title != ""
    assert response.report.assessment.status == "HEALTHY"
