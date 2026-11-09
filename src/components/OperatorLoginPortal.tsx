import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  Radio,
  Clock,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Lock,
  User,
  ArrowRight,
  Database,
  Terminal,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Check,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  TwinEnvironment,
  OperatorProfile,
  OrganisationRecord,
  UserAccount,
  ADMIN_EMAIL,
  DEFAULT_ORG_NAME,
} from '../types/auth';
import { apiClient } from '../services/apiClient';

interface OperatorLoginPortalProps {
  onLogin: (operator: OperatorProfile, environment: TwinEnvironment, organisation: OrganisationRecord) => void;
  defaultOrganisation?: string;
}

export const OperatorLoginPortal: React.FC<OperatorLoginPortalProps> = ({
  onLogin,
  defaultOrganisation = DEFAULT_ORG_NAME,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'admin'>('signin');
  const [environment, setEnvironment] = useState<TwinEnvironment>('SIMULATION');

  // Verified organisations registry
  const [verifiedOrgs, setVerifiedOrgs] = useState<OrganisationRecord[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('iiests-mech');

  // Sign In inputs
  const [operatorId, setOperatorId] = useState('ME-OPR-4412');
  const [password, setPassword] = useState('operator123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);

  // Sign Up inputs
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    badgeId: '',
    department: '',
    requestedOrganisation: '',
    role: 'PLANT_OPERATOR',
    password: '',
    confirmPassword: '',
  });
  const [signupSuccessMsg, setSignupSuccessMsg] = useState<string | null>(null);
  const [signupErrorMsg, setSignupErrorMsg] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Admin verification state
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);

  // Real-Time Status Ticker
  const [tickerState, setTickerState] = useState({
    latencyMs: 14,
    ingestionRate: 24200,
    activeNodes: 16,
    uptimePct: 99.98,
    currentTimeStr: new Date().toLocaleTimeString(),
  });

  // Load verified organisations and pending users
  useEffect(() => {
    loadVerifiedOrgs();
    loadPendingUsers();
  }, []);

  const loadVerifiedOrgs = async () => {
    const orgs = await apiClient.getVerifiedOrganisations();
    setVerifiedOrgs(orgs);
    if (orgs.length > 0 && !orgs.some(o => o.id === selectedOrgId)) {
      setSelectedOrgId(orgs[0].id);
    }
  };

  const loadPendingUsers = async () => {
    const list = await apiClient.getPendingUsers();
    setPendingUsers(list);
  };

  // Ticker loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerState(prev => ({
        latencyMs: Math.max(11, Math.min(19, prev.latencyMs + Math.floor((Math.random() - 0.5) * 3))),
        ingestionRate: Math.max(23800, Math.min(24800, prev.ingestionRate + Math.floor((Math.random() - 0.5) * 200))),
        activeNodes: 16,
        uptimePct: 99.98,
        currentTimeStr: new Date().toLocaleTimeString(),
      }));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim()) {
      setErrorMsg('Please enter your Operator Badge ID or Email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setIsPendingNotice(false);

    try {
      const res = await apiClient.login(operatorId.trim(), password);

      if (!res.success) {
        setIsSubmitting(false);
        if (res.status === 'PENDING_APPROVAL') {
          setIsPendingNotice(true);
          setErrorMsg(res.error || 'Your account is pending verification by the Chief Engineer.');
        } else {
          setErrorMsg(res.error || 'Authentication rejected.');
        }
        return;
      }

      if (res.operator) {
        setIsSubmitting(false);
        const org = res.organisation || verifiedOrgs.find(o => o.id === selectedOrgId) || {
          id: res.operator.organisationId,
          name: res.operator.organisation,
          code: 'VERIFIED',
          status: 'VERIFIED',
          createdAt: new Date().toISOString(),
        };
        onLogin(res.operator, environment, org);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Server connection error during login.');
    }
  };

  // Handle Signup Submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrorMsg(null);
    setSignupSuccessMsg(null);

    if (!signupForm.name || !signupForm.email || !signupForm.badgeId || !signupForm.requestedOrganisation || !signupForm.password) {
      setSignupErrorMsg('Please fill in all required fields.');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupErrorMsg('Passwords do not match.');
      return;
    }

    if (signupForm.password.length < 6) {
      setSignupErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await apiClient.register({
        name: signupForm.name,
        email: signupForm.email,
        badgeId: signupForm.badgeId,
        department: signupForm.department || 'Discrete Event Operations',
        requestedOrganisation: signupForm.requestedOrganisation,
        role: signupForm.role,
        password: signupForm.password,
      });

      setIsRegistering(false);
      if (!res.success) {
        setSignupErrorMsg(res.error || 'Registration failed.');
        return;
      }

      setSignupSuccessMsg(
        `Registration submitted for ${signupForm.name}. Your account is in PENDING_APPROVAL status. You will be able to log in once verified by Chief Engineer sayandipmallickclassf@gmail.com.`
      );
      setSignupForm({
        name: '',
        email: '',
        badgeId: '',
        department: '',
        requestedOrganisation: '',
        role: 'PLANT_OPERATOR',
        password: '',
        confirmPassword: '',
      });
      // Refresh pending list
      loadPendingUsers();
    } catch (err: any) {
      setIsRegistering(false);
      setSignupErrorMsg(err.message || 'Network error submitting registration.');
    }
  };

  // Admin: Approve or Reject Pending User
  const handleAdminVerify = async (userId: string, approved: boolean) => {
    setAdminActionMsg(null);
    const res = await apiClient.verifyUser(userId, approved);
    if (res.success) {
      setAdminActionMsg(res.message);
      await loadPendingUsers();
      await loadVerifiedOrgs();
    } else {
      setAdminActionMsg(`Action failed: ${res.message}`);
    }
  };

  // Demo presets loader
  const loadPreset = (badge: string, pass: string) => {
    setOperatorId(badge);
    setPassword(pass);
    setErrorMsg(null);
    setIsPendingNotice(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden font-sans">
      {/* Background Cyber-Physical Grid Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* 1. Public Real-Time System Health Ticker */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
          {/* Health Status & Gateway Label */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-200 font-semibold">DigiTwin SCADA Gateway • Enterprise Node</span>
            </div>
          </div>

          {/* Real-time Ticker Metrics */}
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 overflow-x-auto py-0.5">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>API Gateway:</span>
              <strong className="text-cyan-300">{tickerState.latencyMs}ms latency</strong>
            </div>
            <div className="hidden lg:flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Telemetry:</span>
              <strong className="text-indigo-300">{(tickerState.ingestionRate / 1000).toFixed(1)}k pts/s</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edge Nodes:</span>
              <strong className="text-emerald-300">{tickerState.activeNodes}/16 Online</strong>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Server UTC:</span>
              <strong className="text-slate-200">{tickerState.currentTimeStr}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Login / Registration Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {/* Brand Header */}
          <div className="text-center mb-5 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Cyber-Physical Systems Integration • Level 3 SCADA Digital Twin</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Digi<span className="text-cyan-400">Twin</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Industrial Discrete Event Digital Twin, Multi-Tenant Database, and Predictive Maintenance Portal
            </p>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'signin' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Operator Sign In</span>
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setSignupErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'signup' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </button>
            <button
              onClick={() => { setActiveTab('admin'); loadPendingUsers(); }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'admin' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chief Engineer Verification Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="relative">
                Admin
                {pendingUsers.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                    {pendingUsers.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5 animate-fadeIn">
              {/* Environment Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Target Environment
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">
                    {environment} ACTIVE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEnvironment('PRODUCTION')}
                    className={`py-2 px-2.5 rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                      environment === 'PRODUCTION'
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-600/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${environment === 'PRODUCTION' ? 'bg-rose-400 animate-ping' : 'bg-slate-500'}`} />
                      Production
                    </span>
                    <span className="text-[9px] opacity-70">Live Physical Asset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('SIMULATION')}
                    className={`py-2 px-2.5 rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                      environment === 'SIMULATION'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      Simulation
                    </span>
                    <span className="text-[9px] opacity-70">Sandbox & What-If</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('HISTORICAL')}
                    className={`py-2 px-2.5 rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                      environment === 'HISTORICAL'
                        ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-600/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Historical
                    </span>
                    <span className="text-[9px] opacity-70">Playback Audit</span>
                  </button>
                </div>
              </div>

              {/* Verified Organisation Selector (Strictly admin-verified orgs only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    Verified Organisation Database Node
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified by Admin
                  </span>
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                >
                  {verifiedOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Error / Pending Alert Banner */}
              {errorMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    isPendingNotice
                      ? 'bg-amber-950/70 border-amber-600/60 text-amber-200'
                      : 'bg-rose-950/70 border-rose-600/60 text-rose-200'
                  }`}
                >
                  {isPendingNotice ? (
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold">
                      {isPendingNotice ? 'Access Pending Administrative Verification' : 'Authentication Error'}
                    </div>
                    <div className="text-[11px] leading-relaxed opacity-90">{errorMsg}</div>
                    {isPendingNotice && (
                      <div className="text-[10px] text-amber-300 font-mono pt-1">
                        Contact Chief Engineer: {ADMIN_EMAIL}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Operator Badge ID or Email
                  </label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    placeholder="e.g. ME-OPR-4412 or operator@iiests.ac.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Security Passcode / Terminal PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono pr-10 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <span>Enter {environment} SCADA Twin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Profiles / Fast Credential Switcher */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center justify-between">
                  <span>Demonstration Profiles:</span>
                  <span className="text-slate-500">Tap to load credentials</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-left text-[11px]">
                  <button
                    type="button"
                    onClick={() => loadPreset('ME-OPR-4412', 'operator123')}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition text-left"
                  >
                    <div className="font-bold text-white truncate">Rajesh S.</div>
                    <div className="text-[9px] text-emerald-400 font-mono">Approved Operator</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadPreset('TASL-OPR-881', 'tata2026')}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition text-left"
                  >
                    <div className="font-bold text-white truncate">Vikram V.</div>
                    <div className="text-[9px] text-amber-400 font-mono">Pending Approval</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadPreset(ADMIN_EMAIL, 'admin123')}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition text-left"
                  >
                    <div className="font-bold text-white truncate">Chief Engr.</div>
                    <div className="text-[9px] text-indigo-400 font-mono">System Admin</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER / SIGN UP */}
          {activeTab === 'signup' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  Operator & Plant Registration Form
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upon registration, your account is queued for identity verification by the Chief Engineer before access is granted.
                </p>
              </div>

              {signupSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-bold">Registration Successfully Logged!</div>
                    <div className="text-[11px] mt-1 leading-relaxed">{signupSuccessMsg}</div>
                  </div>
                </div>
              )}

              {signupErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/60 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-bold">Registration Rejected</div>
                    <div className="text-[11px] mt-0.5">{signupErrorMsg}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      placeholder="e.g. Dr. Amit Mukherjee"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Corporate / Work Email *</label>
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      placeholder="e.g. amit@iiests.ac.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Badge ID / Employee Number *</label>
                    <input
                      type="text"
                      value={signupForm.badgeId}
                      onChange={(e) => setSignupForm({ ...signupForm, badgeId: e.target.value })}
                      placeholder="e.g. ME-OPR-9921"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Department / Division *</label>
                    <input
                      type="text"
                      value={signupForm.department}
                      onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                      placeholder="e.g. Aerospace Machining Cell"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Requested Organisation Name *</label>
                  <input
                    type="text"
                    value={signupForm.requestedOrganisation}
                    onChange={(e) => setSignupForm({ ...signupForm, requestedOrganisation: e.target.value })}
                    placeholder="e.g. Tata Advanced Systems Aerospace Unit"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500">
                    Each organization receives an isolated database tenant once approved by the Chief Engineer.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Operator Functional Role</label>
                  <select
                    value={signupForm.role}
                    onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="PLANT_OPERATOR">Plant Operator (CNC Machining & Workpiece Flow)</option>
                    <option value="MAINTENANCE_LEAD">Maintenance Lead (Condition Monitoring & Repairs)</option>
                    <option value="QUALITY_ENGINEER">Quality Engineer (Metrology, Scrap & Rework Audit)</option>
                    <option value="PLANT_SUPERVISOR">Plant Supervisor (ERP, MRP & Production Scheduling)</option>
                    <option value="ACADEMIC_RESEARCHER">Academic Researcher (Digital Twin Modeling)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Password (min 6 chars) *</label>
                    <input
                      type="password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Confirm Password *</label>
                    <input
                      type="password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isRegistering ? (
                    <span>Registering Account in Database...</span>
                  ) : (
                    <>
                      <span>Submit for Chief Engineer Verification</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ADMIN VERIFICATION & APPROVALS PANEL */}
          {activeTab === 'admin' && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    Chief Engineer & System Administrator Verification
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Administrator: <span className="text-cyan-300 font-mono">{ADMIN_EMAIL}</span>
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 border border-indigo-700 text-indigo-300">
                  Role-Based Gate
                </span>
              </div>

              {adminActionMsg && (
                <div className="p-3 rounded-lg bg-indigo-950/80 border border-indigo-600 text-indigo-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>{adminActionMsg}</span>
                </div>
              )}

              {/* Pending Approvals List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Pending Operator & Organisation Registrations ({pendingUsers.length})
                  </span>
                  <button
                    onClick={loadPendingUsers}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-80" />
                    <p className="font-semibold text-slate-200">All Operator Registrations Are Verified</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      New signups submitted via the Register tab will appear here for 1-click verification.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{user.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {user.badgeId}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              PENDING APPROVAL
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Organisation: <strong>{user.organisationName}</strong></span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Email: <span className="font-mono text-slate-300">{user.email}</span> • Dept: {user.department}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAdminVerify(user.id, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Verify</span>
                          </button>
                          <button
                            onClick={() => handleAdminVerify(user.id, false)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs flex items-center gap-1 border border-rose-700 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Organisations List */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Currently Verified Organisation Tenants:
                </span>
                <div className="space-y-1">
                  {verifiedOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-slate-200">{org.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({org.code})</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">DATABASE ISOLATED</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. Footer Legal & Standard Disclaimer */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 px-4 py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>DigiTwin Industrial SCADA Platform • Verified Multi-Tenant Access Gated</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <span>Chief Administrator: {ADMIN_EMAIL}</span>
          <span>•</span>
          <span>Deployable Standalone on Industrial Linux / Docker</span>
        </div>
      </footer>
    </div>
  );
};
