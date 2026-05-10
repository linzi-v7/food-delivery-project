#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Generate K8s Secrets from root .env
#
# Reads project-root .env and produces real Secret manifests in
# .tmp/k8s-secrets/ — a gitignored directory. Template secrets in
# k8s/secrets/ stay in VCS with placeholders and serve as docs.
#
# Usage:  bash k8s/scripts/generate-secrets.sh
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
OUTPUT_DIR="$PROJECT_ROOT/.tmp/k8s-secrets"

# ── Colour helpers ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Check .env exists ─────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  error ".env not found at project root ($ENV_FILE)"
  error "Copy .env.example to .env and fill in real values:"
  error "  cp .env.example .env"
  exit 1
fi

# ── Source .env ───────────────────────────────────────────────────────
info "Loading environment from $ENV_FILE"
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# ── Validate required variables ───────────────────────────────────────
MISSING=()
for var in POSTGRES_USER POSTGRES_PASSWORD JWT_SECRET; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  error "Missing required variables in .env: ${MISSING[*]}"
  error "Check .env.example for the expected format."
  exit 1
fi

# ── Warn about placeholder values ─────────────────────────────────────
if [[ "$JWT_SECRET" == *"CHANGE_ME"* ]] || [[ "$JWT_SECRET" == *"do_not_use"* ]]; then
  warn "JWT_SECRET appears to be a placeholder. Generate a strong random value."
fi
if [[ "$POSTGRES_PASSWORD" == *"CHANGE_ME"* ]] || [[ "$POSTGRES_PASSWORD" == "postgres" ]]; then
  warn "POSTGRES_PASSWORD is weak or a placeholder. Use a strong password in production."
fi

# ── Prepare output directory ──────────────────────────────────────────
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
info "Generating secrets → $OUTPUT_DIR"

# ── Service definitions: name  db_host               db_name             needs_jwt ──
SERVICES=(
  "user-service        user-db-service         user_service         true"
  "restaurant-service  restaurant-db-service   restaurant_service   true"
  "order-service       order-db-service        order_service        true"
  "payment-service     payment-db-service      payment_service      false"
)

for row in "${SERVICES[@]}"; do
  read -r svc db_host db_name needs_jwt <<< "$row"

  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${db_host}:5432/${db_name}"

  cat > "$OUTPUT_DIR/${svc}-secret.yaml" <<YAML
# ── Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ") — DO NOT COMMIT ──
apiVersion: v1
kind: Secret
metadata:
  name: ${svc}-secret
  namespace: prod
  labels:
    app: ${svc}
type: Opaque
stringData:
  DB_USER: "${POSTGRES_USER}"
  DB_PASSWORD: "${POSTGRES_PASSWORD}"
  DATABASE_URL: "${DATABASE_URL}"
YAML

  if [ "$needs_jwt" = "true" ]; then
    cat >> "$OUTPUT_DIR/${svc}-secret.yaml" <<YAML
  JWT_SECRET: "${JWT_SECRET}"
YAML
  fi

  info "  ${svc}-secret.yaml"
done

echo ""
info "Done — $(find "$OUTPUT_DIR" -name '*.yaml' | wc -l) secrets generated."
info "These files are in .tmp/ — they will NOT be committed to git."
