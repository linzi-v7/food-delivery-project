# Restaurant Service

Restaurant Service microservice for the Food Delivery System. Manages restaurants and their menus with full CRUD operations.

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
| Container | Docker (multi-stage, node:22-alpine) |

## API Endpoints

### Health & Metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check - returns status 200 |
| GET | `/metrics` | Prometheus metrics endpoint |

### Restaurants

| Method | Path | Description |
|--------|------|-------------|
| POST | `/restaurants` | Create a new restaurant |
| GET | `/restaurants` | List all restaurants |
| GET | `/restaurants/:id` | Get restaurant details (includes menu items) |
| PUT | `/restaurants/:id` | Update restaurant information |

### Menu Items

| Method | Path | Description |
|--------|------|-------------|
| POST | `/restaurants/:id/menu` | Add a menu item to a restaurant |
| GET | `/restaurants/:id/menu` | Get all menu items for a restaurant |
| PUT | `/restaurants/:id/menu/:itemId` | Update a menu item (price, availability) |
| DELETE | `/restaurants/:id/menu/:itemId` | Remove a menu item |

## Request/Response Examples

### Create Restaurant
```http
POST /restaurants
Content-Type: application/json

{
  "name": "Pizza Palace",
  "address": "123 Main St, New York, NY",
  "cuisine": "Italian"
}
```

Response (201):
```json
{
  "data": {
    "id": "uuid-here",
    "name": "Pizza Palace",
    "address": "123 Main St, New York, NY",
    "cuisine": "Italian",
    "createdAt": "2026-05-04T00:00:00.000Z",
    "updatedAt": "2026-05-04T00:00:00.000Z"
  }
}
```

### Add Menu Item
```http
POST /restaurants/uuid-here/menu
Content-Type: application/json

{
  "name": "Margherita Pizza",
  "description": "Classic tomato, mozzarella, and basil",
  "price": 12.99,
  "available": true
}
```

Response (201):
```json
{
  "data": {
    "id": "uuid-here",
    "name": "Margherita Pizza",
    "description": "Classic tomato, mozzarella, and basil",
    "price": "12.99",
    "available": true,
    "restaurantId": "uuid-here",
    "createdAt": "2026-05-04T00:00:00.000Z",
    "updatedAt": "2026-05-04T00:00:00.000Z"
  }
}
```

### Toggle Menu Item Availability
```http
PUT /restaurants/uuid-here/menu/item-uuid
Content-Type: application/json

{
  "available": false
}
```

### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: development, testing, production |
| `PORT` | No | `3002` | Server port |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Log level: trace, debug, info, warn, error, fatal |

## Local Development

### Prerequisites
- Node.js 20.19+
- PostgreSQL 16 running locally

### Setup

```bash
cd services/restaurant-service

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

## Docker

### Development (docker-compose)

```bash
cd services/restaurant-service
docker compose up --build
```

This spins up:
- **restaurant-service** container on port `3002`
- **PostgreSQL 16** container with persistent volume

### Production Build

```bash
docker build -t restaurant-service .
docker run -p 3002:3002 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/restaurant_service \
  restaurant-service
```

## Database Schema

### restaurants
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Restaurant name |
| address | String | Physical address |
| cuisine | String | Cuisine type |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### menu_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Item name |
| description | String | Item description |
| price | Decimal(10,2) | Item price |
| available | Boolean | Availability toggle |
| restaurant_id | UUID | Foreign key to restaurants (CASCADE) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Prometheus Metrics

Exposed at `/metrics` with `restaurant_service_` prefix:

| Metric | Type | Description |
|--------|------|-------------|
| `restaurant_service_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `restaurant_service_http_request_duration_seconds` | Histogram | Request duration in seconds |
| `restaurant_service_nodejs_*` | Various | Default Node.js metrics (memory, GC, event loop) |

## Project Structure

```
restaurant-service/
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
      restaurant/
        validation.ts           # Zod request schemas
        service.ts              # Business logic (DI pattern)
        controller.ts           # HTTP request handlers
        routes.ts               # Express Router
      menu/
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
