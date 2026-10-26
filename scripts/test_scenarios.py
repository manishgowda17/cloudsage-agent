"""Automated End-to-End Failure Scenario Test Script.

Validates the AI Kubernetes Troubleshooting Agent against all core failure
scenarios including Liveness and Readiness probe failures:
1. CrashLoopBackOff (Missing environment variable)
2. ImagePullBackOff (Invalid image tag)
3. OOMKilled (Low memory limits)
4. Service Selector Mismatch (Mismatched service and pod labels)
5. Liveness Probe Failure (Repeated container restarts due to failing health check)
6. Readiness Probe Failure (Running pod unready to accept network traffic)
"""

import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_path)

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def run_tests():
    print("=================================================================")
    print("[*] Running AI Kubernetes Agent Integration & Probe Tests")
    print("=================================================================\n")

    # 1. Health Endpoint Test
    print("[Test 1/8] Verifying GET /health ...")
    health_res = client.get("/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.status_code}"
    print(f"  [PASS] Service Health: {health_res.json()}")

    # 2. Clusters Endpoint Test
    print("\n[Test 2/8] Verifying GET /clusters (Local Kubeconfig Discovery) ...")
    clusters_res = client.get("/clusters")
    assert clusters_res.status_code == 200, f"Clusters check failed: {clusters_res.status_code}"
    clusters_data = clusters_res.json()
    print(f"  [PASS] Discovered {len(clusters_data.get('clusters', []))} local cluster context(s):")
    for c in clusters_data.get("clusters", []):
        print(f"    - {c['name']} ({c['context']}) -> {c['server']} [{c['status']}]")

    # 3. Scenario 1: CrashLoopBackOff
    print("\n[Test 3/8] Testing Scenario 1: CrashLoopBackOff (Missing ENV) ...")
    res1 = client.post("/investigate", json={"scenario": "crashloop"})
    assert res1.status_code == 200
    diag1 = res1.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag1['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag1['fix']}")
    print(f"  [PASS] kubectl Command: {diag1['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag1['confidence']}%")
    assert "DATABASE_URL" in diag1["root_cause"] or "env" in diag1["root_cause"].lower()

    # 4. Scenario 2: ImagePullBackOff
    print("\n[Test 4/8] Testing Scenario 2: ImagePullBackOff (Bad Image Tag) ...")
    res2 = client.post("/investigate", json={"scenario": "imagepull"})
    assert res2.status_code == 200
    diag2 = res2.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag2['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag2['fix']}")
    print(f"  [PASS] kubectl Command: {diag2['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag2['confidence']}%")
    assert "image" in diag2["root_cause"].lower() or "pull" in diag2["root_cause"].lower()

    # 5. Scenario 3: OOMKilled
    print("\n[Test 5/8] Testing Scenario 3: OOMKilled (Low Memory Limit) ...")
    res3 = client.post("/investigate", json={"scenario": "oom"})
    assert res3.status_code == 200
    diag3 = res3.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag3['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag3['fix']}")
    print(f"  [PASS] kubectl Command: {diag3['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag3['confidence']}%")
    assert "oom" in diag3["root_cause"].lower() or "memory" in diag3["root_cause"].lower()

    # 6. Scenario 4: Service Selector Mismatch
    print("\n[Test 6/8] Testing Scenario 4: Service Selector Mismatch ...")
    res4 = client.post("/investigate", json={"scenario": "selector"})
    assert res4.status_code == 200
    diag4 = res4.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag4['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag4['fix']}")
    print(f"  [PASS] kubectl Command: {diag4['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag4['confidence']}%")
    assert "selector" in diag4["root_cause"].lower() or "label" in diag4["root_cause"].lower()

    # 7. Scenario 5: Liveness Probe Failure
    print("\n[Test 7/8] Testing Scenario 5: Liveness Probe Failure ...")
    res5 = client.post("/investigate", json={"scenario": "liveness"})
    assert res5.status_code == 200
    diag5 = res5.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag5['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag5['fix']}")
    print(f"  [PASS] kubectl Command: {diag5['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag5['confidence']}%")
    assert "liveness" in diag5["root_cause"].lower()

    # 8. Scenario 6: Readiness Probe Failure
    print("\n[Test 8/8] Testing Scenario 6: Readiness Probe Failure ...")
    res6 = client.post("/investigate", json={"scenario": "readiness"})
    assert res6.status_code == 200
    diag6 = res6.json()["diagnosis"]
    print(f"  [PASS] Root Cause: {diag6['root_cause']}")
    print(f"  [PASS] Suggested Fix: {diag6['fix']}")
    print(f"  [PASS] kubectl Command: {diag6['kubectl_command']}")
    print(f"  [PASS] Confidence: {diag6['confidence']}%")
    assert "readiness" in diag6["root_cause"].lower()

    print("\n=================================================================")
    print("[SUCCESS] ALL 8 INTEGRATION, PROBE & SCENARIO TESTS PASSED!")
    print("=================================================================")


if __name__ == "__main__":
    run_tests()
