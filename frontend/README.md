# Food Delivery Frontend

Single-page application for the Food Delivery System. Built with React (Vite) and served by Nginx in Docker.

## Pages

| Route | Description | Auth |
|-------|-------------|------|
| `/login` | Email + password login form | No |
| `/register` | Registration form (name, email, password, role) | No |
| `/restaurants` | List all restaurants | No |
| `/restaurants/:id` | Restaurant details + menu items | No |
| `/order` | Place an order (select restaurant, pick items, enter address) | Yes |
| `/orders` | Customer's order history with statuses | Yes |
| `/order/:id` | Single order detail with status history (polls every 10s) | Yes |

## Tech Stack

- **React 19** with Vite 6
- **React Router 7** for client-side routing
- **Plain CSS** — no UI framework
- **Nginx** for production serving
- **Docker** multi-stage build

## Quick Start (Development)

```bash
cd frontend
cp .env.example .env         # edit VITE_API_URL to your API Gateway
npm install
npm run dev                  # http://localhost:5173
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | API Gateway base URL |

Set `VITE_API_URL` in `.env` for local dev, or pass it as a Docker build arg:

```bash
docker build --build-arg VITE_API_URL=http://api-gateway:3000 -t food-delivery-frontend .
```

## Docker

### Build

```bash
docker build -t food-delivery-frontend .
```

### Build with custom API URL

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -t food-delivery-frontend .
```

### Run

```bash
docker run -p 8080:80 food-delivery-frontend
```

Open http://localhost:8080.

### Nginx Config

The Nginx configuration (`nginx.conf`):

- Serves static assets from `/usr/share/nginx/html`
- SPA fallback: all non-file routes serve `index.html`
- Gzip enabled for text-based assets
- API proxy block is included but commented out — uncomment to proxy `/api/*` through Nginx instead of calling the gateway directly from the browser

## API Integration

All API calls go to `VITE_API_URL`. The app:

1. Stores the JWT token in `localStorage` after login/register
2. Attaches the token as `Authorization: Bearer <token>` on all subsequent requests
3. Parses the API response format: `{ data: ... }` on success, `{ error: { code, message } }` on failure
4. Shows loading spinners during requests and error messages on failure

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/restaurants` | List restaurants |
| GET | `/restaurants/:id` | Restaurant details |
| GET | `/restaurants/:id/menu` | Menu items |
| POST | `/orders` | Create order |
| GET | `/orders/customer/:id` | Customer's orders |
| GET | `/orders/:id` | Order detail + status history |

## Project Structure

```
frontend/
├── .dockerignore
├── .env.example
├── Dockerfile
├── index.html
├── nginx.conf
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                  # Entry point
    ├── App.jsx                   # Router + layout
    ├── App.css                   # All styles
    ├── api.js                    # Fetch wrapper with JWT auth
    ├── context/
    │   └── AuthContext.jsx       # Auth state + localStorage
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Restaurants.jsx
        ├── RestaurantDetail.jsx
        ├── PlaceOrder.jsx
        ├── Orders.jsx
        └── OrderDetail.jsx
```
