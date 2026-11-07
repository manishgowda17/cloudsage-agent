# ==============================================================================
# CLUSTERSAGE — Enterprise Automation Makefile
# ==============================================================================

.PHONY: help setup build up down restart logs test lint clean health

help: ## Display available commands
	@echo "=================================================="
	@echo "  CLUSTERSAGE — Available Makefile Targets        "
	@echo "=================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Initialize local environment and copy .env.example if missing
	@bash ./scripts/setup.sh

build: ## Build Docker container images
	@docker compose build

up: ## Start all services in the background
	@docker compose up -d

down: ## Stop all active containers (preserves persistent volumes)
	@docker compose down

restart: ## Restart all containers
	@docker compose restart

logs: ## View real-time log output across all services
	@docker compose logs -f

health: ## Check the status of all active services
	@bash ./scripts/health-check.sh

test: test-backend test-frontend ## Run all test suites

test-backend: ## Run backend pytest suite
	@cd backend && pytest tests/ -v

test-frontend: ## Run frontend production build check
	@cd frontend && npm run build

lint: ## Lint frontend code
	@cd frontend && npm run lint

clean: ## Remove temporary python cache and next build artifacts
	@rm -rf backend/__pycache__ backend/.pytest_cache frontend/.next
	@echo "[✓] Cleaned temporary build caches."
