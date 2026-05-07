#!/bin/bash
# Kubernetes Teardown Script — delete all resources in correct order
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kubectl delete -f "${SCRIPT_DIR}/hpa/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/ingress/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/services/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/deployments/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/persistent-volumes/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/secrets/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/configmaps/" --ignore-not-found
kubectl delete -f "${SCRIPT_DIR}/namespaces/" --ignore-not-found

echo "Teardown complete."
