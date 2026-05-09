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

.PHONY: dev dev-down test test-down prod prod-down all all-down k8s-deploy k8s-teardown k8s-status k8s-logs k8s-prereqs k8s-build-images k8s-load-images k8s-rebuild

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
#
# Workflow:
#   1. make k8s-prereqs          (one-time: verify minikube, enable addons)
#   2. make k8s-deploy           (build images → load into minikube → deploy)
#   3. make k8s-rebuild <svc>    (rebuild a single service, e.g. make k8s-rebuild frontend)
#
# ═════════════════════════════════════════════════════════════════════

K8S_IMAGES := user-service restaurant-service order-service payment-service frontend api-gateway

k8s-prereqs:
	@echo "==> Checking prerequisites..."
	@minikube status 2>/dev/null || { \
		echo "  ERROR: Minikube is not running."; \
		echo "  Start it with: minikube start"; \
		exit 1; \
	}
	@echo "  Minikube is running."
	@minikube addons enable ingress 2>/dev/null || true
	@echo "==> Prerequisites OK."

k8s-build-images:
	@echo "==> Building Docker images..."
	@docker build -t fooddelivery/user-service:latest     services/user-service
	@docker build -t fooddelivery/restaurant-service:latest services/restaurant-service
	@docker build -t fooddelivery/order-service:latest    services/order-service
	@docker build -t fooddelivery/payment-service:latest  services/payment-service
	@	docker build -t fooddelivery/frontend:latest --build-arg VITE_API_URL=/api frontend
	@docker build -t fooddelivery/api-gateway:latest      gateway
	@echo "==> All images built."

k8s-load-images:
	@echo "==> Loading images into Minikube..."
	@for img in $(K8S_IMAGES); do \
		echo "  Loading fooddelivery/$$img:latest"; \
		minikube image load "fooddelivery/$$img:latest"; \
	done
	@echo "==> All images loaded."

k8s-deploy: k8s-prereqs k8s-build-images k8s-load-images
	@echo "==> Deploying to Kubernetes (Minikube)..."
	bash k8s/deploy.sh

k8s-rebuild:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Usage: make k8s-rebuild <service>"; \
		echo "  e.g. make k8s-rebuild frontend"; \
		echo "  Services: $(K8S_IMAGES)"; \
		exit 1; \
	fi
	@SVC="$(filter-out $@,$(MAKECMDGOALS))"; \
	CTX="$$SVC"; \
	case "$$SVC" in \
		user-service)       CTX="services/user-service" ;; \
		restaurant-service) CTX="services/restaurant-service" ;; \
		order-service)      CTX="services/order-service" ;; \
		payment-service)    CTX="services/payment-service" ;; \
		frontend)           CTX="frontend" ;; \
		api-gateway)        CTX="gateway" ;; \
		*) echo "Unknown service: $$SVC"; echo "Known: $(K8S_IMAGES)"; exit 1 ;; \
	esac; \
	echo "==> Rebuilding fooddelivery/$$SVC:latest from ./$$CTX"; \
	docker build -t "fooddelivery/$$SVC:latest" "$$CTX" && \
	echo "  Reloading into Minikube..." && \
	minikube image load "fooddelivery/$$SVC:latest" && \
	echo "  Restarting deployment..." && \
	kubectl rollout restart "deployment/$$SVC" -n prod && \
	kubectl rollout status "deployment/$$SVC" -n prod --timeout=120s && \
	echo "==> $$SVC rebuilt and deployed."

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
