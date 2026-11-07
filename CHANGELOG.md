# Changelog

All notable changes to **ClusterSage** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-07

### Added
- **Multi-Source Incident Ingestion**:
  - Live Kubernetes cluster triage via kubeconfig client context.
  - Remote GitOps repository audit via GitHub URLs.
  - Local ZIP archive manifest parsing and extraction.
  - Direct raw YAML manifest and Helm Go template expression preprocessing.
- **Universal Investigation Reporting Framework**:
  - Normalized investigation report contract (`UniversalInvestigationReport`) across all input types.
  - Executive Summary Section, Overall Health Assessment Badge, Investigation Stats Bar.
  - Root Cause Analysis Card, Universal Issue Explorer, Remediation Panel, and Validation Evidence.
- **Google Gemini SRE Reasoning Engine**:
  - Low-latency structured root cause hypotheses formulation.
  - Deterministic regex secrets scrubber sanitizing AWS/GCP keys and Bearer tokens before prompting.
- **Hindsight Episodic Memory Integration**:
  - Multi-tenant isolated memory banking partitioned by authenticated operator ID.
  - **Retain**: Automatic persistence of verified post-mortem resolutions.
  - **Recall**: Semantic and BM25 incident search with `hs-rerank-1` cross-encoder reranking.
  - **Reflect**: Cross-incident failure pattern synthesis and defect trend extraction.
- **Interactive SRE Workspace**:
  - SRE Runbook Catalog with step-by-step verification and blast radius evaluation.
  - Collaborative Post-Mortem workflow for incident documentation.
  - Incident history tracking backed by InsForge Postgres database.
  - Cinematic brand reveal with smooth 60fps Framer Motion transitions.
  - Streamlined 5-section enterprise Settings (Profile, Account & Security, Notifications, Hindsight Memory, Data & Privacy).
- **Automated Testing & Containerization**:
  - Full backend pytest suite with 27 integration tests covering Hindsight, runbooks, and universal reporting.
  - Production-ready Docker Compose orchestration for Frontend, Backend, and Hindsight services.
