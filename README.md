# Smart Market Watchlist

> **A watchlist that tells you what changed, why it changed, and whether it matters — not just the latest price.**

Built for **CODE 2026 Hackathon**.

---

## 1. Problem Statement

Traditional stock market watchlists are passive tabular data feeds that display green and red tickers, fluctuating percentage numbers, and raw volume counts. When an investor returns to their screen, these interfaces fail to answer the three most critical questions: *What happened while I was away?*, *Why did it happen?*, and *Does it actually matter for my portfolio?* Consequently, investors are forced to manually scour scattered news portals, regulatory filing portals, and discussion forums to stitch together causal explanations for unexpected volatility.

---

## 2. What This Project Does

Smart Market Watchlist transforms raw market volatility into actionable, evidence-grounded intelligence structured around a three-question cognitive framework:

```
┌─────────────────┐       ┌───────────────────────┐       ┌──────────────────────┐
│  WHAT HAPPENED? │  ──>  │  WHY DID IT HAPPEN?   │  ──>  │ DOES IT MATTER?      │
│  Anomaly Engine │       │  Context Enrichment   │       │ Empirical Patterns   │
└─────────────────┘       └───────────────────────┘       └──────────────────────┘
```

1. **What Happened? (Automated Anomaly Detection)**: Continuously scans watched equities and flags statistically abnormal price action, volume surges, or corporate milestones using a deterministic 6-rule engine.
2. **Why Did It Happen? (Context Enrichment Engine)**: Gathers corroborated evidence from real-time news disclosures and official exchange filings, producing multi-factor confidence scores and factual causal drivers before routing users to external verification.
3. **Does It Matter? (Empirical Historical Pattern Analysis)**: Queries historical price databases to compute forward return probabilities, win rates, and 5-day drift distributions based on how the stock historically reacted to similar catalysts.

### Key Implemented Features

- **Watchlist Management**: Add, remove, and pin stocks in personalized watchlists with both Grid and Table view modes. Single-write master stock architecture ensures real-time price updates propagate without database write amplification.
- **Change Detection Engine (`changeDetectionJob.ts`)**: Evaluates all active stock quotes in PostgreSQL on a recurring background cycle with a 4-hour event deduplication window against 6 concrete anomaly rules:
  - **Rule 1: Price Surge** — Intraday price change $\ge +5.0\%$
  - **Rule 2: Price Drop** — Intraday price change $\le -5.0\%$
  - **Rule 3: Volume Spike** — Trading volume $\ge 2.0\times$ the 20-day historical average (or elevated at $\ge 1.5\times$)
  - **Rule 4: 52-Week High** — Current price within $0.5\%$ of or exceeding the 52-week peak (`currentPrice >= high52w * 0.995`)
  - **Rule 5: 52-Week Low** — Current price within $0.5\%$ of or breaching the 52-week floor (`currentPrice <= low52w * 1.005`)
  - **Rule 6: News Catalyst Detection** — Keyword matching across recent news covering both earnings (`earnings`, `q1`–`q4`, `profit`) classifying events into `EARNINGS_BEAT` or `EARNINGS_MISS` based on sentiment and price movement, and capital distribution (`dividend`, `bonus`, `buyback`) generating `DIVIDEND_ANNOUNCED` events
- **Attention Scoring (`attentionScoringService.ts`)**: Computes a dynamic 0–100 attention score and assigns priority tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) factoring in price magnitude, volume ratio, and anomaly category.
- **Context Enrichment & Confidence Scoring (`contextEnrichmentService.ts`, `confidenceScoringService.ts`)**: Derives deterministic, non-fabricated confidence scores (0–100) based on weighted evidence:
  - News coverage presence: up to 25 pts
  - Official exchange filings / regulatory disclosures: up to 26 pts
  - Volume confirmation ratio: up to 14 pts
  - Price movement magnitude: up to 15 pts
  - Multi-source corroboration: up to 10 pts
  - *Strict Safety Fallback*: If zero verified evidence exists, the summary defaults strictly to `"Supporting evidence currently unavailable."` with empty drivers.
- **Personalized Market Intelligence Digests (`digestGenerationJob.ts`, `digestService.ts`)**: Generates periodic executive dossiers synthesizing top market anomalies, benchmark index closes (Nifty 50, Sensex, India VIX), and per-stock forward performance drift.
- **Market Memory Archive (`memoryService.ts`)**: Long-term archive for historical intelligence dossiers, saved events, and acknowledged insights with full search and status filtering.
- **Since-Last-Visit Tracking (`sinceLastVisitService.ts`)**: Tracks per-user session timestamps (`lastActivityAt`, `lastLoginAt`, `previousLoginAt`) to compute an exact delta: duration away, new anomalies detected since last departure, unread critical alerts, and new digests.
- **Cross-Device Continuity & JWT Auth (`authService.ts`)**: Full registration, login, device-type tracking (Desktop, Mobile, Tablet), and 180-day finite JWT authentication.

---

## 3. What's Real vs. Simulated

To guarantee both production viability and reliable, zero-dependency offline judging, the system cleanly separates live integrations from simulated fallbacks via a provider abstraction layer.

| Layer / Feature | Real Implementation | Simulated / Mock Fallback | Notes |
| :--- | :--- | :--- | :--- |
| **Market Quotes** | `YahooFinanceProvider`<br>(Live quotes via `yahoo-finance2` for NSE/BSE and US stocks) | `SimulatedMarketDataProvider`<br>(Deterministic variations based on seed stock catalog) | Defaults to live Yahoo Finance and live RSS feeds (MARKET_PROVIDER/NEWS_PROVIDER unset). Set MARKET_PROVIDER=simulated and NEWS_PROVIDER=simulated if you'd prefer offline, rate-limit-free evaluation with deterministic demo data instead. |
| **Financial News & Disclosures** | `NewsApiProvider`<br>(Live RSS feeds via `rss-parser` from Google News, Economic Times, Yahoo Finance) | `SimulatedNewsProvider`<br>(Pre-seeded realistic contextual news disclosures) | Configurable via `NEWS_PROVIDER=rss` or `simulated`. Defaults to live RSS feeds when unset. |
| **Benchmark Indices in Digests** | Live Yahoo Finance quotes for `^NSEI` (Nifty 50), `^BSESN` (Sensex), `^INDIAVIX` (India VIX) | Returns null for any benchmark index that fails to fetch (verified via forced-failure testing), rather than caching a stale value or fabricating one. | Real index values and percentage changes embedded in synthesized digests. |
| **Forward Return Calculations** | `historicalPatternService.ts`<br>Empirically computes forward returns and win rates from `StockPriceHistory` table rows | Returns `null` when empirical sample size is $< 5$ (zero fabrication) | Run `npm run prisma:seed-historical-demo` to populate historical sample bars for demo backtesting. |
| **Database & Persistence** | PostgreSQL via Prisma ORM (`Stock`, `Event`, `Insight`, `Digest`, `User`, `UserState`) | None | 100% live database persistence for all user watchlists, events, and insights. |
| **Top-Level Highlights Banner** | None | `src/data/mockMarket.ts`<br>(Macro alerts, sector performance heatmap, broad index tiles) | The top Highlights banner uses static mock data on the frontend; individual stock data, the Attention Feed, Insights, and Digests are 100% backend-driven. |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (PORT 3000)                          │
│     React 18  •  Vite 6  •  TypeScript  •  Tailwind CSS  •  Zustand     │
│  [Watchlist View]     [Attention Feed]     [Market Memory]  [Highlights]│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST (/api)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (PORT 5000)                          │
│               Node.js 22  •  Express 4  •  TypeScript                   │
│                                                                         │
│  ┌───────────────────────┐   ┌───────────────────────────────────────┐  │
│  │   REST API Routes     │   │     Background Pipeline Scheduler     │  │
│  │  • /api/auth          │   │  (Sequential execution every 5 mins)  │  │
│  │  • /api/stocks        │   │  1. syncStocksJob (Quote sync)        │  │
│  │  • /api/watchlist     │   │  2. changeDetectionJob (Anomaly scan) │  │
│  │  • /api/events        │   │  3. insightGenerationJob (Causal AI)  │  │
│  │  • /api/insights      │   │  4. digestGenerationJob (Dossiers)    │  │
│  │  • /api/digests       │   │  + newsSyncJob (Every 15 mins)        │  │
│  │  • /api/memory        │   └───────────────────────────────────────┘  │
│  └───────────┬───────────┘                                              │
│              │                                                          │
│  ┌───────────┴───────────────────────────────────────────────────────┐  │
│  │                     Provider Abstraction Layer                    │  │
│  │    IMarketDataProvider: YahooFinanceProvider / SimulatedMarket    │  │
│  │    INewsProvider: NewsApiProvider (RSS) / SimulatedNews           │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────┘
                                       │ Prisma ORM 6
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL 16 (PORT 5432)                       │
│    Docker Container: smart_market_postgres (Database: smart_market_...) │
└─────────────────────────────────────────────────────────────────────────┘
```

### Background Pipeline Scheduling (`scheduler.ts`)
- **Market Intelligence Pipeline (`*/5 * * * *` — every 5 minutes)**:
  1. `syncStocksJob`: Pulls latest price, volume, and intraday delta; writes historical price snapshot to `StockPriceHistory`.
  2. `changeDetectionJob`: Runs 6 anomaly rules against active stocks; deduplicates against events within 4 hours; creates `Event` records with attention scores.
  3. `insightGenerationJob`: Resolves attributed evidence; calculates deterministic confidence scores; queries empirical historical patterns; creates `Insight` records.
  4. `digestGenerationJob`: Pulls benchmark indices; computes per-stock forward performance; creates `Digest` records.
- **News Sync Job (`*/15 * * * *` — every 15 minutes)**: Fetches and indexes recent financial news items against master tickers.
- **Boot Warm-Up**: Triggers an initial execution of both pipelines 1 second after server boot.

---

## 5. Tech Stack

### Frontend
- **Framework**: React `^18.3.1`, React DOM `^18.3.1`
- **Build Tool**: Vite `^6.1.0`
- **Routing**: React Router DOM `^6.29.0`
- **State Management**: Zustand `^5.0.3`
- **Styling**: Tailwind CSS `^3.4.17`, Autoprefixer `^10.4.20`, PostCSS `^8.5.2`, Clsx `^2.1.1`, Tailwind Merge `^2.6.0`
- **Icons**: Lucide React `^0.475.0`
- **Language**: TypeScript `^5.7.3`

### Backend
- **Runtime**: Node.js `20+` (tested on Node `v22.18.0`)
- **Web Framework**: Express `^4.21.2`
- **Language & Execution**: TypeScript `^5.7.3`, tsx `^4.19.3`
- **Security & Utilities**: CORS `^2.8.5`, Dotenv `^16.4.7`

### Database & ORM
- **Database Engine**: PostgreSQL 16 Alpine (`postgres:16-alpine`)
- **ORM**: Prisma Client & CLI `^6.4.1`

### Authentication
- **Tokens**: `jsonwebtoken` `^9.0.2` (180-day finite lifespan)
- **Hashing**: `bcryptjs` `^3.0.2`

### External Data & Scheduling
- **Market Quotes**: `yahoo-finance2` `^4.0.2`
- **News Feeds**: `rss-parser` `^3.13.0`
- **Cron Jobs**: `node-cron` `^4.6.0`

---

## 6. Setup Instructions

Follow these steps to run the complete stack locally. The entire setup takes under 5 minutes.

### Prerequisites
- **Node.js**: v20.x or higher (`node -v`)
- **npm**: v10.x or higher (`npm -v`)
- **Docker & Docker Compose**: For local PostgreSQL container (or an accessible PostgreSQL 15/16 database)

---

### Step 1: Clone Repository
```bash
git clone <repo-url>
cd "Smart Market Watchlist"
```

---

### Step 2: Backend Setup & Database

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   **Environment Variable Reference (`backend/.env`):**
   | Variable | Description | Recommended Demo Value |
   | :--- | :--- | :--- |
   | `PORT` | Backend HTTP port | `5000` |
   | `NODE_ENV` | Runtime environment | `development` |
   | `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/smart_market_watchlist?schema=public` |
   | `JWT_SECRET` | Secret key for signing auth tokens | Pre-populated secure random string |
   | `JWT_EXPIRES_IN` | JWT token validity lifespan | `180d` |
   | `CORS_ORIGIN` | Allowed frontend origins | `http://localhost:3000,http://localhost:5173` |
   | `MARKET_PROVIDER` | Market quote provider (`simulated` or `yahoo`) | Leave unset (defaults to live Yahoo Finance); optional override: `simulated` for offline evaluation |
   | `NEWS_PROVIDER` | News feed provider (`simulated` or `rss`) | Leave unset (defaults to live RSS feeds); optional override: `simulated` for offline evaluation |
   | `NEWS_API_KEY` | Optional API key for NewsAPI | Leave blank when using default live RSS or `simulated` |

   > **Recommendation for Evaluators**: Defaults to live Yahoo Finance and live RSS feeds (MARKET_PROVIDER/NEWS_PROVIDER unset). Set MARKET_PROVIDER=simulated and NEWS_PROVIDER=simulated if you'd prefer offline, rate-limit-free evaluation with deterministic demo data instead.

3. Start PostgreSQL with Docker Compose:
   ```bash
   docker compose up -d
   ```

4. Install backend dependencies:
   ```bash
   npm install
   ```

5. Push database schema:
   ```bash
   npm run prisma:push
   ```

6. Seed initial master data:
   ```bash
   npm run prisma:seed
   ```
   *What this does*: Populates 10 master stocks (Tata Motors, Infosys, TCS, Reliance, HDFC Bank, Apple, Suzlon, Zomato, Larsen & Toubro, ITC), news items, initial anomaly events, evidence-grounded insights, historical market memory digests, and the pre-configured demo user.

7. Seed historical backtesting data:
   ```bash
   npm run prisma:seed-historical-demo
   ```
   *What this does*: Backfills historical event samples (7–10 days old) and corresponding price history checkpoints so that `historicalPatternService` has $\ge 5$ empirical samples to compute genuine forward probabilities during demo evaluation.

8. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will start at `http://localhost:5000`.

---

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the project root:
   ```bash
   cd "Smart Market Watchlist"
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   Vite will serve the frontend application at **`http://localhost:3000`**.

---

### Step 4: Verify It's Working

1. **Backend Health Check**:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected response: `{"status":"healthy","service":"smart-market-watchlist-backend",...}`

2. **Provider Status Check**:
   ```bash
   curl http://localhost:5000/api/providers/status
   ```
   Expected response (live defaults): `{"marketProvider":"yahoo","marketConnected":true,"newsProvider":"rss","newsConnected":true}` (or `"simulated"` if configured as simulated)

3. **Open Application**: Navigate to `http://localhost:3000` in your browser.

4. **Sign In with Demo Account**:
   - **Email**: `alex1@example.com`
   - **Password**: `Alex1@123`

   > **Tip**: You can also click **Create Account** to register your own account and test the application with your own credentials if you prefer not to use the shared demo account.

5. **Verify Core Features**:
   - **Since-Last-Visit Banner**: Displays "Away for 5 days" with calculated event deltas.
   - **Watchlist**: View 6 pre-loaded stocks with pinned items (`TATAMOTORS`, `INFY`). Toggle between Grid and Table views.
   - **Attention Feed**: Examine generated events with priority badges, multi-factor confidence scores (e.g. `78%`, `88%`), and factual causal drivers.
   - **Verify Button**: Click "Verify" on any event card to confirm that external links open official regulatory or exchange announcements in a new tab without altering internal state.
   - **Market Memory**: Click the "Memory" tab to view historical intelligence dossiers and forward return patterns.

---

## 7. Project Structure

```
Smart Market Watchlist/
├── backend/                         # Backend Express + TypeScript service
│   ├── docker-compose.yml           # PostgreSQL 16 container definition
│   ├── package.json                 # Backend dependencies and execution scripts
│   ├── prisma/
│   │   ├── schema.prisma            # Relational database schema definition
│   │   ├── seed.ts                  # Master catalog and demo user seeder
│   │   └── seedHistoricalDemoData.ts# Historical pattern sample seeder
│   ├── scripts/                     # Operational build and maintenance scripts
│   └── src/
│       ├── config/                  # Environment and Prisma client singletons
│       ├── controllers/             # Express route controllers
│       ├── data/                    # Master stock catalog definitions
│       ├── jobs/                    # Scheduled cron pipelines (sync, detection, digest)
│       ├── middleware/              # JWT auth and activity tracker middleware
│       ├── providers/               # Market & News provider abstraction layer
│       ├── routes/                  # API endpoint route definitions
│       ├── services/                # Core business logic & scoring engines
│       └── utils/                   # Device parsers and JSON formatters
├── src/                             # Frontend React + TypeScript application
│   ├── components/
│   │   ├── auth/                    # Login, registration, and session modal
│   │   ├── feed/                    # Attention Feed, Triad cards, filter bar
│   │   ├── highlights/              # Market overview and macro indicators
│   │   ├── layout/                  # Navigation header, since-last-visit banner
│   │   ├── memory/                  # Market Memory archive and digest drawer
│   │   └── watchlist/               # Watchlist table, grid, stock search modal
│   ├── data/                        # Frontend fallback data and starter templates
│   ├── lib/                         # Device detection and UI utility helpers
│   ├── pages/                       # Root views (Watchlist, Feed, Memory, Highlights)
│   ├── services/                    # Frontend HTTP client and data adapters
│   ├── store/                       # Zustand state stores (Market, Auth, Toast)
│   └── types/                       # Shared TypeScript interfaces (Stock, Event, Digest)
├── index.html                       # HTML application entrypoint
├── package.json                     # Frontend dependencies and Vite scripts
├── tailwind.config.js               # Tailwind CSS theme configuration
├── tsconfig.json                    # Frontend TypeScript configuration
└── vite.config.ts                   # Vite build and server configuration (Port 3000)
```

---

## 8. Design Decisions & Trade-Offs

1. **Deterministic Rule Engine over Opaque LLM Anomaly Detection**:
   - *Rationale*: Financial anomaly detection requires mathematical precision, absolute reproducibility, and sub-millisecond execution. Using deterministic thresholds ($\pm 5\%$ price moves, $\ge 1.5\times$ volume surges) guarantees that every event is 100% explainable without hallucination or token latency.
2. **Attributed Evidence over Generative Summaries**:
   - *Rationale*: Rather than prompting an LLM to guess why a stock moved, the context enrichment engine matches real exchange filings, regulatory disclosures, and verified financial news articles. If no source exists, it enforces a strict safety fallback: `"Supporting evidence currently unavailable."`
3. **Periodic Snapshot Cadence over Tick-by-Tick Storage**:
   - *Rationale*: Storing high-frequency tick data produces massive database write amplification without adding cognitive value for swing traders or retail investors. A 5-minute snapshot pipeline coupled with 20-day moving averages provides high-fidelity swing and intraday context while maintaining low database overhead.
4. **Honest Nulls over Fabricated Statistics**:
   - *Rationale*: When querying historical patterns for rare event types with fewer than 5 historical samples in the database, the engine strictly outputs `null` for `historicalPattern` and `forwardProbability`, rather than synthesizing fictitious statistics.
5. **Decoupled Provider Architecture**:
   - *Rationale*: Wrapping all market data and news ingestion behind clean interfaces (`IMarketDataProvider`, `INewsProvider`) allows instant switching between live external APIs (Yahoo Finance, NewsAPI/RSS) and deterministic simulated providers for demo environments.

---

## 9. Known Limitations & What's Next

- **Flat vs. Volatility-Adjusted Thresholds**: Current anomaly detection uses fixed percentage rules ($\pm 5.0\%$ price change). A high-beta growth stock may frequently cross 5%, while a low-volatility utility stock rarely moves 2%. *Next*: Implement per-stock dynamic thresholds based on 30-day Average True Range (ATR) and Beta.
- **Top-Level Macro Highlights Data**: While individual stocks, the Attention Feed, Insights, and Memory Digests are live and PostgreSQL-backed, the top-level macro indicators (India VIX cards, sector performance heatmaps) on the Highlights page currently draw from static frontend configurations. *Next*: Connect the Highlights page to a dedicated macro-economic aggregator route.
- **Stock Halts & Delisting Resilience**: The current engine assumes tracked tickers remain continuously listed and actively traded. *Next*: Add explicit status flags for trading halts, circuit breakers, and corporate delisting transitions.
- **Degraded Network Indicator**: When external providers (e.g. Yahoo Finance) experience rate limits or network degradation, the backend logs the warning and serves cached data. *Next*: Expose a subtle "Operating in cached mode" UI banner in the frontend header.

---

## 10. License

Built for **CODE 2026 Hackathon**. Open-source under the [MIT License](LICENSE).
