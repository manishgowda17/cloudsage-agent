"""Automated End-to-End Test for Static Manifest, GitHub, and ZIP Analysis.

Verifies:
1. Static analysis works WITHOUT requiring a Kubernetes cluster.
2. YAML with deliberate errors (syntax, selector mismatch, negative delay, invalid unit '500Mb').
3. Valid YAML manifest returns 'No issues detected' and 0 error findings.
4. Inaccessible/private GitHub repo returns clear repository 404 error, NOT cluster connection error.
5. Public GitHub repo fetches manifests and performs static analysis.
6. In-memory ZIP archive parses manifests and identifies findings.
"""

import sys
import os
import io
import zipfile
import base64

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_path)

from app.main import app
from app.core.auth import get_current_user
from fastapi.testclient import TestClient

client = TestClient(app)

# Authorize requests
app.dependency_overrides[get_current_user] = lambda: {
    "id": "11111111-2222-3333-4444-555555555555",
    "email": "engineer@company.com",
}


def test_static_analysis():
    print("=================================================================")
    print("[*] Running Static Manifest, GitHub & ZIP Analysis Tests")
    print("=================================================================\n")

    # -------------------------------------------------------------
    # Test 1: YAML with Deliberate Misconfigurations
    # -------------------------------------------------------------
    print("[Test 1/5] Testing YAML with deliberate misconfigurations ...")
    flawed_yaml = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: broken-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: mismatched-worker
    spec:
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 99999
        livenessProbe:
          httpGet:
            path: invalid-path-without-slash
            port: 8080
          initialDelaySeconds: -5
        resources:
          limits:
            memory: 500Mb
"""
    res1 = client.post("/investigate", json={
        "source_type": "yaml",
        "manifest_content": flawed_yaml,
        "manifest_filename": "flawed-deployment.yaml",
    })
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
    data1 = res1.json()
    diag1 = data1["diagnosis"]
    findings1 = diag1.get("findings") or []

    print(f"  [PASS] Root Cause: {diag1['root_cause']}")
    print(f"  [PASS] Total Findings Detected: {len(findings1)}")
    for f in findings1:
        print(f"    - [{f['severity']}] {f['resource']} ({f.get('field')}): {f['explanation']} (Line: {f.get('line')})")

    # Verifications
    assert "Unable to connect to Kubernetes cluster" not in diag1["root_cause"], "Error: Unexpected cluster connectivity error!"
    assert len(findings1) >= 4, f"Expected at least 4 findings, got {len(findings1)}"

    # Check specific defects detected
    fields_detected = [f.get("field", "") for f in findings1]
    explanations = " ".join([f.get("explanation", "") for f in findings1])

    assert any("selector" in f.lower() for f in fields_detected), "Selector mismatch was not detected"
    assert any("initialdelayseconds" in f.lower() for f in fields_detected), "Negative initialDelaySeconds was not detected"
    assert "500Mb" in explanations or any("memory" in f.lower() for f in fields_detected), "Invalid memory unit Mb was not detected"
    assert any("port" in f.lower() for f in fields_detected), "Invalid containerPort 99999 was not detected"

    # -------------------------------------------------------------
    # Test 2: Valid Kubernetes YAML Manifest
    # -------------------------------------------------------------
    print("\n[Test 2/5] Testing Valid Kubernetes YAML Manifest ...")
    valid_yaml = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: valid-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: valid-service
  template:
    metadata:
      labels:
        app: valid-service
    spec:
      containers:
      - name: web
        image: nginx:1.25.3-alpine
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          limits:
            memory: 256Mi
          requests:
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: valid-service
  namespace: default
spec:
  selector:
    app: valid-service
  ports:
  - port: 80
    targetPort: 80
"""
    res2 = client.post("/investigate", json={
        "source_type": "yaml",
        "manifest_content": valid_yaml,
        "manifest_filename": "valid-service.yaml",
    })
    assert res2.status_code == 200
    data2 = res2.json()
    diag2 = data2["diagnosis"]
    findings2 = diag2.get("findings") or []

    print(f"  [PASS] Root Cause: {diag2['root_cause']}")
    print(f"  [PASS] Findings Count: {len(findings2)}")
    assert "No issues detected" in diag2["root_cause"], f"Expected 'No issues detected', got: {diag2['root_cause']}"
    assert len(findings2) == 0, f"Expected 0 findings for valid manifest, got {len(findings2)}"

    # -------------------------------------------------------------
    # Test 3: Inaccessible / Nonexistent GitHub Repository
    # -------------------------------------------------------------
    print("\n[Test 3/5] Testing Inaccessible GitHub Repository ...")
    res3 = client.post("/investigate", json={
        "source_type": "github",
        "github_url": "https://github.com/nonexistent-org-123456/fake-private-repo-xyz",
    })
    assert res3.status_code == 200
    data3 = res3.json()
    diag3 = data3["diagnosis"]
    print(f"  [PASS] Root Cause: {diag3['root_cause']}")
    print(f"  [PASS] Explanation: {diag3['explanation']}")
    assert "Unable to connect to Kubernetes cluster" not in diag3["root_cause"], "Error: Invented cluster connectivity error on GitHub URL!"
    assert "404" in diag3["explanation"] or "private" in diag3["explanation"].lower() or "not found" in diag3["explanation"].lower() or "retrieval failed" in diag3["root_cause"].lower()

    # -------------------------------------------------------------
    # Test 4: Public GitHub Repository Ingest
    # -------------------------------------------------------------
    print("\n[Test 4/5] Testing Public GitHub Repository (kubernetes/examples) ...")
    res4 = client.post("/investigate", json={
        "source_type": "github",
        "github_url": "https://github.com/kubernetes/examples",
    })
    assert res4.status_code == 200
    data4 = res4.json()
    diag4 = data4["diagnosis"]
    findings4 = diag4.get("findings") or []
    print(f"  [PASS] Root Cause: {diag4['root_cause'][:90]}...")
    print(f"  [PASS] Total Manifest Findings: {len(findings4)}")
    assert "Unable to connect to Kubernetes cluster" not in diag4["root_cause"]
    assert len(findings4) > 0, "Expected findings from scanning public repo manifests"

    # -------------------------------------------------------------
    # Test 5: ZIP Archive Manifest Extraction & Audit
    # -------------------------------------------------------------
    print("\n[Test 5/5] Testing In-Memory ZIP Archive Extraction & Audit ...")
    # Build in-memory zip
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("deployments/app.yaml", """apiVersion: apps/v1
kind: Deployment
metadata:
  name: zip-worker
  namespace: prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: python:3.11
        resources:
          limits:
            memory: 128Mb
""")
        zf.writestr("services/svc.yaml", """apiVersion: v1
kind: Service
metadata:
  name: zip-service
  namespace: prod
spec:
  selector:
    app: wrong-worker-label
  ports:
  - port: 80
    targetPort: 8080
""")

    zip_b64 = base64.b64encode(zip_buf.getvalue()).decode("utf-8")
    res5 = client.post("/investigate", json={
        "source_type": "zip",
        "zip_data_base64": zip_b64,
        "manifest_filename": "archive.zip",
    })
    assert res5.status_code == 200
    data5 = res5.json()
    diag5 = data5["diagnosis"]
    findings5 = diag5.get("findings") or []
    print(f"  [PASS] Root Cause: {diag5['root_cause']}")
    print(f"  [PASS] Findings Count: {len(findings5)}")
    for f in findings5:
        print(f"    - [{f['severity']}] {f['resource']}: {f['explanation']} (file: {f.get('file')})")

    assert "Unable to connect to Kubernetes cluster" not in diag5["root_cause"]
    assert len(findings5) >= 2
    # Verify file paths preserved
    files_in_findings = [f.get("file", "") for f in findings5]
    assert any("deployments/app.yaml" in f for f in files_in_findings)
    assert any("services/svc.yaml" in f for f in files_in_findings)

    print("\n=================================================================")
    print("[SUCCESS] ALL 5 STATIC MANIFEST ANALYSIS TESTS PASSED!")
    print("=================================================================")


if __name__ == "__main__":
    test_static_analysis()
