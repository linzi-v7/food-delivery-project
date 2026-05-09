# Food Delivery System

Cloud-native food delivery platform built with microservices, Docker Compose, and Kubernetes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                        │
└──────────────────────────┬──────────────────────────────────┘
                           │  :8080 (dev) / :9080 (test) / :80
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Nginx)                       │
│               rate limiting · CORS · reverse proxy           │
└───┬─────────────┬──────────────┬───────────────┬────────────┘
    │             │              │               │
    ▼             ▼              ▼               ▼
┌────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐
│  User  │ │ Restaurant  │ │   Order   │ │   Payment    │
│Service │ │  Service    │ │  Service  │ │   Service    │
│ :3001  │ │   :3002     │ │   :3003   │ │    :3004     │
└───┬────┘ └──────┬──────┘ └─────┬─────┘ └──────┬───────┘
    │             │              │               │
    ▼             ▼              ▼               ▼
┌────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐
│  User  │ │ Restaurant  │ │   Order   │ │   Payment    │
│   DB   │ │     DB      │ │    DB     │ │     DB       │
│ :5432  │ │   :5432     │ │   :5432   │ │    :5432     │
└────────┘ └────────────┘ └───────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                      │
│                 served by Nginx on port 80                   │
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **user-service** | 3001 | Registration, login, JWT auth, user profiles. Admin-only list endpoint. |
| **restaurant-service** | 3002 | CRUD for restaurants and menu items. Seeds 8 restaurants with menus on first run. |
| **order-service** | 3003 | Order creation, status tracking (pending → confirmed → preparing → out_for_delivery → delivered). Calls payment-service. |
| **payment-service** | 3004 | Payment simulation with configurable success rate and delay. |
| **frontend** | 80 | React SPA — restaurants, orders, checkout, admin dashboard. |
| **api-gateway** | 80 (exposed) | Nginx reverse proxy with rate limiting (50 req/s burst 20), CORS, request routing. |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express 5, TypeScript |
| ORM | Drizzle ORM (PostgreSQL) |
| Database | PostgreSQL 16 Alpine |
| Frontend | React 19, Vite |
| Gateway | Nginx Alpine |
| Validation | Zod |
| Auth | JWT (jsonwebtoken + bcryptjs) |

---

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2+
- **Minikube** (for Kubernetes deployment only)
- **kubectl** (for Kubernetes deployment only)

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url> && cd food-delivery-project

# 2. Create .env from template
cp .env.example .env

# 3. Start development stack
make dev

# 4. Open browser
#    Frontend:  http://localhost:8080
#    Register a user, then log in. Admin users can access /admin.
```

Pre-seeded admin account (dev/test only):
- Email: `admin@fooddelivery.com`
- Password: `admin123`

---

## Commands

### Docker Compose

```bash
make dev          # Development  — gateway on :8080, hot reload, debug logs
make test         # Testing      — gateway on :9080, ephemeral data, fast payments
make prod         # Production   — gateway on :80, persistent data, JSON logs

make dev-down     # Tear down dev   (removes volumes)
make test-down    # Tear down test  (removes volumes)
make prod-down    # Tear down prod  (keeps volumes)

make all          # Start all 3 environments simultaneously
make all-down     # Tear down all 3
```

All three environments run independently — they use separate project names and networks so there are no port conflicts.

### Per-service commands (development)

```bash
# Run a single service with its own database
cd services/user-service
docker compose up --build

# Type-check a service
cd services/order-service
npx tsc --noEmit
```

### Kubernetes (Minikube)

```bash
# Prerequisites
minikube start --driver=docker
minikube addons enable ingress

# Deploy
make k8s-deploy

# Get Minikube IP and add to hosts
minikube ip                          # → e.g. 192.168.49.2
# Add to C:\Windows\System32\drivers\etc\hosts:
#   192.168.49.2  fooddelivery.local

# Open http://fooddelivery.local

# Rebuild a single service
make k8s-rebuild frontend

# Status & logs
make k8s-status
kubectl logs -n prod deployment/order-service -f

# Debug: port-forward a service directly
kubectl port-forward -n prod deployment/user-service 3001:3001

# Tear down
make k8s-teardown
minikube delete                          # Wipes everything
```

---

## Environment Variables

All variables live in a single root `.env` file. Copy `.env.example` to get started.

### Shared (all services)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `NODE_ENV` | `development` | Environment: `development`, `test`, `production` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `LOG_LEVEL` | `debug` | Logging: `debug`, `info`, `warn`, `error` |

### Auth (user-service)

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiration (e.g. `1h`, `24h`) |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds (4 dev, 12 prod) |

### Inter-service Communication (order-service, payment-service)

| Variable | Default |
|----------|---------|
| `USER_SERVICE_URL` | `http://user-service:3001` |
| `RESTAURANT_SERVICE_URL` | `http://restaurant-service:3002` |
| `ORDER_SERVICE_URL` | `http://order-service:3003` |
| `PAYMENT_SERVICE_URL` | `http://payment-service:3004` |

### Payment Simulation (payment-service)

| Variable | Description |
|----------|-------------|
| `PAYMENT_SUCCESS_RATE` | Probability payment succeeds (0.0–1.0) |
| `PAYMENT_PROCESSING_DELAY_MS` | Simulated processing time in ms |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (build-time arg, injected into Vite) |

### Environment-specific overrides

| Variable | Dev | Test | Prod |
|----------|-----|------|------|
| `BCRYPT_SALT_ROUNDS` | 4 | 4 | 12 |
| `PAYMENT_SUCCESS_RATE` | 0.95 | 1.0 | 0.90 |
| `PAYMENT_PROCESSING_DELAY_MS` | 500 | 100 | 2000 |
| `JWT_EXPIRES_IN` | 1h | 1h | 24h |
| `LOG_LEVEL` | debug | info | warn |
| Gateway port | 8080 | 9080 | 80 |

---

## Database

Each microservice has its own isolated PostgreSQL database. On first start, the Docker container runs `drizzle-kit push` to sync the schema. No manual migration steps needed.

Seeded data (dev/test):
- **user-service**: admin user
- **restaurant-service**: 8 restaurants with ~10 menu items each

To reset: `docker compose down -v` (removes volumes) then `docker compose up --build`.

---

## API Endpoints

All requests go through the API gateway at `/api/*`.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a user |
| POST | `/api/auth/login` | No | Login, returns JWT |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/:id` | User | Get user profile |
| PUT | `/api/users/:id` | User | Update profile |

### Restaurants
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/restaurants` | No | List restaurants |
| GET | `/api/restaurants/:id` | No | Get restaurant with menu |
| POST | `/api/restaurants` | Admin | Create restaurant |
| PUT | `/api/restaurants/:id` | Admin | Update restaurant |

### Menu Items
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/restaurants/:id/menu` | No | List menu items |
| POST | `/api/restaurants/:id/menu` | Admin | Add menu item |
| PUT | `/api/restaurants/:id/menu/:itemId` | Admin | Update menu item |
| DELETE | `/api/restaurants/:id/menu/:itemId` | Admin | Delete menu item |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders` | Admin | List all orders |
| POST | `/api/orders` | User | Create order |
| GET | `/api/orders/:id` | User | Get order details |
| PUT | `/api/orders/:id/status` | Admin | Update order status |

### Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/payments/:transactionId` | Admin | Get transaction |
| GET | `/api/payments/order/:orderId` | Admin | Get payment by order |
| POST | `/api/payments` | Internal | Initiate payment |
| POST | `/api/payments/:transactionId/refund` | Admin | Refund transaction |
