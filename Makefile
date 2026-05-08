# =============================================================================
# Food Delivery System — Makefile
# =============================================================================
# Each environment uses a unique Compose project name (-p) and network so all
# 3 stacks can run simultaneously on one machine without port/net conflicts.
#
#   make dev        Spin up development stack (gateway :8080)
#   make test       Spin up testing stack     (gateway :9080)
#   make prod       Spin up production stack  (gateway :80)
#   make all        Spin up ALL 3 stacks simultaneously
#
#   make dev-down   Tear down dev  (removes volumes — data is disposable)
#   make test-down  Tear down test (removes volumes — data is disposable)
#   make prod-down  Tear down prod (KEEPS volumes — data is persistent)
#   make all-down   Tear down all 3 stacks
# =============================================================================

.PHONY: dev dev-down test test-down prod prod-down all all-down k8s-deploy k8s-teardown k8s-status k8s-logs

COMPOSE_BASE  := -f docker-compose.yml

# ═════════════════════════════════════════════════════════════════════
# Development
# ═════════════════════════════════════════════════════════════════════
dev:
	docker compose $(COMPOSE_BASE) -f docker-compose.dev.yml \
		--env-file .env.dev -p fooddelivery-dev up --build -d

dev-down:
	docker compose $(COMPOSE_BASE) -f docker-compose.dev.yml \
		--env-file .env.dev -p fooddelivery-dev down --volumes --remove-orphans

# ═════════════════════════════════════════════════════════════════════
# Testing
# ═════════════════════════════════════════════════════════════════════
test:
	docker compose $(COMPOSE_BASE) -f docker-compose.test.yml \
		--env-file .env.test -p fooddelivery-test up --build -d

test-down:
	docker compose $(COMPOSE_BASE) -f docker-compose.test.yml \
		--env-file .env.test -p fooddelivery-test down --volumes --remove-orphans

# ═════════════════════════════════════════════════════════════════════
# Production
# ═════════════════════════════════════════════════════════════════════
prod:
	docker compose $(COMPOSE_BASE) -f docker-compose.prod.yml \
		--env-file .env.prod -p fooddelivery-prod up --build -d

prod-down:
	docker compose $(COMPOSE_BASE) -f docker-compose.prod.yml \
		--env-file .env.prod -p fooddelivery-prod down --remove-orphans

# ═════════════════════════════════════════════════════════════════════
# All environments (dev + test + prod simultaneously)
# ═════════════════════════════════════════════════════════════════════
all: dev test prod
	@echo "==> All 3 environments are up:"
	@echo "    dev  → http://localhost:8080"
	@echo "    test → http://localhost:9080"
	@echo "    prod → http://localhost:80"

all-down: dev-down test-down prod-down
	@echo "==> All 3 environments are down."

# ═════════════════════════════════════════════════════════════════════
# Kubernetes
# ═════════════════════════════════════════════════════════════════════
k8s-deploy:
	@echo "==> Deploying to Kubernetes (Minikube)..."
	bash k8s/deploy.sh

k8s-teardown:
	@echo "==> Tearing down Kubernetes resources..."
	bash k8s/teardown.sh

k8s-status:
	kubectl get pods -n prod

k8s-logs:
	@echo "==> Pods in prod namespace:"
	kubectl get pods -n prod
	@echo ""
	@echo "==> To view logs for a specific pod, run:"
	@echo "    kubectl logs -n prod <pod-name>"
	@echo "    kubectl logs -n prod <pod-name> -f     (follow)"
