import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import {
  DashboardPage,
  AttentionFeedPage,
  WatchlistPage,
  MarketMemoryPage,
  MarketHighlightsPage,
  LoginPage,
  RegisterPage,
} from './pages';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="feed" element={<AttentionFeedPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="memory" element={<MarketMemoryPage />} />
          <Route path="highlights" element={<MarketHighlightsPage />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
