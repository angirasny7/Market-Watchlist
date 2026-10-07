# SignalLens — Backend Service

High-performance, production-ready backend engine for **SignalLens — Market Change Intelligence** built with **Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL**.

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
| `ENABLE_INTERNAL_CRON` | Set `true` to enable automatic background scheduler locally (2m quote sync during market hours, 5m pipeline, 15m news sync) | `true` |
| `SEED_DEMO_EVENTS` | Set `true` in development to seed realistic upcoming corporate demo events | `false` |

> **Local Development Note**: `ENABLE_INTERNAL_CRON=true` (or leaving it default/unset) enables automatic background synchronization crons on your machine. If disabled (`ENABLE_INTERNAL_CRON=false`), you can manually trigger a full synchronization cycle on demand via `POST /api/internal/run-pipeline`.

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

### Step 6: Audit Market Data Integrity & Freshness (Dev Tool)
Run the built-in integrity auditor to verify live vs database quotes, staleness flags, and seed patterns:
```bash
npm run check:data
```

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
    "email": "alex@example.com",
    "password": "Alex@123"
  }
  ```
- `GET /api/auth/me` — Retrieve authenticated user profile and userState. (Requires `Authorization: Bearer <token>`)
- `PATCH /api/auth/heartbeat` — Refresh user cursor `lastActivityAt`. (Requires `Authorization: Bearer <token>`)

### Watchlists (`/api/watchlists` & `/api/watchlist`)

#### Multi-Watchlist API (Phase 1)
- `GET /api/watchlists` — Retrieve all user watchlists with `stockCount`, `isDefault`, and timestamps.
- `POST /api/watchlists` — Create a new named watchlist (`{ "name": "Growth Bets" }`). Limit: max 10 watchlists per user, 1-40 chars, case-insensitive unique names.
- `PATCH /api/watchlists/:id` — Rename a watchlist (`{ "name": "Tech Titans" }`).
- `DELETE /api/watchlists/:id` — Delete a watchlist (the default watchlist and the user's sole watchlist cannot be deleted).
- `POST /api/watchlists/:id/stocks` — Add a stock to a watchlist (`{ "symbol": "TATAMOTORS" }`). Max 50 stocks per watchlist, no duplicates within a watchlist.
- `DELETE /api/watchlists/:id/stocks/:symbol` — Remove a stock from a watchlist.
- `PATCH /api/watchlists/:id/stocks/:symbol/pin` — Toggle pin status for a stock in a watchlist.

#### Aggregated Overview Endpoints (Phase 1)
- `GET /api/watchlists/:id/overview?range=1D|1W|1M` — Aggregated overview for a specific watchlist.
- `GET /api/watchlists/all/overview?range=1D|1W|1M` — Union of all user watchlists, deduplicated by symbol.

Both overview endpoints return in **one single round-trip**:
- `stocks[]`: `symbol`, `companyName`, `sector`, `exchange`, `currency`, `currentPrice`, `changeAmount`, `changePercent`, `isPinned`, `addedAt`, `attentionLevel`, `attentionScore`, `unseenUpdatesCount`, `nextEvent`, `activeAlertCount`, `sparkline` (array of numbers for requested range), `watchlistIds`.
- `summary`: `totalStocks`, `needAttention` (CRITICAL + HIGH), `upcomingEvents`, `activeAlerts`, `unseenUpdates`.
- `dataFreshness`: `{ lastSyncedAt, isStale }`.

#### Attention Scoring Thresholds & Priority Distribution
Calibrated in `attentionScoringService.ts` to ensure Urgent (CRITICAL) events remain rare and actionable:
- **CRITICAL (Urgent)**: Attention score $\ge 85$ (e.g. violent $\ge 12\%$ move, $\ge 4\times$ volume spike, major earnings shock, active user alert triggered)
- **HIGH (Important)**: Attention score $\ge 65$ (e.g. break of 52W high/low, $\ge 6\%$ move with elevated volume, earnings beat/miss)
- **MEDIUM (Worth a look)**: Attention score $\ge 40$ (e.g. 3% – 6% move, 1.5x – 2.5x volume, corporate actions)
- **LOW (FYI)**: Attention score $< 40$ (standard volatility, minor dividend notice, normal trading session)

#### Legacy Endpoints (Maintained for Backward Compatibility)
- `GET /api/watchlist` — Retrieve default watchlist with stocks array.
- `POST /api/watchlist/setup` — Initial onboarding setup (`{ "name": "...", "symbols": [...] }`).
- `POST /api/watchlist/add-stock` — Add to default watchlist.
- `DELETE /api/watchlist/remove-stock` — Remove from default watchlist.
- `PATCH /api/watchlist/pin-stock` — Toggle pin in default watchlist.

### Stocks & News (`/api/stocks` & `/api/news`)
- `GET /api/stocks` — Query canonical master stock catalog (`?sector=&exchange=&search=`).
- `GET /api/stocks/:symbol` — Get detailed quote, 30-day historical prices, active news, and events.
- `GET /api/stocks/:symbol/history?range=1D|1W|1M|1Y|ALL` — Historical OHLCV candlesticks for TradingView `lightweight-charts`. Cached in-memory with TTL (5m for intraday `1D`/`1W`, 1h for multi-day `1M`/`1Y`/`ALL`).
- `GET /api/news` — Ingested regulatory disclosures and news articles (`?symbol=&limit=`).
- `GET /api/news/:id` — Single news item detail.

### Alerts (`/api/alerts`) (Phase 4)
- `GET /api/alerts` — List authenticated user's price and attention alerts with associated stock quotes.
- `POST /api/alerts` — Create alert:
  ```json
  {
    "stockSymbol": "RELIANCE.NS",
    "alertType": "PRICE_ABOVE", // 'PRICE_ABOVE' | 'PRICE_BELOW' | 'DAY_CHANGE_PCT' | 'ATTENTION_LEVEL'
    "targetValue": 3100.00
  }
  ```
- `PATCH /api/alerts/:id` — Update alert (`{ "isActive": true, "targetValue": 3150.00 }`).
- `DELETE /api/alerts/:id` — Delete alert.

### Notifications (`/api/notifications`) (Phase 4)
- `GET /api/notifications?limit=20` — Retrieve user's recent notifications, unread first.
- `GET /api/notifications/unread-count` — Count of unread notifications for badge display.
- `PATCH /api/notifications/:id/read` — Mark a single notification as read.
- `PATCH /api/notifications/read-all` — Mark all user notifications as read.

### Corporate Events & Next Event Sync (Phase 5)
- Stored in `corporate_events` table (`CorporateEvent` model: `stockSymbol`, `eventType` [EARNINGS, DIVIDEND, SPLIT, AGM], `eventDate`, `title`, `details`).
- Automatically seeded for popular stocks in dev/demo if upcoming events < 3.
- Populated into `GET /api/watchlists/:id/overview` and `all/overview` as `nextEvent: { type, date, label }`.
- Events within 3 days are highlighted with an amber pulsating dot indicator in the UI.

### Attention Feed & Clustering (`/api/feed`) (Phase F0 & Rebuild)
- `GET /api/feed` — Query clustered feed items (1 item per stock per calendar day). Supports `window=sinceLastVisit|24h|7d|30d`, `watchlistId=`, `symbol=`, `priority=`, `type=`, `unreadOnly=true`, `savedOnly=true`, `q=`, cursor pagination (`cursor=`, `limit=`).
- `GET /api/feed/summary` — High-level summary sentence ("You were away N days · X updates across Y stocks · Z need attention"), count breakdowns by priority, and data freshness / delay metadata.
- `GET /api/feed/items/:id/details?tab=happened|why|matters|sources|price|alert|all` — Lazy-computed tab details for progressive disclosure details drawer.
- `POST /api/feed/mark-read` — Mark all or specified item clusters as read.
- `POST /api/feed/items/:id/mark-read` — Mark single item cluster as read.
- `POST /api/feed/items/:id/save` — Toggle saved bookmark status for an item.
- `POST /api/feed/caught-up` — Advance user session cursor and mark all current events read.

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

---

## 6. External Pipeline Trigger & "While You Were Away" Catch-Up

### Automated Pipeline Trigger (`POST /api/internal/run-pipeline`)
Render free tier instances sleep after inactivity. To guarantee continuous synchronization regardless of idle sleep:
- An external cron worker or GitHub Action invokes `POST /api/internal/run-pipeline` every 15 minutes.
- Protected by the `x-cron-secret` HTTP header which must match the `CRON_SECRET` environment variable. Returns `401 Unauthorized` on mismatch and `503 Service Unavailable` if `CRON_SECRET` is unset.
- Concurrency protected: if an execution cycle is currently running, subsequent calls return `409 Conflict`.
- Internal node-cron can be toggled using `ENABLE_INTERNAL_CRON=false`.

### "While You Were Away" Catch-Up Engine (`catchUpService.ts`)
When a user logs in or views their dashboard after an absence (> 30 minutes since their last session cursor):
1. **Lightweight Quote Refresh**: If the last global quote sync is older than 30 minutes, real-time quotes are immediately updated for the user's tracked watchlist stocks.
2. **Historical Bar Reconstruction**: Historical daily price bars covering the absence period (`min(daysSince + 25, 365)`) are evaluated against anomaly thresholds (±5% day price change, 2x 20D volume spikes, 52-week high/low proximity).
3. **Cumulative Absence Returns**: Detects total drift since the last visit; if `|price now vs price at since| >= 8%`, a cumulative event is synthesized (`"TCS is +12% since your last visit"`).
4. **Calendar-Day Deduplication**: All reconstructed events deduplicate idempotently on `(stockSymbol, eventType, calendarDate)`.
5. **Gap Digests**: Synthesizes one digest per missed trading day (if gap $\le$ 7 days) or a consolidated summary dossier (if gap > 7 days), with no minimum event threshold.
6. **Non-blocking Execution**: The dashboard caps reconciliation at ~8 seconds; if historical data takes longer, current data returns with `dataFreshness: { isStale: true }` and background completion updates on the next refresh.

---

## 7. Session & Last-Visit Model

The Attention Feed and Dashboard calculate "What happened while you were away" based on a strict, server-side temporal model:

1. **`lastLogoutAt`**: Recorded explicitly when `POST /api/auth/logout` is called (the frontend fires this on logout and on window close via `navigator.sendBeacon` or `keepalive` fetch).
2. **`lastActivityAt`**: Maintained by the `activityTracker` middleware, throttled to at most once per minute per user, augmented by lightweight heartbeat pings (`PATCH /api/auth/heartbeat`) while the application tab remains visible.
3. **Session Demarcation**:
   - A new session starts upon user login (`POST /api/auth/login`), or when an authenticated request arrives after an inactivity gap exceeding 30 minutes (`now - lastActivityAt > 30 min`).
4. **`previousSessionEndedAt`**:
   - Evaluated **once** at the inception of a new session as $\max(\text{lastLogoutAt}, \text{lastActivityAt of previous session}, \text{lastSeenAt})$.
   - Stored deterministically in `user_states.previousSessionEndedAt`.
   - **Stability Guarantee**: It is *never* recomputed on page reloads, tab navigation, or subsequent queries during the active session.
5. **"Since Last Visit" Window**:
   - Defined precisely as $[\text{previousSessionEndedAt}, \text{now}]$.
   - If the user closed the browser tab without clicking logout, $\text{previousSessionEndedAt}$ equals their last recorded activity timestamp, never the re-login time.
6. **Caught-Up Cursor (`caughtUpAt`)**:
   - The user's catch-up baseline advances *only* when the user explicitly clicks "I'm caught up" (`POST /api/feed/caught-up`), which can be undone within 5 seconds (`POST /api/feed/caught-up/undo`).
   - Merely logging in, opening the feed, or navigating tabs *never* marks items as read.
7. **Full Multi-Device Synchronization**:
   - Read states (`user_event_reads`), saved items (`user_saved_events`), caught-up timestamp (`caughtUpAt`), and session bounds are 100% persisted in PostgreSQL. Logging in on Device B displays the exact same read, unread, and baseline state as Device A.


