# 01-prompt-project-setup.md

## Context

We are building an **AI Kubernetes Troubleshooting Agent**.

Architecture:

```text
Frontend
    ↓
FastAPI Backend (Orchestrator)
    ↓
Kubernetes Investigation Layer
    ↓
AI Kubernetes Agent
    ↓
LLM Reasoning (OpenRouter via InsForge)
    ↓
Root Cause + Suggested Fix
    ↓
Frontend Diagnosis
```

This is an **on-demand troubleshooting system**.

Example flow:

```text
User clicks "Investigate Cluster"
        ↓
API call
        ↓
Kubernetes investigation
        ↓
AI reasoning
        ↓
Diagnosis shown to user
```

We are **NOT building a Kubernetes controller/operator**.

---

## Goal

Set up the project foundation.

Create:

- FastAPI backend
- Next.js frontend
- Docker setup
- Environment variables
- Basic folder structure
- Health endpoint

Do NOT implement Kubernetes logic or AI yet.

---

## Tech Stack

Backend:

- FastAPI
- Python 3.12+
- Uvicorn
- Pydantic
- Loguru
- HTTPX

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- Axios
- React Query

Infrastructure:

- Docker
- Docker Compose
