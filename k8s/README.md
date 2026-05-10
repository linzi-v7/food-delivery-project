# Kubernetes Deployment Guide — Food Delivery System

Comprehensive guide for deploying the food delivery microservices system on
Minikube. Covers prerequisites, image building, deployment, verification,
troubleshooting, and teardown.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| [Minikube](https://minikube.sigs.k8s.io/docs/start/) | ≥ 1.33 | Local Kubernetes cluster |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | ≥ 1.29 | Cluster management CLI |
| [Docker](https://docs.docker.com/engine/install/) | ≥ 24 | Building container images |
| [Git](https://git-scm.com/) | ≥ 2.40 | Source control (optional) |

**Minimum cluster resources:** 4 CPUs, 8192 MB RAM, 20 GB disk.

---

## Quick Start

From the project root:

```bash
# 1. Start Minikube with NGINX ingress
minikube start --cpus=4 --memory=8192 --disk-size=20g

# 2. Enable the NGINX Ingress Controller
minikube addons enable ingress

# 3. Build images, load into Minikube, and deploy
make k8s-deploy

# Or manually:
# 3a. Build all Docker images
# docker build -t fooddelivery/user-service:latest       ./services/user-service
# docker build -t fooddelivery/restaurant-service:latest  ./services/restaurant-service
# docker build -t fooddelivery/order-service:latest       ./services/order-service
# docker build -t fooddelivery/payment-service:latest     ./services/payment-service
# docker build -t fooddelivery/frontend:latest            ./frontend
# docker build -t fooddelivery/api-gateway:latest         ./gateway
#
# 3b. Load images into Minikube
# minikube image load fooddelivery/user-service:latest
# minikube image load fooddelivery/restaurant-service:latest
# minikube image load fooddelivery/order-service:latest
# minikube image load fooddelivery/payment-service:latest
# minikube image load fooddelivery/frontend:latest
# minikube image load fooddelivery/api-gateway:latest
#
# 3c. Deploy
# chmod +x k8s/deploy.sh
# ./k8s/deploy.sh

# 4. Add local DNS entry (administrator/root required)
#    macOS  → sudo nano /etc/hosts
#    Linux  → sudo nano /etc/hosts
#    Windows → notepad C:\Windows\System32\drivers\etc\hosts
#    Add the following line:
#      127.0.0.1  fooddelivery.local
#    For Minikube on macOS/Linux use:
#      $(minikube ip)  fooddelivery.local

# 5. Open the application
#    http://fooddelivery.local
```

---

## Detailed Instructions

### 1. Starting Minikube

```bash
minikube start --cpus=4 --memory=8192 --disk-size=20g
```

**Verify the cluster is running:**

```bash
minikube status
kubectl cluster-info
```

### 2. Enable NGINX Ingress Controller

```bash
minikube addons enable ingress
```

Verify the ingress controller pod is running:

```bash
kubectl get pods -n ingress-nginx
```

> **Note:** This project uses Ingress `networking.k8s.io/v1` with
> `spec.ingressClassName: nginx`. The deprecated `kubernetes.io/ingress.class`
> annotation is intentionally avoided.

### 3. Building Docker Images

Build all six service images from the project root:

```bash
docker build -t fooddelivery/user-service:latest       ./services/user-service
docker build -t fooddelivery/restaurant-service:latest  ./services/restaurant-service
docker build -t fooddelivery/order-service:latest       ./services/order-service
docker build -t fooddelivery/payment-service:latest     ./services/payment-service
docker build -t fooddelivery/frontend:latest            ./frontend
docker build -t fooddelivery/api-gateway:latest         ./gateway
```

Or use the Makefile shortcut:

```bash
make k8s-build-images
```

### 4. Loading Images into Minikube

Minikube uses its own Docker daemon. Images must be explicitly loaded:

```bash
minikube image load fooddelivery/user-service:latest
minikube image load fooddelivery/restaurant-service:latest
minikube image load fooddelivery/order-service:latest
minikube image load fooddelivery/payment-service:latest
minikube image load fooddelivery/frontend:latest
minikube image load fooddelivery/api-gateway:latest
```

Or use the Makefile shortcut:

```bash
make k8s-load-images
```

Verify images are present in Minikube:

```bash
minikube image list | grep fooddelivery
```

> **Important:** All deployments set `imagePullPolicy: Never` because images
> are loaded directly into Minikube rather than pulled from a registry.

### 5. Deployment

The `deploy.sh` script applies all Kubernetes manifests in the correct
dependency order:

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

**What gets deployed (in order):**

1. **Namespaces** — `prod`
2. **Secret generation** — reads root `.env` and produces real Secret manifests into `.tmp/k8s-secrets/`
3. **ConfigMaps** — per-service environment configuration (non-sensitive)
4. **Secrets** — database credentials, JWT key, connection strings (from `.tmp/`)
5. **PersistentVolumeClaims** — 1 Gi PVC per database
6. **Database Deployments & Services** — PostgreSQL 16 Alpine (4 instances)
7. **Microservice, Frontend & Gateway Deployments & Services** — all 6 app services
8. **Ingress** — routes external traffic to the API gateway
9. **HorizontalPodAutoscalers** — CPU-based autoscaling for key services

All application resources are deployed into the `prod` namespace.

> **⚠️ Secrets:** The files in `k8s/secrets/` are **templates** with placeholder
> values (safe to commit). The deploy script runs `k8s/scripts/generate-secrets.sh`
> which reads your root `.env` and produces real, deployable Secret manifests in
> `.tmp/k8s-secrets/` (gitignored). Never commit `.tmp/` or `.env` to git.

### 6. Local Access

#### Using /etc/hosts (recommended)

Add to `/etc/hosts` (administrator/root required):

```
127.0.0.1  fooddelivery.local
```

On Linux/macOS, you can use the Minikube IP directly:

```bash
echo "$(minikube ip)  fooddelivery.local" | sudo tee -a /etc/hosts
```

Then access the application at:

```
http://fooddelivery.local
```

#### Using `minikube tunnel` (alternative)

```bash
minikube tunnel
```

This exposes LoadBalancer-type services on `localhost`. The ingress will be
accessible without `/etc/hosts` modification (use with `curl -H "Host:
fooddelivery.local" localhost`).

#### Port-forwarding (for debugging)

```bash
# Forward the API gateway to localhost:8080
kubectl port-forward -n prod svc/api-gateway 8080:80
```

Then access at `http://localhost:8080`.

---

## Architecture / Service Topology

```
                       ┌──────────────────┐
                       │   External User   │
                       └────────┬─────────┘
                                │
                   http://fooddelivery.local
                                │
                       ┌────────▼─────────┐
                       │  NGINX Ingress   │
                       └────────┬─────────┘
                                │ port 80
                       ┌────────▼─────────┐
                       │   api-gateway    │  (NGINX reverse proxy)
                       │   port 80        │
                       └──┬───┬───┬───┬──┘
                          │   │   │   │
              ┌───────────┘   │   │   └───────────┐
              ▼               ▼   ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ user-service │  │restaurant-svc│  │ order-service│
    │   :3001      │  │   :3002     │  │   :3003      │
    └──────┬───────┘  └──────┬──────┘  └──────┬───────┘
           │                 │                │
    ┌──────▼───────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │user-service-db│  │restaurant-  │  │order-service-│
    │  pgsql :5432  │  │  service-db │  │ db :5432     │
    └──────────────┘  │  pgsql :5432│  └──────────────┘
                      └─────────────┘
    ┌─────────────┐  ┌─────────────┐
    │payment-svc  │  │  frontend   │
    │   :3004     │  │   :80       │
    └──────┬──────┘  └─────────────┘
           │
    ┌──────▼───────┐
    │payment-svc-db│
    │  pgsql :5432 │
    └──────────────┘
```

### Service Reference Table

| Service | Type | Port | DB Port | Key Endpoints |
|---------|------|------|---------|---------------|
| **api-gateway** | ClusterIP | 80 | — | `/api/auth/*`, `/api/users/*`, `/api/restaurants/*`, `/api/orders/*`, `/api/payments/*`, `/` (SPA fallback) |
| **frontend** | ClusterIP | 80 | — | Static SPA (React/Vite) |
| **user-service** | ClusterIP | 3001 | 5432 | `/health`, `/auth/*`, `/users/*` |
| **restaurant-service** | ClusterIP | 3002 | 5432 | `/health`, `/restaurants/*` |
| **order-service** | ClusterIP | 3003 | 5432 | `/health`, `/orders/*` |
| **payment-service** | ClusterIP | 3004 | 5432 | `/health`, `/payments/*` |
| **user-service-db** | ClusterIP | 5432 | — | PostgreSQL 16 Alpine |
| **restaurant-service-db** | ClusterIP | 5432 | — | PostgreSQL 16 Alpine |
| **order-service-db** | ClusterIP | 5432 | — | PostgreSQL 16 Alpine |
| **payment-service-db** | ClusterIP | 5432 | — | PostgreSQL 16 Alpine |

### Autoscaling

The following services are configured with HorizontalPodAutoscalers
(`autoscaling/v2`):

| Service | Min Replicas | Max Replicas | Target CPU |
|---------|-------------|-------------|------------|
| user-service | 2 | 4 | 70% |
| order-service | 2 | 6 | 60% |
| payment-service | 2 | 4 | 70% |

---

## Verifying the Deployment

### Check Pod Status

```bash
# All pods in the prod namespace
kubectl get pods -n prod

# Watch pod status in real-time
kubectl get pods -n prod -w
```

All pods should reach `Running` status. Wait for readiness probes to pass
(typically 30–60 seconds on first deployment).

### Check Services

```bash
kubectl get svc -n prod
```

### Check Ingress

```bash
kubectl get ingress -n prod
```

The `fooddelivery-ingress` should show an address after a few seconds.

### Check HPA Status

```bash
kubectl get hpa -n prod
```

### Check PersistentVolumeClaims

```bash
kubectl get pvc -n prod
```

All four PVCs should be in `Bound` status.

### Quick Health Check

```bash
# Via port-forward
kubectl port-forward -n prod svc/api-gateway 8080:80 &
curl http://localhost:8080/gateway-health

# Expected response:
# {"status":"healthy","service":"api-gateway",...}
```

### Full Status Overview

```bash
kubectl get all -n prod
```

---

## Viewing Logs

```bash
# View recent logs for a specific pod
kubectl logs -n prod <pod-name>

# Stream logs from a pod
kubectl logs -n prod -f <pod-name>

# View logs for all pods of a deployment
kubectl logs -n prod deployment/user-service

# View logs for all pods of a deployment (with label selector)
kubectl logs -n prod -l app=order-service --all-containers=true

# View previous container logs (after a crash)
kubectl logs -n prod <pod-name> --previous
```

---

## Testing Autoscaling (HPA)

Simulate load on the order service to trigger HPA scaling:

```bash
# Terminal 1: Run a load generator
kubectl run -i --tty load-generator --image=busybox -n prod --restart=Never --rm -- \
  /bin/sh -c "while true; do wget -q -O- http://order-service:3003/health; done"

# Terminal 2: Watch HPA activity
kubectl get hpa -n prod -w
```

Watch for the `order-service` replica count to increase. Once the load
generator stops, the service scales back down after the cooldown period.

---

## Teardown

Remove all deployed resources:

```bash
chmod +x k8s/teardown.sh
./k8s/teardown.sh
```

The teardown script removes resources in reverse dependency order:
HPAs → Ingress → Services → Deployments → PVCs → Secrets → ConfigMaps →
Namespace.

To also stop the Minikube cluster:

```bash
minikube stop         # Stop (preserves state)
minikube delete        # Delete entirely

# Clean up Docker images (optional)
docker rmi fooddelivery/user-service:latest
docker rmi fooddelivery/restaurant-service:latest
docker rmi fooddelivery/order-service:latest
docker rmi fooddelivery/payment-service:latest
docker rmi fooddelivery/frontend:latest
docker rmi fooddelivery/api-gateway:latest
```

---

## Directory Structure

```
k8s/
├── README.md                           ← This file
├── deploy.sh                           # Apply all manifests in order
├── teardown.sh                         # Delete all resources in reverse order
├── namespaces/
│   └── namespaces.yaml                 # prod namespace
├── configmaps/
│   ├── user-service-configmap.yaml
│   ├── restaurant-service-configmap.yaml
│   ├── order-service-configmap.yaml
│   └── payment-service-configmap.yaml
├── secrets/
│   ├── user-service-secret.yaml          # Template — see scripts/generate-secrets.sh
│   ├── restaurant-service-secret.yaml
│   ├── order-service-secret.yaml
│   └── payment-service-secret.yaml
├── scripts/
│   └── generate-secrets.sh               # Generates real secrets from root .env
├── persistent-volumes/
│   ├── user-db-pvc.yaml
│   ├── restaurant-db-pvc.yaml
│   ├── order-db-pvc.yaml
│   └── payment-db-pvc.yaml
├── deployments/
│   ├── user-service-deployment.yaml
│   ├── restaurant-service-deployment.yaml
│   ├── order-service-deployment.yaml
│   ├── payment-service-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── api-gateway-deployment.yaml
│   ├── user-service-db-deployment.yaml
│   ├── restaurant-service-db-deployment.yaml
│   ├── order-service-db-deployment.yaml
│   └── payment-service-db-deployment.yaml
├── services/
│   ├── user-service.yaml
│   ├── restaurant-service.yaml
│   ├── order-service.yaml
│   ├── payment-service.yaml
│   ├── frontend.yaml
│   ├── api-gateway.yaml
│   ├── user-db.yaml
│   ├── restaurant-db.yaml
│   ├── order-db.yaml
│   └── payment-db.yaml
├── ingress/
│   └── ingress.yaml
├── hpa/
│   ├── user-service-hpa.yaml
│   ├── order-service-hpa.yaml
│   └── payment-service-hpa.yaml
```

---

## Troubleshooting

### `ImagePullBackOff` or `ErrImagePull`

**Cause:** Minikube cannot find the container image.

**Fix:** Load the image into Minikube:

```bash
minikube image load fooddelivery/<service-name>:latest
```

Verify with `minikube image list | grep fooddelivery`. Also confirm
`imagePullPolicy: Never` is set in the deployment.

### `CrashLoopBackOff`

**Cause:** Container starts but exits immediately — usually a misconfiguration
or missing dependency.

**Fix:**

```bash
# Inspect the failing pod
kubectl describe pod -n prod <pod-name>

# Check container logs (including previous crashed instance)
kubectl logs -n prod <pod-name> --previous

# Common causes:
# - Missing or incorrect ConfigMap/Secret values
# - Database connection failure (check DB pod is Running)
# - Environment variable not set
```

### `Pending` PVC

**Cause:** No storage class available to provision the volume.

**Fix:**

```bash
# Check available storage classes
kubectl get sc

# Minikube should have a 'standard' storage class by default.
# If missing, enable the default storage provisioner:
minikube addons enable storage-provisioner
```

### Ingress Not Working (no address or connection refused)

**Cause:** NGINX ingress controller not running or `/etc/hosts` not
configured.

**Fix:**

```bash
# 1. Verify ingress controller is running
kubectl get pods -n ingress-nginx

# 2. If not running, enable the addon
minikube addons enable ingress

# 3. Verify the ingress resource is created
kubectl get ingress -n prod

# 4. Check that fooddelivery.local resolves
#    On Linux/macOS:
ping fooddelivery.local
#    Should return 127.0.0.1 or the Minikube IP

# 5. If using /etc/hosts with Minikube IP, get the current IP:
minikube ip
```

### `kubectl` Commands Fail with "connection refused"

**Cause:** Minikube is not running or `kubectl` context is wrong.

**Fix:**

```bash
minikube status            # Check if cluster is running
minikube start             # Start if stopped
kubectl config use-context minikube   # Switch to Minikube context
```

### Database Pods Fail to Start

**Cause:** Missing or incorrect `DB_USER`/`DB_PASSWORD` in Secrets.

**Fix:**

```bash
# Verify secrets exist
kubectl get secrets -n prod

# Inspect a secret (values are base64-encoded — decode to verify)
kubectl get secret user-service-secret -n prod -o jsonpath='{.data.DB_USER}' | base64 -d
kubectl get secret user-service-secret -n prod -o jsonpath='{.data.DB_PASSWORD}' | base64 -d

# Re-generate and re-apply secrets if needed
bash k8s/scripts/generate-secrets.sh
kubectl apply -f .tmp/k8s-secrets/
```

### Rate Limiting (HTTP 429)

The API gateway applies rate limits: 5 req/s for auth endpoints, 50 req/s for
general API endpoints. If you encounter 429 responses during testing, wait a
few seconds for the rate limit window to reset.

---

## Environment Variables

Service configuration is managed via Kubernetes ConfigMaps and Secrets. See
the individual manifest files in `k8s/configmaps/` and `k8s/secrets/` for the
complete variable inventory. The canonical source of truth for all environment
variables is `.env.example` in the project root.

**Key environment variables by service:**

| Service | ConfigMap Vars | Secret Vars |
|---------|---------------|-------------|
| **user-service** | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `BCRYPT_SALT_ROUNDS`, `JWT_EXPIRES_IN` | `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` |
| **restaurant-service** | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME` | `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` |
| **order-service** | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `USER_SERVICE_URL`, `RESTAURANT_SERVICE_URL`, `PAYMENT_SERVICE_URL` | `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` |
| **payment-service** | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `PAYMENT_SUCCESS_RATE`, `PAYMENT_PROCESSING_DELAY_MS` | `DB_USER`, `DB_PASSWORD`, `DATABASE_URL` |

---

## References

- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/16/index.html)
