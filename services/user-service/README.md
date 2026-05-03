# User Service

User management microservice for the Food Delivery System. Handles customer and delivery personnel registration, authentication, and profile management.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | >=20.19 |
| Framework | Express | 5.2.1 |
| Language | TypeScript | 5.9.3 |
| ORM | Prisma | 7.8.0 |
| Database | PostgreSQL | 16+ |
| Auth | JWT (jsonwebtoken) | 9.0.3 |
| Hashing | bcryptjs | 3.0.3 |
| Validation | Zod | 4.4.2 |
| Logging | Pino | 10.3.1 |
| Metrics | prom-client | 15.1.3 |
| Security | Helmet | 8.1.0 |

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check for Docker/K8s probes |
| `GET` | `/metrics` | Prometheus metrics endpoint |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Authenticate and receive JWT |

### Protected (requires JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/:id` | Get user profile |
| `PUT` | `/users/:id` | Update user profile |

### Request Examples

**Register**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "SecurePass1", "role": "CUSTOMER"}'
```

**Login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "SecurePass1"}'
```

**Get Profile**
```bash
curl http://localhost:3001/users/{id} \
  -H "Authorization: Bearer <token>"
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment (`development`, `testing`, `production`) |
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `1h` | JWT expiration time |
| `BCRYPT_SALT_ROUNDS` | No | `10` | bcrypt hashing rounds |
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

The fastest way to spin up the service with its database:

```bash
# Start both containers (user-service + PostgreSQL)
docker compose up --build

# Or run in detached mode
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f user-service

# Stop and remove containers
docker compose down

# Stop and remove + delete database volume
docker compose down -v
```

The service will be available at `http://localhost:3001`. The PostgreSQL
database is also exposed on `localhost:5432` for local tool access.

### Standalone Docker

```bash
# Build the image
docker build -t user-service .

# Run the container (requires a running PostgreSQL instance)
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/user_service \
  -e JWT_SECRET=your-secure-secret-at-least-32-characters \
  user-service
```

### Docker Image Details

- **Base image**: `node:22-alpine` (multi-stage build)
- **Port**: `3001`
- **User**: Non-root (`appuser`, UID 1001)
- **Health check**: `GET /health` every 30s

## Folder Structure

```
services/user-service/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/
│   │   └── index.ts          # Zod-validated env config
│   ├── db/
│   │   ├── client.ts         # Prisma singleton client
│   │   └── migrate.ts        # Migration runner
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication & authorization
│   │   ├── metrics.ts        # Prometheus metrics collection
│   │   └── request-logger.ts # Structured JSON request logging
│   ├── modules/
│   │   └── user/
│   │       ├── validation.ts # Zod request schemas
│   │       ├── service.ts    # Business logic
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
| `user_service_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests |
| `user_service_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency distribution |
| `nodejs_*` | Various | — | Default Node.js metrics (heap, event loop, GC) |

## Security

- Passwords hashed with bcryptjs (10 salt rounds by default)
- JWT tokens with configurable expiration
- Helmet security headers enabled
- All configuration via environment variables (never hardcoded)
- Input validation on all endpoints via Zod
- Non-root user in Docker container
- No sensitive data in log output

## Database Migrations

```bash
# Create a new migration after schema changes
npm run prisma:migrate:dev -- --name your_migration_name

# Apply migrations in production
npm run prisma:migrate

# Reset database (development only)
npx prisma migrate reset
```

The service automatically connects to the database on startup and verifies connectivity.
