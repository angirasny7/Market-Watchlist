# Production Deployment Guide: Smart Market Watchlist

This guide outlines the production deployment procedure for **Smart Market Watchlist** using:
- **Neon Serverless PostgreSQL** (Database Layer)
- **Render** (Backend API & Intelligence Engine)
- **Vercel** (Frontend Single Page Application)

---

## 1. Database Provisioning (Neon PostgreSQL)

1. **Create Neon Project**:
   - Sign in to [Neon Console](https://console.neon.tech/).
   - Create a new project named `smart-market-watchlist` with Postgres 16+.
2. **Retrieve Connection String**:
   - Copy the connection string from the Neon dashboard.
   - Ensure the query parameter `sslmode=require` is present at the end:
     ```text
     postgresql://<username>:<password>@<neon-hostname>/<dbname>?sslmode=require
     ```
3. **Run Initial Database Migration**:
   - From your local terminal (or CI/CD runner) pointing `DATABASE_URL` to your Neon database:
     ```bash
     cd backend
     npx prisma db push
     ```
   - Optionally seed the master stock catalog:
     ```bash
     npm run prisma:seed
     ```
     *(Note: The backend service will also auto-seed canonical stocks upon first boot if not present).*

---

## 2. Backend Deployment (Render Web Service)

1. **Create Web Service**:
   - In [Render Dashboard](https://dashboard.render.com/), click **New +** $\to$ **Web Service**.
   - Connect your GitHub repository.
2. **Configure Service Settings**:
   - **Name**: `smart-market-watchlist-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Auto-Deploy**: Yes (on push to `main`)
3. **Configure Environment Variables**:
   Add the following variables in Render $\to$ **Environment**:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production optimizations & error handling |
   | `PORT` | `10000` (or leave default Render port) | Port assigned by Render |
   | `DATABASE_URL` | `postgresql://...neon.tech/...?sslmode=require` | Neon PostgreSQL connection string |
   | `JWT_SECRET` | `[64-character-random-hex-key]` | Secret for signing user session tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
   | `CORS_ORIGIN` | `https://your-watchlist-app.vercel.app` | Vercel frontend URL (comma-separated if multiple) |
   | `MARKET_PROVIDER` | `yahoo` | Live quote engine provider |
   | `NEWS_PROVIDER` | `rss` | Market disclosure and news feed provider |

4. **Verify Backend Health**:
   - Once deployed, visit `https://smart-market-watchlist-backend.onrender.com/api/health`
   - Expected response:
     ```json
     {
       "status": "healthy",
       "timestamp": "...",
       "database": "connected",
       "services": { "scheduler": "active" }
     }
     ```

---

## 3. Frontend Deployment (Vercel)

1. **Import Project to Vercel**:
   - Sign in to [Vercel](https://vercel.com/).
   - Click **Add New...** $\to$ **Project** and select your repository.
2. **Configure Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **Configure Environment Variables**:
   - In Vercel Project Settings $\to$ **Environment Variables**:
     - `VITE_API_URL`: Set to your deployed Render backend API URL (including `/api` suffix):
       ```text
       https://smart-market-watchlist-backend.onrender.com/api
       ```
4. **SPA Routing**:
   - The repository includes [vercel.json](file:///c:/Users/angir/Desktop/Smart%20Market%20Watchlist/vercel.json) with client-side rewrite rules:
     ```json
     {
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
   - This ensures routes like `/feed`, `/watchlist`, `/memory`, and `/highlights` resolve cleanly without 404s on browser reload.
5. **Deploy**:
   - Click **Deploy**. Vercel will build and distribute the production bundle globally.

---

## 4. Post-Deployment Verification Checklist

- [ ] **System Online Status**: Check the header status badge displays `System Online` with a green pulse indicator.
- [ ] **Authentication**: Register a new user, log in, verify session persistence, and test logout flow.
- [ ] **Watchlist Persistence**: Add/remove stocks from watchlist and refresh to ensure persistence in Neon PostgreSQL.
- [ ] **Attention Feed**: Verify anomalies and causal intelligence load properly.
- [ ] **Market Highlights**: Verify macro indicators, sector heatmaps, and read-only market status badge render accurately.
- [ ] **Direct URL Navigation**: Test navigating directly to `/highlights` and `/memory` to confirm Vercel SPA rewrites.
