import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.investigation import InvestigationService
from app.services.hindsight_service import hindsight_service

async def run_hackathon_demo():
    user = "hackathon-judge-demo"
    print("======================================================================")
    print("HACKATHON DEMO STAGE 1: Investigation 1 - Defective Readiness Probe")
    print("======================================================================")
    yaml_1 = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-service
  template:
    metadata:
      labels:
        app: payments-service
    spec:
      containers:
      - name: api
        image: payments:v1.2.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
"""
    res1 = await InvestigationService.run_investigation(
        user_id=user,
        source_type="yaml",
        manifest_content=yaml_1,
        manifest_filename="payments-deployment.yaml"
    )
    print("Status:", res1["status"])
    print("Diagnosis Root Cause:", res1["diagnosis"]["root_cause"])
    print("Diagnosis Fix:", res1["diagnosis"]["fix"][:120] + "...")
    print("Hindsight Status:", res1["hindsight"]["status"])
    print("Hindsight Bank ID:", res1["hindsight"]["bank_id"])
    print("Hindsight Retained:", res1["hindsight"]["retained"])
    print("Hindsight Recalled Count (Initial):", res1["hindsight"]["recalled_count"])

    print("\n======================================================================")
    print("HACKATHON DEMO STAGE 2: Investigation 2 - Similar Microservice Defect")
    print("======================================================================")
    yaml_2 = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-service
  template:
    metadata:
      labels:
        app: orders-service
    spec:
      containers:
      - name: api
        image: orders:v1.0.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
"""
    res2 = await InvestigationService.run_investigation(
        user_id=user,
        source_type="yaml",
        manifest_content=yaml_2,
        manifest_filename="orders-deployment.yaml"
    )
    print("Status:", res2["status"])
    print("Diagnosis Root Cause:", res2["diagnosis"]["root_cause"])
    print("Hindsight Recalled Count (Second):", res2["hindsight"]["recalled_count"])
    if res2["hindsight"]["recalled_memories"]:
        print("First Recalled Memory:", res2["hindsight"]["recalled_memories"][0]["text"][:140])
    print("Memory Influence Summary:", res2["hindsight"]["influence_summary"])
    print("Hindsight Retained New Incident:", res2["hindsight"]["retained"])

    print("\n======================================================================")
    print("HACKATHON DEMO STAGE 3: Cross-Incident Synthesis with REFLECT")
    print("======================================================================\n")
    reflect_res = await hindsight_service.reflect_patterns(
        user_id=user,
        query="Analyze all stored Kubernetes deployments and identify common readiness probe misconfiguration patterns."
    )
    print("Reflect Available:", reflect_res["available"])
    print("Reflect Bank ID:", reflect_res["bank_id"])
    print("Synthesized Pattern Analysis:\n", reflect_res["reflection"])
    print("\n======================================================================")
    print("HACKATHON DEMO COMPLETED SUCCESSFULLY!")
    print("======================================================================")

if __name__ == "__main__":
    asyncio.run(run_hackathon_demo())
