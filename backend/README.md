# Smart Market Watchlist — Backend Service

High-performance, production-ready backend engine for **Smart Market Watchlist** built with **Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL**.

---

## 1. Architectural Highlights

- **Decoupled Relational Hierarchy**:
  - `Stock` holds canonical real-time price action, 52-week metrics, volume, and sparkline data once per ticker, eliminating write amplification across concurrent users.
  - `WatchlistStock` acts as a lightweight join table (`watchlistId`, `stockSymbol`, `isPinned`, `addedAt`).
  - `News` stores financial media disclosures and exchange filings (*Economic Times*, *Bloomberg*, *BSE Filings*) directly tied to canonical stocks.
  - `UserState` tracks per-user session cursors (`lastLoginAt`, `lastActivityAt`, `lastDigestViewedId`) for exact "What changed since you last visited?" delta computation.
  - `Event` & `Insight` form the core cognitive anomaly $\to$ causal explanation triad.
  - `Digest`, `DigestEvent`, and `DigestInsight` maintain immutable historical market intelligence dossiers.
- **Provider Abstraction Layer (`src/providers/`)**:
  - `marketDataProvider.ts` with `IMarketDataProvider` supporting pluggable adapters for **Yahoo Finance, Alpha Vantage, Finnhub, Twelve Data, and Polygon.io**.
  - `newsProvider.ts` with `INewsProvider` supporting pluggable adapters for **NewsAPI, Exchange RSS, and Direct Webhooks**.
- **Security & Authentication**:
  - Password hashing with bcrypt.
  - JWT token generation (7-day validity).
  - Protected route middleware (`authenticateJwt`) and permissive demo mode (`optionalAuthenticateJwt`).

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server listening port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/smart_market_watchlist?schema=public` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `smart_market_watchlist_jwt_secret_key_2026_super_secure_production_grade` |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `CORS_ORIGIN` | Allowed client origin | `http://localhost:5173` |

---

## 3. Local Development Setup

### Step 1: Start PostgreSQL with Docker Compose
```bash
docker compose up -d
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Generate Prisma Client & Run Migrations
```bash
# Generate typed Prisma client
npx prisma generate

# Apply migrations to database
npm run prisma:migrate
# or push schema directly:
npm run prisma:push
```

### Step 4: Seed Initial Data
Populate the database with canonical master stocks, news, events, insights, digests, and demo user:
```bash
npm run prisma:seed
```

To seed historical events and price checkpoints for backtesting verification (demo-only backfilled data, not real market history):
```bash
npm run prisma:seed-historical-demo
```

### Step 5: Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

---

## 4. REST API Endpoint Reference

### Health Check
- `GET /api/health` — Service liveness and uptime check.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Create user account, default watchlist, and initial cursor.
  ```json
  {
    "email": "trader@marketwatch.pro",
    "password": "SecurePassword123!",
    "name": "Alex Trader"
  }
  ```
- `POST /api/auth/login` — Authenticate and receive JWT token.
  ```json
  {
    "email": "alex1@example.com",
    "password": "Alex1@123"
  }
  ```
- `GET /api/auth/me` — Retrieve authenticated user profile and userState. (Requires `Authorization: Bearer <token>`)
- `PATCH /api/auth/heartbeat` — Refresh user cursor `lastActivityAt`. (Requires `Authorization: Bearer <token>`)

### Watchlist (`/api/watchlist`)
- `GET /api/watchlist` — Retrieve user watchlist joined with master stocks and active catalysts.
- `POST /api/watchlist` — Create a new named watchlist (`{ "name": "EV Breakouts" }`).
- `POST /api/watchlist/add-stock` — Add stock by symbol (`{ "symbol": "SUZLON" }`).
- `DELETE /api/watchlist/remove-stock` — Remove stock from watchlist (`{ "symbol": "TATAMOTORS" }`).
- `PATCH /api/watchlist/pin-stock` — Toggle pin status (`{ "symbol": "INFY" }`).

### Stocks & News (`/api/stocks` & `/api/news`)
- `GET /api/stocks` — Query canonical master stock catalog (`?sector=&exchange=&search=`).
- `GET /api/stocks/:symbol` — Get detailed quote, 30-day historical prices, active news, and events.
- `GET /api/news` — Ingested regulatory disclosures and news articles (`?symbol=&limit=`).
- `GET /api/news/:id` — Single news item detail.

### Events & Attention Feed (`/api/events`)
- `GET /api/events` — Query market anomaly events (`?priority=&eventType=&sinceLastVisit=true&unreadOnly=false`).
- `GET /api/events/:symbol` — Events for a specific stock.
- `PATCH /api/events/:id/read` — Mark an event as read.
- `PATCH /api/events/:id/acknowledge` — Acknowledge event and mark read.

### Insights (`/api/insights`)
- `GET /api/insights` — Query synthesized causal explanations (`?minConfidence=0.80&limit=10`).
- `GET /api/insights/:eventId` — Insights linked to an event.

### Market Memory & Digests (`/api/digests`)
- `GET /api/digests` — Historical intelligence dossiers (`?mood=&search=`).
- `GET /api/digests/:id` — Complete digest with constituent events, insights, and forward returns.
- `PATCH /api/digests/:id/view` — Mark digest as viewed and update `UserState.lastDigestViewedId`.
- `PATCH /api/digests/:id/read` — Mark digest as read.

---

## 5. Build Verification

```bash
# Build TypeScript to production JavaScript
npm run build
```
Emits clean, strictly-typed JavaScript into `backend/dist/`.
