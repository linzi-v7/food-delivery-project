#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Food Delivery System — Kubernetes Deploy Script
# Target: Minikube (Linux)
# Applies all manifests in correct dependency order:
#   1. Namespaces
#   2. Secrets + ConfigMaps
#   3. PersistentVolumeClaims
#   4. Database Deployments + Services
#   5. Wait for DB readiness
#   6. Application Deployments + Services
#   7. Ingress
#   8. HorizontalPodAutoscalers
#   9. Monitoring (Prometheus, Grafana, Loki, Promtail, cAdvisor)
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="prod"
TIMEOUT_SECONDS=120

# ── Colour helpers ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Utility: kubectl apply with pattern ───────────────────────────────
apply_dir() {
  local dir="$1"
  local label="$2"
  info "Applying ${label}..."
  kubectl apply -f "${SCRIPT_DIR}/${dir}/" || {
    error "Failed to apply ${label}"
    return 1
  }
  info "${label} applied successfully."
}

# ── Step 1: Namespaces ────────────────────────────────────────────────
apply_dir "namespaces" "namespaces"

# ── Step 2: Secrets + ConfigMaps ──────────────────────────────────────
apply_dir "secrets" "secrets"
apply_dir "configmaps" "configmaps"

# ── Step 3: PersistentVolumeClaims ────────────────────────────────────
apply_dir "persistent-volumes" "persistent volume claims"

# ── Step 4: Database Deployments + Services ───────────────────────────
info "Deploying databases..."
kubectl apply -f "${SCRIPT_DIR}/deployments/user-service-db-deployment.yaml"
kubectl apply -f "${SCRIPT_DIR}/deployments/restaurant-service-db-deployment.yaml"
kubectl apply -f "${SCRIPT_DIR}/deployments/order-service-db-deployment.yaml"
kubectl apply -f "${SCRIPT_DIR}/deployments/payment-service-db-deployment.yaml"

kubectl apply -f "${SCRIPT_DIR}/services/user-db-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/services/restaurant-db-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/services/order-db-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/services/payment-db-service.yaml"

# ── Step 5: Wait for database readiness ───────────────────────────────
info "Waiting for database pods to become ready (timeout: ${TIMEOUT_SECONDS}s)..."

DB_DEPLOYMENTS=(
  "user-service-db"
  "restaurant-service-db"
  "order-service-db"
  "payment-service-db"
)

for db in "${DB_DEPLOYMENTS[@]}"; do
  info "Waiting for ${db}..."
  if kubectl rollout status "deployment/${db}" \
       --namespace "${NAMESPACE}" \
       --timeout "${TIMEOUT_SECONDS}s"; then
    info "${db} is ready."
  else
    error "${db} failed to become ready within ${TIMEOUT_SECONDS}s."
    exit 1
  fi
done

info "All databases are ready."

# ── Step 6: Application Deployments + Services ────────────────────────
info "Deploying application services..."

APP_DEPLOYMENTS=(
  "user-service"
  "restaurant-service"
  "order-service"
  "payment-service"
  "frontend"
  "api-gateway"
)

for deployment in "${APP_DEPLOYMENTS[@]}"; do
  kubectl apply -f "${SCRIPT_DIR}/deployments/${deployment}-deployment.yaml"
done

APP_SERVICES=(
  "user-service"
  "restaurant-service"
  "order-service"
  "payment-service"
  "frontend"
  "api-gateway"
)

for svc in "${APP_SERVICES[@]}"; do
  kubectl apply -f "${SCRIPT_DIR}/services/${svc}-service.yaml"
done

# Wait for application deployments to be ready
for deployment in "${APP_DEPLOYMENTS[@]}"; do
  info "Waiting for ${deployment}..."
  kubectl rollout status "deployment/${deployment}" \
    --namespace "${NAMESPACE}" \
    --timeout "${TIMEOUT_SECONDS}s" || {
    warn "${deployment} did not become ready within ${TIMEOUT_SECONDS}s. Check logs for details."
  }
done

# ── Step 7: Ingress ───────────────────────────────────────────────────
apply_dir "ingress" "ingress"

# ── Step 8: HorizontalPodAutoscalers ──────────────────────────────────
apply_dir "hpa" "horizontal pod autoscalers"

# ── Step 9: Monitoring Stack ──────────────────────────────────────────
info "Deploying monitoring stack..."

apply_dir "monitoring" "monitoring manifests"

MONITORING_DEPLOYMENTS=(
  "prometheus"
  "grafana"
  "loki"
)

for deployment in "${MONITORING_DEPLOYMENTS[@]}"; do
  info "Waiting for ${deployment}..."
  kubectl rollout status "deployment/${deployment}" \
    --namespace "${NAMESPACE}" \
    --timeout "${TIMEOUT_SECONDS}s" || {
    warn "${deployment} did not become ready within ${TIMEOUT_SECONDS}s."
  }
done

# Wait for DaemonSet pods
info "Waiting for promtail and cadvisor daemonsets..."
kubectl wait --for=condition=Ready pod \
  -l "app in (promtail,cadvisor)" \
  --namespace "${NAMESPACE}" \
  --timeout "${TIMEOUT_SECONDS}s" 2>/dev/null || {
  warn "Some DaemonSet pods not ready yet. Check with kubectl get pods -l 'app in (promtail,cadvisor)' -n ${NAMESPACE}"
}

info "Monitoring stack deployed."

# ── Final status ──────────────────────────────────────────────────────
echo ""
info "=============================================="
info "  Deployment complete!"
info "=============================================="
echo ""
info "Namespaces:"
kubectl get namespaces dev test prod 2>/dev/null || true
echo ""
info "Pods (${NAMESPACE}):"
kubectl get pods -n "${NAMESPACE}"
echo ""
info "Services (${NAMESPACE}):"
kubectl get svc -n "${NAMESPACE}"
echo ""
info "Ingress (${NAMESPACE}):"
kubectl get ingress -n "${NAMESPACE}"
echo ""
info "HPA (${NAMESPACE}):"
kubectl get hpa -n "${NAMESPACE}"
echo ""
info "Monitoring pods (${NAMESPACE}):"
kubectl get pods -n "${NAMESPACE}" -l "component=monitoring"
echo ""
info "Grafana accessible at:  http://fooddelivery.local/grafana"
echo ""
info "Add to /etc/hosts:  127.0.0.1  fooddelivery.local"
info "Then visit:  http://fooddelivery.local"
