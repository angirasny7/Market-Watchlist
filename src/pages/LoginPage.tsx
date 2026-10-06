import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMarketStore } from '../store/useMarketStore';
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Zap,
  FileText,
  Bell,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const { fetchMarketData } = useMarketStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname;
      const destination = from && from !== '/login' && from !== '/register' ? from : '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleDemoFill = () => {
    setEmail('alex1@example.com');
    setPassword('Alex1@123');
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const success = await login(email.trim(), password);
    setIsSubmitting(false);

    if (success) {
      fetchMarketData();
      const from = (location.state as any)?.from?.pathname;
      const destination = from && from !== '/login' && from !== '/register' ? from : '/';
      navigate(destination, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Subtle Background Glow Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        {/* ========================================================= */}
        {/* LEFT PART: MAJOR WEBSITE INFORMATION & CAPABILITIES SHOWCASE */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Brand Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Smart Market Intelligence</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              SignalLens <span className="text-indigo-400">Watchlist</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              A watchlist that tells you <span className="text-white font-semibold">what changed</span>,{' '}
              <span className="text-white font-semibold">why it changed</span>, and{' '}
              <span className="text-white font-semibold">whether it matters</span> — not just the latest price.
            </p>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {/* Pillar 1 */}
            <div className="p-4 rounded-xl bg-[#131926]/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <span>Anomaly Detection</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Flags price surges (≥5%), volume spikes (2× 20D average), 52-week extremes, and abnormal volatility.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-4 rounded-xl bg-[#131926]/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30">
                  <FileText className="w-4 h-4 text-sky-400" />
                </div>
                <span>Context & Evidence</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Corroborates movements with live regulatory filings, verified financial news, and confidence scores.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-4 rounded-xl bg-[#131926]/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <span>Real-Time Alerts</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant SSE push notifications for crossing targets, percentage moves, and upcoming corporate events.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-4 rounded-xl bg-[#131926]/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Market Memory</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Catch up seamlessly with "since last visit" gap tracking and long-term intelligence history.
              </p>
            </div>
          </div>

          {/* Trust & Provenance Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-400 font-mono">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Real-time NSE & US Data
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Fabricated Stats
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Isolated User Watchlists
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PART: SIGN IN FORM & USER GUIDANCE DIRECTIONS */}
        {/* ========================================================= */}
        <div className="lg:col-span-5">
          <div className="w-full bg-[#111622] border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header & Guidance Instructions */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your credentials below to access your live feed, watchlists, and alerts.
              </p>
            </div>

            {/* Direction / Quick-Start Instruction Card */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/25 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Quick Directions:
                </span>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Fill Demo Account
                </button>
              </div>
              <ul className="text-slate-300 space-y-1 list-disc list-inside text-[11px] leading-relaxed">
                <li>
                  <strong className="text-white">Existing user?</strong> Sign in with your registered email and password.
                </li>
                <li>
                  <strong className="text-white">First time here?</strong> Click{' '}
                  <Link to="/register" className="text-indigo-400 underline font-medium hover:text-indigo-300">
                    Create an account
                  </Link>{' '}
                  to start tracking stocks.
                </li>
              </ul>
            </div>

            {/* Error Alert */}
            {(localError || error) && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-rose-300 font-medium">
                  {localError || error}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="trader@marketwatch.pro"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle to Register */}
            <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Create an account
              </Link>
            </div>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>256-bit encrypted JWT sessions · Protected user data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

