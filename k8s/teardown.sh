#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Food Delivery System — Kubernetes Teardown Script
# Target: Minikube (Linux)
# Deletes all resources in reverse dependency order:
#   1. HorizontalPodAutoscalers
#   2. Ingresses
#   3. Monitoring stack (deployments, daemonsets, services, configmaps,
#      secrets, PVCs)
#   4. Application Services
#   5. Application Deployments
#   6. Database Services
#   7. Database Deployments
#   8. PersistentVolumeClaims
#   9. Secrets
#  10. ConfigMaps
#  11. Namespaces
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

# ── Utility: delete a DaemonSet (no namespace flag for kubectl 1.24+) ─
delete_daemonset() {
  local name="$1"
  info "Deleting DaemonSet/${name}..."
  kubectl delete daemonset "${name}" \
    --namespace "${NAMESPACE}" \
    --ignore-not-found 2>/dev/null && \
    info "DaemonSet/${name} deleted." || \
    warn "DaemonSet/${name} not found (already removed)."
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
  "grafana-ingress"
)

for ingress in "${INGRESS_NAMES[@]}"; do
  delete_resource "ingress" "${ingress}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 3: Monitoring stack (reverse of deploy order)
# ══════════════════════════════════════════════════════════════════════
info "Tearing down monitoring stack..."

# DaemonSets first (they run pods)
MONITORING_DAEMONSETS=(
  "promtail"
  "cadvisor"
)

for ds in "${MONITORING_DAEMONSETS[@]}"; do
  delete_daemonset "${ds}"
done

# Monitoring Deployments
MONITORING_DEPLOYMENTS=(
  "grafana"
  "loki"
  "prometheus"
)

for deployment in "${MONITORING_DEPLOYMENTS[@]}"; do
  delete_resource "deployment" "${deployment}"
done

# Monitoring Services
MONITORING_SERVICES=(
  "grafana-service"
  "loki-service"
  "prometheus-service"
)

for svc in "${MONITORING_SERVICES[@]}"; do
  delete_resource "service" "${svc}"
done

# Monitoring ConfigMaps, Secrets, PVCs
MONITORING_CONFIGMAPS=(
  "grafana-config"
  "loki-config"
  "prometheus-config"
  "promtail-config"
)

for cm in "${MONITORING_CONFIGMAPS[@]}"; do
  delete_resource "configmap" "${cm}"
done

MONITORING_SECRETS=(
  "grafana-secret"
)

for secret in "${MONITORING_SECRETS[@]}"; do
  delete_resource "secret" "${secret}"
done

MONITORING_PVCS=(
  "grafana-pvc"
  "loki-pvc"
  "prometheus-pvc"
)

for pvc in "${MONITORING_PVCS[@]}"; do
  delete_resource "pvc" "${pvc}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 4: Application Services
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
# Step 5: Application Deployments
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
# Step 6: Database Services
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
# Step 7: Database Deployments
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
# Step 8: PersistentVolumeClaims
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
# Step 9: Secrets
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
# Step 10: ConfigMaps
# ══════════════════════════════════════════════════════════════════════
info "Tearing down ConfigMaps..."

CONFIGMAP_NAMES=(
  "payment-service-config"
  "order-service-config"
  "restaurant-service-config"
  "user-service-config"
)

for cm in "${CONFIGMAP_NAMES[@]}"; do
  delete_resource "configmap" "${cm}"
done

# ══════════════════════════════════════════════════════════════════════
# Step 11: Namespaces (last — cascading delete for any stragglers)
# ══════════════════════════════════════════════════════════════════════
info "Tearing down namespaces..."

NAMESPACE_NAMES=(
  "prod"
  "test"
  "dev"
)

for ns in "${NAMESPACE_NAMES[@]}"; do
  warn "Deleting namespace ${ns} (this may take a moment)..."
  kubectl delete namespace "${ns}" --ignore-not-found 2>/dev/null && \
    info "Namespace ${ns} deleted." || \
    warn "Namespace ${ns} not found (already removed)."
done

# ── Final status ──────────────────────────────────────────────────────
echo ""
info "=============================================="
info "  Teardown complete!"
info "=============================================="
