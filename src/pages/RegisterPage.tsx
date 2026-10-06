import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMarketStore } from '../store/useMarketStore';
import {
  Activity,
  Lock,
  Mail,
  User,
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

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const { fetchMarketData } = useMarketStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Password strength check
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const isPasswordAdequate = hasMinLength && hasNumber && hasLetter;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!name.trim() || name.trim().length < 2) {
      setLocalError('Full name must be at least 2 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!isPasswordAdequate) {
      setLocalError('Password must be at least 8 characters and contain letters and numbers');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const success = await register(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (success) {
      fetchMarketData();
      navigate('/', { replace: true });
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
        {/* RIGHT PART: REGISTRATION FORM & USER DIRECTIONS */}
        {/* ========================================================= */}
        <div className="lg:col-span-5">
          <div className="w-full bg-[#111622] border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Header & Guidance Instructions */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Create your account
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get started in 10 seconds. Free access to real-time watchlists, alerts, and market signals.
              </p>
            </div>

            {/* Directions Box */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/25 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Quick Onboarding Directions:
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enter your name, email, and a password (min. 8 characters with letters & numbers). You'll instantly receive a default watchlist template you can customize.
              </p>
            </div>

            {/* Error Alert */}
            {(localError || error) && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-rose-300 font-medium">
                  {localError || error}
                </div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
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
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
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
                    placeholder="At least 8 chars (letters & numbers)"
                    className="w-full pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-4 py-2 bg-[#0B0F17] border border-slate-700/90 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle to Login */}
            <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
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

export default RegisterPage;

