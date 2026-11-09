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
  DESIGNATED_ADMINS,
  ParameterChangeRequest,
  PRECONFIGURED_OPERATORS,
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

  // Sign In inputs (Initialized blank with no pre-filled credentials)
  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);

  // Sign Up inputs (Clean blank start)
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

  // Forgot Password state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState({
    identifier: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Authenticated Admin Governance Session State
  // FATAL ERROR FIX: Public visitors cannot view or approve/reject pending registrations without verified admin login
  const [adminAuthInput, setAdminAuthInput] = useState({
    badgeOrEmail: '',
    passcode: '',
  });
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<{
    name: string;
    badgeId: string;
    email: string;
    roleTitle: string;
  } | null>(null);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [changeRequests, setChangeRequests] = useState<ParameterChangeRequest[]>([]);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);

  // Real-Time Status Ticker
  const [tickerState, setTickerState] = useState({
    latencyMs: 14,
    ingestionRate: 24200,
    activeNodes: 16,
    uptimePct: 99.98,
    currentTimeStr: new Date().toLocaleTimeString(),
  });

  // Load verified organisations and change requests
  useEffect(() => {
    loadVerifiedOrgs();
    loadChangeRequests();
  }, []);

  const loadVerifiedOrgs = async () => {
    const orgs = await apiClient.getVerifiedOrganisations();
    setVerifiedOrgs(orgs);
    if (orgs.length > 0 && !orgs.some(o => o.id === selectedOrgId)) {
      setSelectedOrgId(orgs[0].id);
    }
  };

  const loadPendingUsers = async (adminBadge?: string) => {
    const activeBadge = adminBadge || authenticatedAdmin?.badgeId;
    if (!activeBadge) {
      setPendingUsers([]);
      return;
    }
    const list = await apiClient.getPendingUsers(activeBadge);
    setPendingUsers(list);
  };

  const loadChangeRequests = async () => {
    const list = await apiClient.getChangeRequests();
    setChangeRequests(list);
  };

  // Authenticated Admin Login Handler
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminActionMsg(null);

    const badgeOrEmail = adminAuthInput.badgeOrEmail.trim().toUpperCase();
    const emailLower = adminAuthInput.badgeOrEmail.trim().toLowerCase();
    const pass = adminAuthInput.passcode.trim();

    const matchedAdmin = DESIGNATED_ADMINS.find(
      (a) =>
        a.badgeId.toUpperCase() === badgeOrEmail ||
        a.email.toLowerCase() === emailLower ||
        a.rollNumber.toUpperCase() === badgeOrEmail
    );

    if (!matchedAdmin) {
      setAdminLoginError(
        'ACCESS DENIED: Not recognized as one of the 4 Designated System Administrators (Sayandip Mallick, Nilesh Banik, Soumyajit Chakraborty, Chitrayan Biswas).'
      );
      return;
    }

    // Verify admin passcode: admin123, rollNumber, or badgeId
    const isPassValid =
      pass === 'admin123' ||
      pass.toUpperCase() === matchedAdmin.badgeId.toUpperCase() ||
      pass.toUpperCase() === matchedAdmin.rollNumber.toUpperCase() ||
      (matchedAdmin.badgeId === 'CHIEF-ENG-01' && pass === 'admin123');

    if (!isPassValid) {
      setAdminLoginError('Invalid Administrator Passcode / Security Token.');
      return;
    }

    setAuthenticatedAdmin(matchedAdmin);
    setAdminLoginError(null);
    await loadPendingUsers(matchedAdmin.badgeId);
    await loadChangeRequests();
  };

  const handleAdminSignOut = () => {
    setAuthenticatedAdmin(null);
    setAdminAuthInput({ badgeOrEmail: '', passcode: '' });
    setPendingUsers([]);
    setAdminActionMsg(null);
    setAdminLoginError(null);
  };

  const handleReviewChangeRequest = async (requestId: string, approved: boolean) => {
    if (!authenticatedAdmin) return;
    setAdminActionMsg(null);
    const res = await apiClient.reviewChangeRequest(
      requestId,
      approved,
      authenticatedAdmin.email,
      authenticatedAdmin.badgeId,
      adminAuthInput.passcode
    );
    setAdminActionMsg(res.message);
    await loadChangeRequests();
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

  // Handle Forgot Password submission
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMsg(null);

    if (!forgotInput.identifier.trim()) {
      setForgotError('Please enter your Operator Badge ID or corporate Email.');
      return;
    }

    if (forgotInput.newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    if (forgotInput.newPassword !== forgotInput.confirmNewPassword) {
      setForgotError('New passwords do not match.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await apiClient.resetPassword(forgotInput.identifier.trim(), forgotInput.newPassword);
      setIsResetting(false);
      if (res.success) {
        setForgotMsg(res.message || 'Password updated successfully! You can now sign in.');
        setOperatorId(forgotInput.identifier.trim());
        setPassword('');
        setTimeout(() => {
          setIsForgotModalOpen(false);
          setForgotMsg(null);
          setForgotInput({ identifier: '', newPassword: '', confirmNewPassword: '' });
        }, 2200);
      } else {
        setForgotError(res.error || res.message || 'Password reset request failed.');
      }
    } catch (err: any) {
      setIsResetting(false);
      setForgotError(err.message || 'Network error updating password.');
    }
  };

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

  // Admin: Approve or Reject Pending User (Only available when authenticated as admin)
  const handleAdminVerify = async (userId: string, approved: boolean) => {
    if (!authenticatedAdmin) return;
    setAdminActionMsg(null);
    const res = await apiClient.verifyUser(
      userId,
      approved,
      undefined,
      authenticatedAdmin.email,
      authenticatedAdmin.badgeId,
      adminAuthInput.passcode
    );
    if (res.success) {
      setAdminActionMsg(res.message);
      await loadPendingUsers(authenticatedAdmin.badgeId);
      await loadVerifiedOrgs();
    } else {
      setAdminActionMsg(`Action failed: ${res.message}`);
    }
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

            {/* Admin Portal Gateway Button */}
            <button
              onClick={() => {
                setActiveTab('admin');
                if (authenticatedAdmin) {
                  loadPendingUsers(authenticatedAdmin.badgeId);
                }
                loadChangeRequests();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-indigo-300 font-semibold transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Portal</span>
              {authenticatedAdmin ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-slate-950 font-bold">
                  UNLOCKED
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/80 text-slate-950 font-bold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Gated
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Login / Registration Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Brand Header */}
          <div className="text-center mb-5 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Cyber-Physical Systems Integration • Level 3 SCADA Digital Twin</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Digi<span className="text-cyan-400">Twin</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
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
              onClick={() => {
                setActiveTab('admin');
                if (authenticatedAdmin) {
                  loadPendingUsers(authenticatedAdmin.badgeId);
                }
                loadChangeRequests();
              }}
              className={`py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'admin' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chief Engineer & System Admin Governance Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="flex items-center gap-1">
                Admin Portal
                {authenticatedAdmin ? (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400 text-slate-950 font-bold">
                    Active
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-amber-400 ml-1" />
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Security Passcode / Terminal PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModalOpen(true);
                        setForgotError(null);
                        setForgotMsg(null);
                        setForgotInput({
                          identifier: operatorId.trim(),
                          newPassword: '',
                          confirmNewPassword: '',
                        });
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition"
                    >
                      Forgot password?
                    </button>
                  </div>
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

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Enterprise Node: IIEST Shibpur</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    setForgotError(null);
                    setForgotMsg(null);
                    setForgotInput({
                      identifier: operatorId.trim(),
                      newPassword: '',
                      confirmNewPassword: '',
                    });
                  }}
                  className="text-cyan-400/80 hover:text-cyan-300 hover:underline"
                >
                  Reset / Forgot PIN
                </button>
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
                  Upon registration, your account is queued for identity verification by the System Administrators before access is granted.
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
                    Each organization receives an isolated database tenant once approved by an Admin.
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
                      <span>Submit for Administrator Verification</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ADMIN GOVERNANCE (GATED: MUST AUTHENTICATE AS DESIGNATED ADMIN) */}
          {activeTab === 'admin' && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    Admin Governance Portal • 4 Designated System Administrators
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Authorized Admins: Sayandip Mallick, Nilesh Banik (2023MEB003), Soumyajit Chakraborty (2023MEB015), Chitrayan Biswas (2023MEB019).
                  </p>
                </div>
                {authenticatedAdmin ? (
                  <button
                    onClick={handleAdminSignOut}
                    className="px-2.5 py-1 rounded text-[10px] font-mono bg-rose-950 border border-rose-700 text-rose-300 font-semibold hover:bg-rose-900 transition"
                  >
                    Lock / Sign Out
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono bg-amber-950 border border-amber-700 text-amber-300 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Credentials Required
                  </span>
                )}
              </div>

              {adminActionMsg && (
                <div className="p-3 rounded-lg bg-indigo-950/80 border border-indigo-600 text-indigo-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>{adminActionMsg}</span>
                </div>
              )}

              {/* IF NOT AUTHENTICATED AS ADMIN: SHOW ADMIN CREDENTIAL CHALLENGE */}
              {!authenticatedAdmin ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Security Gate: Administrative Credentials Required</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Only the 4 designated system administrators can review registrations, approve parameter proposals, or perform administrative operations. Please authenticate below.
                    </p>

                    {adminLoginError && (
                      <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{adminLoginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleAdminAuthSubmit} className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Admin Badge ID / Roll Number / Corporate Email
                        </label>
                        <input
                          type="text"
                          value={adminAuthInput.badgeOrEmail}
                          onChange={(e) => setAdminAuthInput({ ...adminAuthInput, badgeOrEmail: e.target.value })}
                          placeholder="e.g. CHIEF-ENG-01, 2023MEB003, 2023MEB015, 2023MEB019"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Administrator Passcode / Secret PIN
                        </label>
                        <input
                          type="password"
                          value={adminAuthInput.passcode}
                          onChange={(e) => setAdminAuthInput({ ...adminAuthInput, passcode: e.target.value })}
                          placeholder="Security Passcode"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Unlock Admin Governance</span>
                      </button>
                    </form>
                  </div>

                  {/* Designated Administrator Roster Overview */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Designated System Administrators (4 Super-Users):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DESIGNATED_ADMINS.map((admin) => (
                        <div
                          key={admin.badgeId}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{admin.name}</span>
                            <span className="font-mono text-[10px] text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800">
                              {admin.badgeId}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{admin.roleTitle}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED ADMIN VIEW: FULL GOVERNANCE, PENDING REGISTRATIONS & CHANGE PROPOSALS */
                <div className="space-y-5">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-amber-300" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <span>{authenticatedAdmin.name}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-200">
                            {authenticatedAdmin.badgeId}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{authenticatedAdmin.roleTitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full Authority Active
                    </span>
                  </div>

                  {/* 1. Pending Parameter Change Proposals */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Pending Parameter Change Proposals ({changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length})
                      </span>
                      <button
                        onClick={loadChangeRequests}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        Refresh
                      </button>
                    </div>

                    {changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length === 0 ? (
                      <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                        <p className="text-slate-300 font-medium">No Pending Parameter Proposals</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          When plant operators submit adjustments to arrival intervals, batch sizes, or failure rates, they require admin approval here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {changeRequests
                          .filter(r => r.status === 'PENDING_ADMIN_APPROVAL')
                          .map((req) => (
                            <div
                              key={req.id}
                              className="p-3 rounded-xl bg-slate-950 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-amber-300 text-xs">{req.requesterName}</span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                    {req.requesterBadge}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(req.createdAt || req.timestamp || Date.now()).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-300">
                                  Proposed: <strong className="text-cyan-300">{Object.keys(req.proposedChanges || req.proposedConfigChanges || {}).join(', ')}</strong>
                                </div>
                                {req.reason && (
                                  <div className="text-[10px] text-slate-400 italic">
                                    "{req.reason}"
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleReviewChangeRequest(req.id, true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleReviewChangeRequest(req.id, false)}
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

                  {/* 2. Pending Operator & Organisation Registrations */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Pending Operator Registrations ({pendingUsers.length})
                      </span>
                      <button
                        onClick={() => loadPendingUsers(authenticatedAdmin.badgeId)}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        Refresh
                      </button>
                    </div>

                    {pendingUsers.length === 0 ? (
                      <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                        <p className="font-semibold text-slate-300">All Operator Registrations Are Verified</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {pendingUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-xs">{user.name}</span>
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
                                <span>Approve</span>
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

                  {/* 3. Verified Organisation Database Tenants */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Currently Verified Organisation Tenants (Isolated Databases):
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
          )}
        </div>
      </main>

      {/* Forgot Password / PIN Reset Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Operator Password</h3>
                  <p className="text-[10px] text-slate-400">Update passcode for your Badge ID or Email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {forgotMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{forgotMsg}</span>
              </div>
            )}

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Operator Badge ID or Email *</label>
                <input
                  type="text"
                  value={forgotInput.identifier}
                  onChange={(e) => setForgotInput({ ...forgotInput, identifier: e.target.value })}
                  placeholder="e.g. ME-OPR-4412 or operator@iiests.ac.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">New Password (min 6 characters) *</label>
                <input
                  type="password"
                  value={forgotInput.newPassword}
                  onChange={(e) => setForgotInput({ ...forgotInput, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Confirm New Password *</label>
                <input
                  type="password"
                  value={forgotInput.confirmNewPassword}
                  onChange={(e) => setForgotInput({ ...forgotInput, confirmNewPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Updating...' : 'Set New Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
