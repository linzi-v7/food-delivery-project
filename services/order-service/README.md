# Order Service

Order Service microservice for the Food Delivery System. Handles order creation, status tracking, and payment initiation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ (ESM) |
| Framework | Express 5.x |
| Language | TypeScript 5.9 (strict mode, NodeNext) |
| ORM | Prisma 7.8 with @prisma/adapter-pg |
| Database | PostgreSQL 16 |
| Validation | Zod 4.4 |
| Logging | Pino (structured JSON) |
| Metrics | prom-client (Prometheus) |
| HTTP Client | built-in fetch (Node 22+) |
| Container | Docker (multi-stage, node:22-alpine) |

## API Endpoints

### Health & Metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check - returns status 200 |
| GET | `/metrics` | Prometheus metrics endpoint |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orders` | Create a new order |
| GET | `/orders/:id` | Get a single order with status history |
| GET | `/orders/customer/:customerId` | Get all orders for a customer |
| GET | `/orders/restaurant/:restaurantId` | Get all orders for a restaurant |
| PUT | `/orders/:id/status` | Update order status |

## Request/Response Examples

### Create Order

```http
POST /orders
Content-Type: application/json

{
  "customerId": "uuid-of-customer",
  "restaurantId": "uuid-of-restaurant",
  "items": [
    { "itemId": "uuid-of-item", "quantity": 2, "price": 12.99 },
    { "itemId": "uuid-of-item-2", "quantity": 1, "price": 8.50 }
  ],
  "deliveryAddress": "456 Oak Ave, Apartment 3B, New York, NY 10001"
}
```

Response (201):

```json
{
  "data": {
    "id": "uuid-here",
    "customerId": "uuid-of-customer",
    "restaurantId": "uuid-of-restaurant",
    "items": [
      { "itemId": "uuid-of-item", "quantity": 2, "price": 12.99 },
      { "itemId": "uuid-of-item-2", "quantity": 1, "price": 8.50 }
    ],
    "totalAmount": "34.48",
    "deliveryAddress": "456 Oak Ave, Apartment 3B, New York, NY 10001",
    "status": "pending",
    "createdAt": "2026-05-04T00:00:00.000Z",
    "updatedAt": "2026-05-04T00:00:00.000Z",
    "statusHistory": [
      {
        "id": "uuid-here",
        "status": "pending",
        "note": "Order created",
        "createdAt": "2026-05-04T00:00:00.000Z"
      }
    ]
  }
}
```

On order creation, the service performs a fire-and-forget HTTP call to the Payment Service (if `PAYMENT_SERVICE_URL` is configured). If the payment service is unreachable, the order is still created successfully and a warning is logged — this is a best-effort, non-blocking integration.

### Get Order

```http
GET /orders/uuid-here
```

Response (200):

```json
{
  "data": {
    "id": "uuid-here",
    "customerId": "uuid-of-customer",
    "restaurantId": "uuid-of-restaurant",
    "items": [
      { "itemId": "uuid-of-item", "quantity": 2, "price": 12.99 },
      { "itemId": "uuid-of-item-2", "quantity": 1, "price": 8.50 }
    ],
    "totalAmount": "34.48",
    "deliveryAddress": "456 Oak Ave, Apartment 3B, New York, NY 10001",
    "status": "confirmed",
    "createdAt": "2026-05-04T00:00:00.000Z",
    "updatedAt": "2026-05-04T00:01:00.000Z",
    "statusHistory": [
      {
        "id": "uuid-here",
        "status": "pending",
        "note": "Order created",
        "createdAt": "2026-05-04T00:00:00.000Z"
      },
      {
        "id": "uuid-here",
        "status": "confirmed",
        "note": "Order confirmed by restaurant",
        "createdAt": "2026-05-04T00:01:00.000Z"
      }
    ]
  }
}
```

### Get Customer Orders

```bash
curl http://localhost:3003/orders/customer/uuid-of-customer
```

Response (200) — returns an array of all orders for the given customer, ordered by most recent first:

```json
{
  "data": [
    { "id": "uuid-here", "status": "delivered", "...": "..." },
    { "id": "uuid-here", "status": "pending", "...": "..." }
  ]
}
```

### Get Restaurant Orders

```bash
curl http://localhost:3003/orders/restaurant/uuid-of-restaurant
```

Response (200) — returns an array of all orders for the given restaurant, ordered by most recent first:

```json
{
  "data": [
    { "id": "uuid-here", "status": "preparing", "...": "..." },
    { "id": "uuid-here", "status": "pending", "...": "..." }
  ]
}
```

### Update Order Status

```http
PUT /orders/uuid-here/status
Content-Type: application/json

{
  "status": "confirmed",
  "note": "Order confirmed by restaurant"
}
```

Response (200):

```json
{
  "data": {
    "id": "uuid-here",
    "status": "confirmed",
    "statusHistory": [
      {
        "id": "uuid-here",
        "status": "pending",
        "note": "Order created",
        "createdAt": "2026-05-04T00:00:00.000Z"
      },
      {
        "id": "uuid-here",
        "status": "confirmed",
        "note": "Order confirmed by restaurant",
        "createdAt": "2026-05-04T00:01:00.000Z"
      }
    ],
    "...": "..."
  }
}
```

### Invalid Status Transition Error

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from delivered to preparing."
  }
}
```

Status code: 422

### Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [
      { "field": "items", "message": "At least one item is required" }
    ]
  }
}
```

Status code: 400

## Order Status Flow

```
pending ──────► confirmed ──────► preparing ──────► out_for_delivery ──────► delivered
   │                 │                 │                    │                      │
   └─────────────────┴─────────────────┴────────────────────┴──────────────────────┘
                                       │
                                   cancelled
```

Any status can transition to `cancelled`. Once `cancelled`, no further transitions are allowed. Invalid transitions return a `422 INVALID_TRANSITION` error.

Valid transitions:
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `preparing`, `cancelled`
- `preparing` → `out_for_delivery`, `cancelled`
- `out_for_delivery` → `delivered`, `cancelled`
- `delivered` → `cancelled`
- `cancelled` → (none)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: development, testing, production |
| `PORT` | No | `3003` | Server port |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Log level: trace, debug, info, warn, error, fatal |
| `PAYMENT_SERVICE_URL` | No | - | Payment service base URL (fire-and-forget, best-effort) |

## Local Development

### Prerequisites
- Node.js 20.19+
- PostgreSQL 16 running locally

### Setup

```bash
cd services/order-service

# Copy environment config
cp .env.example .env
# Edit .env with your database credentials

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Push database schema
npx prisma db push

# Start development server with hot reload
npm run dev
```

The server starts on port `3003`. Ensure PostgreSQL is running and the `DATABASE_URL` in `.env` points to a reachable instance with a database named `order_service`.

## Docker

### Development (docker-compose)

```bash
cd services/order-service
docker compose up --build
```

This spins up:
- **order-service** container on port `3003`
- **PostgreSQL 16** container with persistent volume (host port `5434`)

The docker-compose setup includes a health check on PostgreSQL before the order service starts.

### Production Build

```bash
docker build -t order-service .
docker run -p 3003:3003 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/order_service \
  order-service
```

The Dockerfile uses a multi-stage build with `node:22-alpine` and runs as a non-root user (UID 1001).

## Database Schema

### orders

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| customer_id | String | Customer identifier (UUID) |
| restaurant_id | String | Restaurant identifier (UUID) |
| items | JSON | Array of order items (itemId, quantity, price) |
| total_amount | Decimal(10,2) | Calculated total order amount |
| delivery_address | String | Delivery address |
| status | String | Order status (default: `pending`) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### order_status_history

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders (CASCADE) |
| status | String | Status value at time of entry |
| note | String? | Optional note about the status change |
| created_at | DateTime | Timestamp of status change |

## Prometheus Metrics

Exposed at `/metrics` with `order_service_` prefix:

| Metric | Type | Description |
|--------|------|-------------|
| `order_service_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `order_service_http_request_duration_seconds` | Histogram | Request duration in seconds |
| `order_service_nodejs_*` | Various | Default Node.js metrics (memory, GC, event loop) |

## Payment Integration

On order creation, the service attempts a fire-and-forget HTTP POST to the payment service at `{PAYMENT_SERVICE_URL}/payments` with the `orderId` and `amount`. This is a best-effort, non-blocking call:

- If the payment service responds successfully: order created with payment initiated
- If the payment service is unreachable or errors: a warning is logged and the order is still created successfully
- If `PAYMENT_SERVICE_URL` is not configured: the payment call is skipped silently (debug-level log)

## Project Structure

```
order-service/
  prisma/
    schema.prisma               # Database schema
  prisma.config.ts              # Prisma 7 configuration
  src/
    config/
      index.ts                  # Zod-validated environment config
    db/
      client.ts                 # Prisma singleton with PrismaPg adapter
      migrate.ts                # Database connectivity check
    middleware/
      request-logger.ts         # Pino structured request logging
      metrics.ts                # Prometheus metrics middleware
    modules/
      order/
        validation.ts           # Zod request schemas
        service.ts              # Business logic (DI pattern)
        controller.ts           # HTTP request handlers
        routes.ts               # Express Router
    utils/
      logger.ts                 # Pino logger setup
    app.ts                      # Express app assembly
    index.ts                    # Entry point
  .dockerignore
  .env.example
  docker-compose.yml
  Dockerfile
  package.json
  tsconfig.json
```
