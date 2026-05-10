#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Food Delivery System — Kubernetes Teardown Script
# Target: Minikube (Linux)
# Deletes all resources in reverse dependency order:
#   1. HorizontalPodAutoscalers
#   2. Ingresses
#   3. Application Services
#   4. Application Deployments
#   5. Database Services
#   6. Database Deployments
#   7. PersistentVolumeClaims
#   8. Secrets
#   9. ConfigMaps
#  10. Namespaces
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="prod"

# ── Colour helpers ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Utility: delete a resource by kind/name with --ignore-not-found ───
delete_resource() {
  local kind="$1"
  local name="$2"
  info "Deleting ${kind}/${name}..."
  kubectl delete "${kind}" "${name}" \
    --namespace "${NAMESPACE}" \
    --ignore-not-found 2>/dev/null && \
    info "${kind}/${name} deleted." || \
    warn "${kind}/${name} not found (already removed)."
}

# ══════════════════════════════════════════════════════════════════════
# Step 1: HorizontalPodAutoscalers (depend on Deployments)
# ══════════════════════════════════════════════════════════════════════
info "Tearing down HorizontalPodAutoscalers..."

HPA_NAMES=(
  "user-service-hpa"
  "order-service-hpa"
  "payment-service-hpa"
)

for hpa in "${HPA_NAMES[@]}"; do
  delete_resource "hpa" "${hpa}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 2: Ingresses
# ══════════════════════════════════════════════════════════════════════
info "Tearing down Ingresses..."

INGRESS_NAMES=(
  "api-gateway-ingress"
)

for ingress in "${INGRESS_NAMES[@]}"; do
  delete_resource "ingress" "${ingress}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 3: Application Services
# ══════════════════════════════════════════════════════════════════════
info "Tearing down application services..."

APP_SERVICE_NAMES=(
  "api-gateway"
  "frontend"
  "payment-service"
  "order-service"
  "restaurant-service"
  "user-service"
)

for svc in "${APP_SERVICE_NAMES[@]}"; do
  delete_resource "service" "${svc}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 4: Application Deployments
# ══════════════════════════════════════════════════════════════════════
info "Tearing down application deployments..."

APP_DEPLOYMENT_NAMES=(
  "api-gateway"
  "frontend"
  "payment-service"
  "order-service"
  "restaurant-service"
  "user-service"
)

for deployment in "${APP_DEPLOYMENT_NAMES[@]}"; do
  delete_resource "deployment" "${deployment}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 5: Database Services
# ══════════════════════════════════════════════════════════════════════
info "Tearing down database services..."

DB_SERVICE_NAMES=(
  "payment-db-service"
  "order-db-service"
  "restaurant-db-service"
  "user-db-service"
)

for svc in "${DB_SERVICE_NAMES[@]}"; do
  delete_resource "service" "${svc}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 6: Database Deployments
# ══════════════════════════════════════════════════════════════════════
info "Tearing down database deployments..."

DB_DEPLOYMENT_NAMES=(
  "payment-service-db"
  "order-service-db"
  "restaurant-service-db"
  "user-service-db"
)

for deployment in "${DB_DEPLOYMENT_NAMES[@]}"; do
  delete_resource "deployment" "${deployment}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 7: PersistentVolumeClaims
# ══════════════════════════════════════════════════════════════════════
info "Tearing down PersistentVolumeClaims..."

PVC_NAMES=(
  "payment-db-pvc"
  "order-db-pvc"
  "restaurant-db-pvc"
  "user-db-pvc"
)

for pvc in "${PVC_NAMES[@]}"; do
  delete_resource "pvc" "${pvc}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 8: Secrets
# ══════════════════════════════════════════════════════════════════════
info "Tearing down secrets..."

SECRET_NAMES=(
  "payment-service-secret"
  "order-service-secret"
  "restaurant-service-secret"
  "user-service-secret"
)

for secret in "${SECRET_NAMES[@]}"; do
  delete_resource "secret" "${secret}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 9: ConfigMaps
# ══════════════════════════════════════════════════════════════════════
info "Tearing down ConfigMaps..."

CONFIGMAP_NAMES=(
  "payment-service-configmap"
  "order-service-configmap"
  "restaurant-service-configmap"
  "user-service-configmap"
)

for cm in "${CONFIGMAP_NAMES[@]}"; do
  delete_resource "configmap" "${cm}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 10: Namespace (last — cascading delete for any stragglers)
# ══════════════════════════════════════════════════════════════════════
info "Tearing down namespace..."

warn "Deleting namespace ${NAMESPACE} (this may take a moment)..."
kubectl delete namespace "${NAMESPACE}" --ignore-not-found 2>/dev/null && \
  info "Namespace ${NAMESPACE} deleted." || \
  warn "Namespace ${NAMESPACE} not found (already removed)."

# ── Final status ──────────────────────────────────────────────────────
echo ""
info "=============================================="
info "  Teardown complete!"
info "=============================================="
