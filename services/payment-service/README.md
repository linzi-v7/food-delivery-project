# Payment Service

Payment processing microservice for the Food Delivery System. Simulates payment processing, records all transactions, and notifies the Order Service of payment outcomes.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | >=20.19 |
| Framework | Express | 5.2.1 |
| Language | TypeScript | 5.9.3 |
| ORM | Prisma | 7.8.0 |
| Database | PostgreSQL | 16+ |
| Validation | Zod | 4.4.2 |
| Logging | Pino | 10.3.1 |
| Metrics | prom-client | 15.1.3 |
| Security | Helmet | 8.1.0 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check for Docker/K8s probes |
| `GET` | `/metrics` | Prometheus metrics endpoint |
| `POST` | `/payments` | Initiate a payment |
| `GET` | `/payments/:transactionId` | Get transaction details |
| `GET` | `/payments/order/:orderId` | Get payment record for an order |
| `POST` | `/payments/:transactionId/refund` | Refund a transaction |

### Request Examples

**Initiate Payment**
```bash
curl -X POST http://localhost:3004/payments \
  -H "Content-Type: application/json" \
  -d '{"orderId": "uuid-here", "customerId": "customer-uuid", "amount": 29.99}'
```

Response (201 Created):
```json
{
  "data": {
    "transactionId": "uuid-here",
    "orderId": "uuid-here",
    "customerId": "customer-uuid",
    "amount": 29.99,
    "status": "pending",
    "createdAt": "2026-05-04T12:00:00.000Z"
  }
}
```

**Get Transaction**
```bash
curl http://localhost:3004/payments/{transactionId}
```

Response (200 OK):
```json
{
  "data": {
    "transactionId": "uuid-here",
    "orderId": "uuid-here",
    "customerId": "customer-uuid",
    "amount": 29.99,
    "status": "succeeded",
    "createdAt": "2026-05-04T12:00:00.000Z",
    "updatedAt": "2026-05-04T12:00:02.000Z"
  }
}
```

**Get Payment by Order**
```bash
curl http://localhost:3004/payments/order/{orderId}
```

**Refund Transaction**
```bash
curl -X POST http://localhost:3004/payments/{transactionId}/refund
```

Response (200 OK):
```json
{
  "data": {
    "transactionId": "uuid-here",
    "orderId": "uuid-here",
    "customerId": "customer-uuid",
    "amount": 29.99,
    "status": "refunded",
    "createdAt": "2026-05-04T12:00:00.000Z",
    "updatedAt": "2026-05-04T12:05:00.000Z"
  }
}
```

## Payment Flow

1. Client calls `POST /payments` → transaction recorded as `pending`
2. After a configurable delay (default 2s), payment is processed
3. **90% of payments** randomly succeed (status → `succeeded`)
4. **10% of payments** randomly fail (status → `failed`)
5. On success → calls `PUT {ORDER_SERVICE_URL}/orders/:orderId/status` with `{status: "confirmed"}`
6. On failure → calls `PUT {ORDER_SERVICE_URL}/orders/:orderId/status` with `{status: "cancelled"}`
7. Order Service callbacks are fire-and-forget; unreachable Order Service is logged as warning
8. Succeeded transactions can be refunded via `POST /payments/:transactionId/refund`

### Transaction Statuses

| Status | Description |
|--------|-------------|
| `pending` | Payment initiated, processing |
| `succeeded` | Payment processed successfully |
| `failed` | Payment processing failed |
| `refunded` | Transaction was refunded |

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment (`development`, `testing`, `production`) |
| `PORT` | No | `3004` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `ORDER_SERVICE_URL` | No | — | Order Service URL for payment status callbacks |
| `PAYMENT_SUCCESS_RATE` | No | `0.9` | Probability of payment success (0–1) |
| `PAYMENT_PROCESSING_DELAY_MS` | No | `2000` | Simulated processing delay in milliseconds |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Logging level |

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations (development)
npm run prisma:migrate:dev

# Start in development mode (with hot reload)
npm run dev
```

## Production Build

```bash
# Install dependencies
npm ci

# Generate Prisma client
npm run prisma:generate

# Build TypeScript
npm run build

# Start
npm start
```

## Docker

### Quick Start (Docker Compose)

```bash
# Start both containers (payment-service + PostgreSQL)
docker compose up --build

# Or run in detached mode
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f payment-service

# Stop and remove containers
docker compose down

# Stop and remove + delete database volume
docker compose down -v
```

The service will be available at `http://localhost:3004`. The PostgreSQL database is also exposed on `localhost:5432` for local tool access.

### Standalone Docker

```bash
# Build the image
docker build -t payment-service .

# Run the container (requires a running PostgreSQL instance)
docker run -p 3004:3004 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/payment_service \
  -e ORDER_SERVICE_URL=http://order-service:3003 \
  payment-service
```

### Docker Image Details

- **Base image**: `node:22-alpine` (multi-stage build)
- **Port**: `3004`
- **User**: Non-root (`appuser`, UID 1001)
- **Health check**: `GET /health` every 30s

## Folder Structure

```
services/payment-service/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/
│   │   └── index.ts          # Zod-validated env config
│   ├── db/
│   │   ├── client.ts         # Prisma singleton client
│   │   └── migrate.ts        # Database connectivity check
│   ├── middleware/
│   │   ├── metrics.ts        # Prometheus metrics collection
│   │   └── request-logger.ts # Structured JSON request logging
│   ├── modules/
│   │   └── payment/
│   │       ├── validation.ts # Zod request schemas
│   │       ├── service.ts    # Business logic + payment simulation
│   │       ├── controller.ts # HTTP request handlers
│   │       └── routes.ts     # Route definitions
│   ├── utils/
│   │   └── logger.ts         # Pino logger setup
│   ├── app.ts                # Express app assembly
│   └── index.ts              # Entry point
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── README.md
```

## Prometheus Metrics

Exposed at `GET /metrics`:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `payment_service_payment_success_rate` | Gauge | — | Rolling success rate of payment transactions (0–1) |
| `payment_service_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests |
| `payment_service_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency distribution |
| `nodejs_*` | Various | — | Default Node.js metrics (heap, event loop, GC) |

## Integration with Order Service

The Payment Service communicates with the Order Service via HTTP callbacks:

- **Payment succeeded** → `PUT {ORDER_SERVICE_URL}/orders/{orderId}/status` `{status: "confirmed"}`
- **Payment failed** → `PUT {ORDER_SERVICE_URL}/orders/{orderId}/status` `{status: "cancelled"}`

Callbacks are fire-and-forget with a 5-second timeout. If the Order Service is unreachable, the error is logged as a warning but does not affect the payment transaction. The transaction status is already persisted before the callback is attempted.

## Security

- No real payment processing — fully simulated
- All configuration via environment variables (never hardcoded)
- Input validation on all endpoints via Zod
- Helmet security headers enabled
- Non-root user in Docker container
- No sensitive data in log output
- No authentication middleware (internal service — intended for use behind API gateway)

## Database Migrations

```bash
# Create a new migration after schema changes
npm run prisma:migrate:dev -- --name your_migration_name

# Apply migrations in production
npm run prisma:migrate

# Reset database (development only)
npx prisma migrate reset
```

The service automatically connects to the database on startup and verifies connectivity. In Docker, `prisma db push` is used on container start to apply schema changes without requiring migration files.
