import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMarketStore } from '../store/useMarketStore';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
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

  const handleDemoFill = () => {
    navigate('/login', { state: { demoFill: true } });
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Password strength validation checks
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-\+=~`[\]\\/]/.test(password);
  const isPasswordAdequate = hasMinLength && hasNumber && hasLetter && hasSpecial;

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
      setLocalError('Password must be at least 8 characters, with letters, numbers, and a special character');
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
    <div className="min-h-screen bg-[#070B0E] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden selection:bg-emerald-500/30 font-sans">
      {/* ========================================================= */}
      {/* AMBIENT BACKGROUND GLOWS & CURVED EMERALD WAVE LINES      */}
      {/* ========================================================= */}
      <div className="absolute -top-24 right-1/4 w-[36rem] h-[36rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-[40rem] h-[40rem] bg-teal-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Background Curved Wave Vectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 sm:opacity-60"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="waveGradLeftReg" x1="0%" y1="100%" x2="60%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#2DD4BF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#070B0E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveGradRightReg" x1="100%" y1="0%" x2="50%" y2="80%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#070B0E" stopOpacity="0" />
          </linearGradient>
          <filter id="glowReg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Top-Right Ambient Arc */}
        <path
          d="M 900, -50 C 1100, 80 1300, 120 1500, 30"
          stroke="url(#waveGradRightReg)"
          strokeWidth="1.5"
          filter="url(#glowReg)"
        />

        {/* Bottom-Left Flowing Signal Waves */}
        <path
          d="M -100, 750 C 150, 500 280, 680 420, 850 C 520, 960 700, 880 850, 860"
          stroke="url(#waveGradLeftReg)"
          strokeWidth="1.5"
          filter="url(#glowReg)"
        />

        {/* Constellation Signal Dots */}
        <circle cx="70" cy="710" r="4" fill="#34D399" filter="url(#glowReg)" />
        <circle cx="410" cy="840" r="3.5" fill="#34D399" filter="url(#glowReg)" />
        <circle cx="780" cy="865" r="3" fill="#34D399" filter="url(#glowReg)" />
      </svg>

      <div className="w-full max-w-6xl z-10 py-6">
        {/* Top Logo / Brand */}
        <div className="mb-8 sm:mb-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* 3-bar mint equalizer icon */}
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-3 bg-emerald-400 rounded-xs" />
              <span className="w-1.5 h-5 bg-emerald-400 rounded-xs" />
              <span className="w-1.5 h-4 bg-emerald-400 rounded-xs" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white leading-none">SignalLens</div>
              <div className="text-[11px] font-medium text-slate-400 mt-0.5 tracking-wide">Market Change Intelligence</div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ========================================================= */}
          {/* LEFT PART: HEADLINE & TIMELINE MARKET SIGNALS             */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-7">
            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-white leading-[1.08]">
                What happened <br />
                <span className="text-[#34D399]">since you left?</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed font-normal">
                SignalLens tracks meaningful changes in your watchlist and explains why they happened.
              </p>
            </div>

            {/* Timeline Feed Container */}
            <div className="relative pl-2 sm:pl-4 space-y-4 pt-1">
              {/* Vertical connecting line */}
              <div className="absolute left-[62px] sm:left-[70px] top-6 bottom-6 w-px bg-slate-800" />

              {/* Node 1: TATAMOTORS */}
              <div className="flex items-start gap-4 sm:gap-5 relative group">
                <div className="w-12 sm:w-14 pt-3.5 text-right text-xs text-slate-400 font-medium shrink-0">
                  9:12 AM
                </div>
                {/* Timeline Dot */}
                <div className="relative z-10 mt-4 -ml-1.5 shrink-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                </div>
                {/* Card */}
                <div className="flex-1 bg-[#0D131A]/90 hover:bg-[#101721] border border-slate-800/90 rounded-2xl p-4 transition-all duration-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0055A5] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                      <span className="font-extrabold tracking-tighter">T</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide">TATAMOTORS</span>
                        <span className="text-sm font-bold text-[#34D399]">+10.2%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Government approves new EV subsidy scheme boosting demand outlook.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Node 2: INFY */}
              <div className="flex items-start gap-4 sm:gap-5 relative group">
                <div className="w-12 sm:w-14 pt-3.5 text-right text-xs text-slate-400 font-medium shrink-0">
                  10:44 AM
                </div>
                {/* Timeline Dot */}
                <div className="relative z-10 mt-4 -ml-1.5 shrink-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]" />
                </div>
                {/* Card */}
                <div className="flex-1 bg-[#0D131A]/90 hover:bg-[#101721] border border-slate-800/90 rounded-2xl p-4 transition-all duration-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#007CC3] flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-inner px-1 text-center">
                      <span className="font-semibold tracking-tighter">Infosys</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide">INFY</span>
                        <span className="text-sm font-bold text-[#F43F5E]">-4.8%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        US tech spending forecast lowered by analysts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Node 3: RELIANCE */}
              <div className="flex items-start gap-4 sm:gap-5 relative group">
                <div className="w-12 sm:w-14 pt-3.5 text-right text-xs text-slate-400 font-medium shrink-0">
                  12:31 PM
                </div>
                {/* Timeline Dot */}
                <div className="relative z-10 mt-4 -ml-1.5 shrink-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                </div>
                {/* Card */}
                <div className="flex-1 bg-[#0D131A]/90 hover:bg-[#101721] border border-slate-800/90 rounded-2xl p-4 transition-all duration-200 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#9A7036] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                      <span className="font-extrabold tracking-tighter">R</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide">RELIANCE</span>
                        <span className="text-sm font-bold text-[#34D399]">+3.1%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        New strategic partnership in renewable energy announced.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PART: REGISTRATION CARD                             */}
          {/* ========================================================= */}
          <div className="lg:col-span-5">
            <div className="w-full bg-[#0D1217]/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-7 sm:p-9 space-y-5 shadow-2xl relative">
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Create your account
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign up to access your monitored stocks, custom watchlists, and live alerts.
                </p>
              </div>

              {/* Want to explore instantly? Box */}
              <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#0F1622]/90 border border-slate-700/70 gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                    Want to explore instantly?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#2A374D] active:scale-95 text-slate-100 border border-slate-600/70 text-xs font-semibold shrink-0 transition-all cursor-pointer shadow-sm"
                >
                  Fill Demo (Alex)
                </button>
              </div>

              {/* Error Alert */}
              {(localError || error) && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-rose-300 font-medium leading-snug">
                    {localError || error}
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name / Username */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Full Name / Username
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[#080C10] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-sm transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[#080C10] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-sm transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                      placeholder="Min. 8 chars (letters, numbers, special)"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#080C10] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-sm transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#080C10] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-sm transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#10B981] via-[#2DD4BF] to-[#34D399] hover:opacity-95 active:scale-[0.99] text-[#031E14] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#031E14]" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 text-[#031E14]" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Switch to Login */}
              <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-[#34D399] hover:underline underline-offset-2 transition-colors ml-1"
                >
                  Sign in here
                </Link>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Encrypted JWT Sessions · Private & Isolated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
