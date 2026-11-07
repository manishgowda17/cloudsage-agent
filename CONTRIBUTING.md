# Contributing to ClusterSage

Thank you for your interest in contributing to **ClusterSage**! As an open-source, autonomous infrastructure intelligence platform, we welcome contributions from DevOps engineers, SREs, frontend developers, and AI researchers.

---

## 1. Development Setup

### Prerequisites
- Docker 24.0+ & Docker Compose v2.20+
- Node.js 20 LTS & npm 10+
- Python 3.12+ (or 3.14 compatible)
- `git`
- (Optional) `kubectl` configured with access to a local Kind/Minikube cluster.

### Step-by-Step Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/ClusterSage.git
   cd ClusterSage
   ```
2. Initialize local environment:
   ```bash
   cp .env.example .env
   ```
3. Configure your `GEMINI_API_KEY` in `.env`.
4. Start the development environment:
   ```bash
   docker compose up -d
   ```
5. Verify health:
   ```bash
   ./scripts/health-check.sh
   ```

---

## 2. Branching Strategy

We follow a structured Git branching workflow:
- `main`: Production-ready, stable codebase. Direct commits to `main` are disabled.
- `feature/<feature-name>`: New capabilities or functional enhancements.
- `fix/<bug-description>`: Bug and defect fixes.
- `docs/<doc-title>`: Documentation updates and architectural notes.

---

## 3. Coding Conventions

### Python Backend
- Code formatting follows PEP 8 standards.
- Type annotations are required on all FastAPI router functions and service methods.
- Pydantic models in `app/models/schemas.py` enforce request/response contract validation.
- All external API calls (Gemini, Hindsight, Kubernetes) must feature asynchronous error handling and fallback resilience.

### TypeScript / Next.js Frontend
- Use strict TypeScript typing without arbitrary `any` wherever possible.
- UI components must adhere to the design system (Tailwind CSS, graphite/navy surfaces, cyan/indigo luminous accents).
- Motion effects must use Framer Motion and respect `prefers-reduced-motion`.

---

## 4. Testing Expectations

Before opening a pull request, ensure all test suites pass locally:

```bash
# 1. Run backend pytest suite
cd backend
pytest tests/ -v

# 2. Run frontend production build
cd ../frontend
npm run build
```

---

## 5. Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/my-new-feature
   ```
2. Open a Pull Request against `main`.
3. Complete the PR template description and link any related issues.
4. Ensure CI automated checks pass.
5. Address code review feedback promptly.
