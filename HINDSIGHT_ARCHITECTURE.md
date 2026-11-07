# Hindsight Agent Memory Architecture

This document details the architecture, data flow, and security boundaries of the **Hindsight** agent memory integration within the **AI Kubernetes Troubleshooting Agent / PipelineGuard AI**.

---

## 1. High-Level Component Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend & Client Layer"]
        UI["Next.js Web Dashboard (Port 3000)"]
        HMP["Hindsight Memory Panel (Status, Recalled Cards, Reflect Synthesis)"]
        AuthM["InsForge Auth Modal (Email/Password & OTP)"]
    end

    subgraph SecurityLayer["Identity & Auth Layer"]
        InsForge["InsForge Authentication & Postgres DB"]
        JWTValidator["FastAPI JWT Bearer Validator"]
    end

    subgraph BackendLayer["FastAPI Orchestrator (Port 8000)"]
        Router["API Router (/api/v1/investigate, /api/v1/hindsight)"]
        InvSvc["Investigation Service (Pipeline Coordinator)"]
        HSvc["Hindsight Service (Async SDK Client Wrapper)"]
        Sanitizer["Secret & Credential Masking Engine"]
        PromptB["Senior SRE Prompt Builder"]
        DiagEng["Root Cause & Remediation Engine"]
        StaticAuditor["Static Manifest Inspector (YAML, ZIP, GitHub)"]
    end

    subgraph AIIntelligence["AI Reasoning Layer"]
        Gemini["Google Gemini 2.5 Flash API"]
        DeterministicSRE["Deterministic Kubernetes SRE Fallback Engine"]
    end

    subgraph MemoryEngine["Hindsight Long-Term Memory (Ports 8888, 9999)"]
        HindsightAPI["Hindsight REST / Async SDK Server (Port 8888)"]
        HindsightUI["Hindsight Control Plane (Port 9999)"]
        Pg0["Pg0 Embedded Vector Database & Graph Index"]
        Volume[("Named Docker Volume: hindsight-data")]
    end

    subgraph ClusterLayer["Kubernetes Target Layer (Optional)"]
        KubeCluster["Live Kubernetes Cluster / Kind / Kubeconfig"]
    end

    UI --> Router
    HMP --> Router
    AuthM --> InsForge
    Router --> JWTValidator
    JWTValidator --> InsForge
    JWTValidator --> InvSvc
    InvSvc --> StaticAuditor
    InvSvc --> KubeCluster
    InvSvc --> HSvc
    HSvc --> Sanitizer
    Sanitizer --> HindsightAPI
    HindsightAPI --> Pg0
    Pg0 --> Volume
    InvSvc --> PromptB
    PromptB --> Gemini
    Gemini -.->|401 or Rate Limit Fallback| DeterministicSRE
    InvSvc --> DiagEng
    DiagEng --> HSvc
    HindsightUI --> Pg0
```

---

## 2. Investigation Sequence Diagram (Recall → Gemini → Validate → Retain)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / SRE
    participant UI as Next.js Dashboard
    participant Backend as FastAPI Backend
    participant InsForge as InsForge Auth
    participant Hindsight as Hindsight Engine
    participant Gemini as Google Gemini API

    User->>UI: Submit Manifest (YAML / ZIP / GitHub / Cluster)
    UI->>Backend: POST /investigate (with Bearer JWT)
    Backend->>InsForge: Verify JWT Token
    InsForge-->>Backend: Token Valid (User ID: usr_123)
    
    rect rgb(235, 245, 255)
        note over Backend,Hindsight: Step 1: Recall Historical Fixes
        Backend->>Hindsight: arecall(bank_id="user_usr_123", query="readiness probe fix...")
        Hindsight-->>Backend: Return Recalled Memories (e.g. Previous /ready fix)
    end

    rect rgb(240, 255, 240)
        note over Backend,Gemini: Step 2: Gemini Diagnosis Augmented with Memory
        Backend->>Backend: Inject Recalled Memories into SRE Prompt Context
        Backend->>Gemini: generateContent(Evidence + Recalled Incident Context)
        Gemini-->>Backend: Root Cause Diagnosis & Suggested Patch
    end

    rect rgb(255, 250, 235)
        note over Backend: Step 3: Patch Verification & Validation
        Backend->>Backend: Verify Patch against Kubernetes Schema & Rules
    end

    rect rgb(245, 240, 255)
        note over Backend,Hindsight: Step 4: Retain Validated Fix
        Backend->>Backend: Mask Secrets (sanitize_sensitive_data)
        Backend->>Hindsight: aretain(bank_id="user_usr_123", status="VALIDATED_FIX", content=...)
        Hindsight-->>Backend: Stored (Operation ID: op_456)
    end

    Backend-->>UI: Diagnosis + Recalled Cards + Retain Confirmation
    UI-->>User: Render Cinematic SRE Report & Hindsight Memory Panel
```

---

## 3. Multi-Tenant User Isolation Architecture

Hindsight memory banks are isolated by deriving bank IDs deterministically from the user's verified InsForge identity:

```text
InsForge JWT Identity: usr_alice_9876
      │
      ▼ Sanitization: re.sub(r"[^a-zA-Z0-9_-]", "_", user_id)
Bank ID: user_usr_alice_9876
      │
      ▼ Bound to:
┌──────────────────────────────────────────────┐
│  Hindsight Bank: user_usr_alice_9876         │
│  - Alice's cluster incident resolutions      │
│  - Alice's validated microservice patches     │
│  - Alice's recurring pattern reflections     │
└──────────────────────────────────────────────┘

InsForge JWT Identity: usr_bob_5432
      │
      ▼ Sanitization: re.sub(r"[^a-zA-Z0-9_-]", "_", user_id)
Bank ID: user_usr_bob_5432
      │
      ▼ Bound to:
┌──────────────────────────────────────────────┐
│  Hindsight Bank: user_usr_bob_5432           │
│  - Bob's cluster incident resolutions        │
│  - Bob's validated microservice patches       │
│  - Bob's recurring pattern reflections       │
└──────────────────────────────────────────────┘
```

**Security Guarantees:**
1. A recall executed by User Bob queries `user_usr_bob_5432` only. It has zero visibility into User Alice's bank.
2. An unauthenticated request is rejected with `401 Unauthorized` before reaching Hindsight.
3. Secret values matching password, token, or bearer regexes are redacted before leaving backend memory.

---

## 4. Offline Fallback & Resilience Flowchart

```mermaid
flowchart TD
    Start["Investigation Triggered"] --> CheckHealth{"Hindsight /health Reachable?"}
    
    CheckHealth -- Yes --> RecallMemories["Execute arecall()"]
    CheckHealth -- No --> FallbackRecall["Log Warning: Memory engine offline<br/>Continue with empty memories []"]
    
    RecallMemories --> GeminiDiag["Invoke Gemini SRE Reasoning<br/>(Augmented with Recalled Context)"]
    FallbackRecall --> GeminiDiag
    
    GeminiDiag --> CheckGemini{"Gemini API Success?"}
    CheckGemini -- Yes --> ValidatePatch["Validate Remediation Patch"]
    CheckGemini -- No (401/429) --> SREFallback["Employ Senior SRE Heuristic Engine"]
    
    SREFallback --> ValidatePatch
    ValidatePatch --> CheckHindsightRetain{"Hindsight Online?"}
    
    CheckHindsightRetain -- Yes --> RetainFix["Execute aretain() to User Bank"]
    CheckHindsightRetain -- No --> SkipRetain["Skip Retain Gracefully<br/>Set retained=False"]
    
    RetainFix --> ReturnResponse["Return Investigation Response"]
    SkipRetain --> ReturnResponse
```
