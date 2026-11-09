import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  createInitialPlantState,
  tickSimulation,
  injectPlantFault,
  performStationMaintenance,
  toggleStationManualStop,
  updatePlantOperationalConfig,
  formatSimulatedClock,
  advanceToNextDay,
  triggerRandomMachineFailure,
  clearAllStationFaults,
  skipSimulationHours,
  updateSimulationDate,
  applyCustomLayoutToPlantTwin,
  getTodayCalendarDateString,
  createDefaultPerformanceHistory,
} from './simulation/plantEngine';
import type { FaultType } from './types/factory';
import { PlantSimulationState } from './types/factory';
import { CustomBlock, CustomConnection } from './types/customLayout';
import { FactoryCanvas } from './components/FactoryCanvas';
import { StationTelemetryDrawer } from './components/StationTelemetryDrawer';
import { OptimizationDashboard } from './components/OptimizationDashboard';
import { DataIntegrationGuideModal } from './components/DataIntegrationGuideModal';
import { QCSubsystemModal } from './components/QCSubsystemModal';
import { PlantConfigModal } from './components/PlantConfigModal';
import { ComponentDeepDiveView } from './components/ComponentDeepDiveView';
import { PerformanceTrendsCard } from './components/PerformanceTrendsCard';
import { MaterialTraceabilityModal } from './components/MaterialTraceabilityModal';
import { Employee, DEFAULT_EMPLOYEES } from './types/employee';
import { EmployeeManagementModal } from './components/EmployeeManagementModal';
import { PlantAIChatbotModal } from './components/PlantAIChatbotModal';
import { CustomLayoutBuilder } from './components/CustomLayoutBuilder';
import { FinanceAndERPView } from './components/FinanceAndERPView';
import { EnergyAnalyticsView } from './components/EnergyAnalyticsView';
import { ShiftSummaryModal } from './components/ShiftSummaryModal';
import { calculatePlantEnergyAnalytics } from './simulation/energyEngine';
import { generateShiftSummaryReport } from './utils/shiftSummaryReport';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  Wrench,
  Gauge,
  Zap,
  CheckCircle2,
  Clock,
  Truck,
  Users,
  Sliders,
  Calendar,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Flame,
  FileSpreadsheet,
  Bot,
  DollarSign,
  Compass,
  FastForward,
  LogOut,
  Boxes,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Check,
} from 'lucide-react';
import { OperatorLoginPortal } from './components/OperatorLoginPortal';
import {
  AuthSession,
  OperatorProfile,
  TwinEnvironment,
  OrganisationRecord,
  PRECONFIGURED_OPERATORS,
  DESIGNATED_ADMINS,
  ParameterChangeRequest,
} from './types/auth';
import { EntityInspectionModal, InspectableStationId } from './components/EntityInspectionModal';
import { apiClient } from './services/apiClient';

export default function App() {
  const [simulationState, setSimulationState] = useState<PlantSimulationState>(() => {
    try {
      // Determine active tenant organization to load isolated progress
      let activeOrgId = 'iiests-mech';
      try {
        const savedSession = localStorage.getItem('digiTwin_auth_session');
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession);
          if (parsedSession?.operator?.organisationId) {
            activeOrgId = parsedSession.operator.organisationId;
          }
        }
      } catch {
        // ignore
      }

      // Check tenant-isolated state first, then fallback to global saved state
      const tenantKey = `aerotwin_tenant_state_${activeOrgId}`;
      const savedTenant = localStorage.getItem(tenantKey);
      const savedFull = savedTenant || localStorage.getItem('aerotwin_saved_simulation_full');

      if (savedFull) {
        const parsed = JSON.parse(savedFull);
        if (parsed && parsed.stations && parsed.config) {
          // Progress must NOT disappear on page reload: retain exact state, day count, completed items, arrears, and stations
          return parsed;
        }
      }
      const saved = localStorage.getItem('aerotwin_plant_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return createInitialPlantState(parsed, false);
      }
    } catch {
      // ignore storage access errors
    }
    return createInitialPlantState(undefined, false);
  });
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);
  const [selectedQCId, setSelectedQCId] = useState<string>('qc_rm1');
  const [activeMainTab, setActiveMainTab] = useState<
    'optimization' | 'performance_trends' | 'component_deep_dive' | 'leaderboard' | 'qc_subsystem'
  >('optimization');

  // New Modes & Modals
  const [activeViewMode, setActiveViewMode] = useState<
    'simevents_twin' | 'custom_builder' | 'finance_erp' | 'energy_analytics'
  >('simevents_twin');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAIChatbotOpen, setIsAIChatbotOpen] = useState(false);
  const [isShiftSummaryOpen, setIsShiftSummaryOpen] = useState(false);
  const [sweepToast, setSweepToast] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('aerotwin_employees');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_EMPLOYEES;
  });

  const handleUpdateEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    try {
      localStorage.setItem('aerotwin_employees', JSON.stringify(newEmployees));
    } catch {
      // ignore
    }
  };

  // Operator Authentication & Digital Twin Environment Session
  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    try {
      const saved = localStorage.getItem('digiTwin_auth_session');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      isAuthenticated: false,
      operator: PRECONFIGURED_OPERATORS[0],
      environment: 'SIMULATION',
      sessionToken: '',
      loginTimestamp: 0,
    };
  });

  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ParameterChangeRequest[]>([]);

  // Load change requests for admin review
  const loadChangeRequests = async () => {
    try {
      const list = await apiClient.getChangeRequests();
      setChangeRequests(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadChangeRequests();
  }, []);

  const handleLogin = async (operator: OperatorProfile, environment: TwinEnvironment, organisation?: OrganisationRecord) => {
    const orgName = organisation?.name || operator.organisation || 'Mechanical Engg. Dept., IIESTS';
    const orgId = organisation?.id || operator.organisationId || 'iiests-mech';
    const updatedOp = { ...operator, organisation: orgName, organisationId: orgId };
    const session: AuthSession = {
      isAuthenticated: true,
      operator: updatedOp,
      environment,
      sessionToken: `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      loginTimestamp: Date.now(),
    };
    setAuthSession(session);
    try {
      localStorage.setItem('digiTwin_auth_session', JSON.stringify(session));
      // First check local tenant isolation database
      const localTenant = localStorage.getItem(`aerotwin_tenant_state_${orgId}`);
      if (localTenant) {
        const parsedLocal = JSON.parse(localTenant);
        if (parsedLocal && parsedLocal.stations && parsedLocal.config) {
          setSimulationState(parsedLocal);
        }
      }
      // Then check remote tenant database
      const remote = await apiClient.loadTenantState(orgId);
      const stateToLoad = (remote && remote.stations && remote.config) ? remote : (remote?.state?.stations ? remote.state : null);
      if (stateToLoad) {
        setSimulationState(stateToLoad);
      }
    } catch {
      // ignore
    }
  };

  // 4 Designated Super-Admins: Sayandip Mallick, Nilesh Banik, Soumyajit Chakraborty, Chitrayan Biswas
  const isAdmin = useMemo(() => {
    if (!authSession.isAuthenticated || !authSession.operator) return false;
    const op = authSession.operator;
    if (op.role === 'SYSTEM_ADMIN') return true;
    const badge = op.badgeId?.toUpperCase().trim();
    const email = op.email?.toLowerCase().trim();
    return (
      badge === 'CHIEF-ENG-01' ||
      badge === '2023MEB003' ||
      badge === '2023MEB015' ||
      badge === '2023MEB019' ||
      email === 'sayandipmallickclassf@gmail.com' ||
      email === 'rumapolosaha@gmail.com' ||
      email === 'nilesh.banik@mech.iiests.ac.in' ||
      email === 'soumyajit.chakraborty@mech.iiests.ac.in' ||
      email === 'chitrayan.biswas@mech.iiests.ac.in'
    );
  }, [authSession]);

  // Auto-save tenant simulation state to multi-tenant database & tenant-isolated localStorage
  useEffect(() => {
    if (!authSession.isAuthenticated || !authSession.operator?.organisationId) return;
    const orgId = authSession.operator.organisationId;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`aerotwin_tenant_state_${orgId}`, JSON.stringify(simulationState));
        apiClient.saveTenantState(orgId, simulationState);
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [simulationState, authSession]);

  const handleSignOut = () => {
    const unauth: AuthSession = {
      isAuthenticated: false,
      operator: authSession.operator,
      environment: authSession.environment,
      sessionToken: '',
      loginTimestamp: 0,
    };
    setAuthSession(unauth);
    try {
      localStorage.removeItem('digiTwin_auth_session');
    } catch {
      // ignore
    }
  };

  // Handle parameter proposals from non-admin operators
  const handleParameterApprovalRequest = async (changes: Partial<any>, reason: string) => {
    const res = await apiClient.submitChangeRequest({
      requesterName: authSession.operator.name,
      requesterBadge: authSession.operator.badgeId,
      requesterEmail: authSession.operator.email,
      organisationId: authSession.operator.organisationId,
      proposedChanges: changes,
      reason: reason || 'Operational parameter adjustment proposal',
    });
    if (res.success) {
      setSweepToast('Proposal Submitted: Changes sent for System Administrator approval.');
      loadChangeRequests();
    } else {
      setSweepToast(`Submission error: ${res.error || 'Failed to submit proposal'}`);
    }
  };

  // Admin approves or rejects proposal
  const handleReviewProposal = async (requestId: string, approved: boolean) => {
    const targetReq = changeRequests.find(r => r.id === requestId);
    const res = await apiClient.reviewChangeRequest(requestId, approved, authSession.operator.email);
    if (approved && targetReq) {
      setSimulationState(prev => ({
        ...prev,
        config: { ...prev.config, ...targetReq.proposedChanges },
      }));
      setSweepToast(`Proposal Approved: Changes applied to ${authSession.operator.organisation} twin!`);
    } else {
      setSweepToast(`Proposal ${approved ? 'approved' : 'rejected'}.`);
    }
    await loadChangeRequests();
  };

  // Station Entity Inspection Modal State
  const [inspectionStationId, setInspectionStationId] = useState<InspectableStationId | null>(null);

  // Real-time Plant Energy Analytics (active machine states, spindle RPMs, cooling systems)
  const plantEnergyAnalytics = useMemo(() => {
    return calculatePlantEnergyAnalytics(simulationState.stations, simulationState.config);
  }, [simulationState.stations, simulationState.config]);

  // Daily Shift Summary Report (maintenance events, energy consumed, cumulative RUL reduction)
  const shiftSummaryReport = useMemo(() => {
    return generateShiftSummaryReport(simulationState, plantEnergyAnalytics);
  }, [simulationState, plantEnergyAnalytics]);

  // Auto-trigger Shift Summary Modal when shift closes (end of shift, e.g. 4:00 PM)
  const prevIsShiftOpenRef = useRef(simulationState.config.isShiftOpen);
  useEffect(() => {
    if (prevIsShiftOpenRef.current && !simulationState.config.isShiftOpen) {
      setIsShiftSummaryOpen(true);
    }
    prevIsShiftOpenRef.current = simulationState.config.isShiftOpen;
  }, [simulationState.config.isShiftOpen]);

  // Simulation timer loop
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;

  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Bound dt to prevent erratic jumps on background tab
      const safeDt = Math.min(0.2, Math.max(0.01, dt));

      setSimulationState(prev => tickSimulation(prev, safeDt));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Persist simulation state to localStorage so link visits resume unbothered
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('aerotwin_saved_simulation_full', JSON.stringify(simulationState));
        localStorage.setItem('aerotwin_plant_config', JSON.stringify(simulationState.config));
        if (authSession.operator?.organisationId) {
          localStorage.setItem(`aerotwin_tenant_state_${authSession.operator.organisationId}`, JSON.stringify(simulationState));
        }
      } catch {
        // ignore storage/quota errors
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [simulationState, authSession]);

  const handleTogglePlay = () => {
    // Only designated admins can stop/pause the simulation
    if (simulationState.isRunning && !isAdmin) {
      setSweepToast(
        'Action Blocked: Only authorized System Administrators (Sayandip Mallick, Nilesh Banik, Soumyajit Chakraborty, Chitrayan Biswas) can stop the digital twin simulation.'
      );
      return;
    }
    setSimulationState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleSpeedChange = (speed: number) => {
    setSimulationState(prev => ({ ...prev, simulationSpeed: speed }));
  };

  const handleStep = () => {
    setSimulationState(prev => tickSimulation({ ...prev, isRunning: true }, 1.0));
  };

  const handleReset = () => {
    // Only designated admins can reset the simulation
    if (!isAdmin) {
      setSweepToast(
        'Reset Blocked: Only authorized System Administrators can reset the digital twin simulation. Employees may submit parameter changes for admin approval.'
      );
      return;
    }

    setSimulationState(prev => {
      const todayStr = getTodayCalendarDateString();
      const resetConfig = {
        ...prev.config,
        simulatedDate: todayStr,
        simulatedDayCount: 1,
        simulatedSecondsOfDay: (prev.config.shiftStartHour ?? 8) * 3600,
        arrearsUnits: 0,
        trucks: {
          rm1: { ...prev.config.trucks.rm1, unitsLeftToUnload: prev.config.dailyRmPerTruck, hasArrived: false, isUnloading: false, arrivalTimestamp: `${prev.config.shiftStartHour ?? 8}:00` },
          rm2: { ...prev.config.trucks.rm2, unitsLeftToUnload: prev.config.dailyRmPerTruck, hasArrived: false, isUnloading: false, arrivalTimestamp: `${prev.config.shiftStartHour ?? 8}:00` },
          rm3: { ...prev.config.trucks.rm3, unitsLeftToUnload: prev.config.dailyRmPerTruck, hasArrived: false, isUnloading: false, arrivalTimestamp: `${prev.config.shiftStartHour ?? 8}:00` },
        },
      };
      const next = createInitialPlantState(resetConfig, false);
      try {
        localStorage.removeItem('aerotwin_saved_simulation_full');
        if (authSession.operator?.organisationId) {
          localStorage.removeItem(`aerotwin_tenant_state_${authSession.operator.organisationId}`);
        }
        localStorage.setItem('aerotwin_plant_config', JSON.stringify(next.config));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleSelectUnloadingMode = (
    mode: 'MANUAL_HUMAN' | 'FORKLIFT' | 'OVERHEAD_CRANE',
    line?: 'RM1' | 'RM2' | 'RM3'
  ) => {
    setSimulationState(prev => {
      const nextConfig = { ...prev.config };
      if (line === 'RM1') {
        nextConfig.trucks = {
          ...nextConfig.trucks,
          rm1: { ...nextConfig.trucks.rm1, unloadingMode: mode },
        };
      } else if (line === 'RM2') {
        nextConfig.trucks = {
          ...nextConfig.trucks,
          rm2: { ...nextConfig.trucks.rm2, unloadingMode: mode },
        };
      } else if (line === 'RM3') {
        nextConfig.trucks = {
          ...nextConfig.trucks,
          rm3: { ...nextConfig.trucks.rm3, unloadingMode: mode },
        };
      } else {
        nextConfig.unloadingMode = mode;
        nextConfig.trucks = {
          ...nextConfig.trucks,
          rm1: { ...nextConfig.trucks.rm1, unloadingMode: mode },
          rm2: { ...nextConfig.trucks.rm2, unloadingMode: mode },
          rm3: { ...nextConfig.trucks.rm3, unloadingMode: mode },
        };
      }
      return updatePlantOperationalConfig(prev, nextConfig);
    });
  };

  const handleToggleManualStop = (stationId: string) => {
    setSimulationState(prev => toggleStationManualStop(prev, stationId));
  };

  const [failureNotification, setFailureNotification] = useState<string | null>(null);

  const handleInjectFault = (stationId: string, fault: FaultType) => {
    setSimulationState(prev => injectPlantFault(prev, stationId, fault));
  };

  const handleRepair = (stationId: string) => {
    setSimulationState(prev => performStationMaintenance(prev, stationId));
  };

  const handleRandomizeFailure = () => {
    setSimulationState(prev => {
      const res = triggerRandomMachineFailure(prev);
      if (res) {
        setFailureNotification(`⚠️ Random Failure Triggered: ${res.fault.replace(/_/g, ' ')} on ${res.stationName}`);
        setTimeout(() => setFailureNotification(null), 5000);
        return res.state;
      } else {
        setFailureNotification(`ℹ️ All operating machines are already running under simulated fault conditions.`);
        setTimeout(() => setFailureNotification(null), 3000);
        return prev;
      }
    });
  };

  const handleRepairAll = () => {
    setSimulationState(prev => {
      const updated = clearAllStationFaults(prev);
      setFailureNotification(`✅ Restored all plant equipment to nominal operating status.`);
      setTimeout(() => setFailureNotification(null), 4000);
      return updated;
    });
  };

  const handleToggleRandomFailures = () => {
    setSimulationState(prev => {
      const nextVal = !prev.config.randomFailuresEnabled;
      setFailureNotification(nextVal ? `⚡ Stochastic Failure Simulation Enabled (MTBF: ${prev.config.mtbfHours}h)` : `🛑 Stochastic Machine Failures Paused`);
      setTimeout(() => setFailureNotification(null), 3500);
      return {
        ...prev,
        config: {
          ...prev.config,
          randomFailuresEnabled: nextVal,
        },
      };
    });
  };

  const handleAutoBalance = () => {
    // Balances cycle times by nudging bottleneck station speeds
    setSimulationState(prev => {
      const updated = { ...prev };
      for (const st of Object.values(updated.stations)) {
        if (st.type.includes('cnc')) {
          st.nominalProcessingTime = 5.2; // Optimized cycle time
        }
      }
      return updated;
    });
  };

  const handleInjectExternalTelemetry = (payload: any) => {
    if (!payload?.stationId || !simulationState.stations[payload.stationId]) return;
    setSimulationState(prev => {
      const st = prev.stations[payload.stationId];
      if (!st) return prev;
      return {
        ...prev,
        stations: {
          ...prev.stations,
          [payload.stationId]: {
            ...st,
            sensors: {
              ...st.sensors,
              ...(payload.sensors || {}),
            },
          },
        },
      };
    });
  };

  const activeFaultCount = Object.values(simulationState.stations).filter(
    s => s.activeFault !== 'NONE'
  ).length;

  const handleSaveConfig = (partial: any) => {
    setSimulationState(prev => {
      const next = updatePlantOperationalConfig(prev, partial);
      try {
        localStorage.setItem('aerotwin_plant_config', JSON.stringify(next.config));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const clockData = formatSimulatedClock(
    simulationState.config.simulatedSecondsOfDay,
    simulationState.config.simulatedDate,
    simulationState.config.simulatedDayCount
  );

  const currentHour = (simulationState.config.simulatedSecondsOfDay / 3600) % 24;
  const shiftStart = simulationState.config.shiftStartHour;
  const shiftDuration = simulationState.config.shiftDurationHours;
  const shiftElapsedHours = Math.max(0, currentHour - shiftStart);
  const isShiftActive = shiftElapsedHours >= 0 && shiftElapsedHours < shiftDuration;

  const formatShiftEndHour = (start: number, dur: number) => {
    const end = (start + dur) % 24;
    const ampm = end >= 12 ? 'PM' : 'AM';
    const h12 = end % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:00 ${ampm}`;
  };

  const selectedStation = selectedStationId ? simulationState.stations[selectedStationId] : null;

  const handleSkipHours = (hours: number) => {
    setSimulationState(prev => skipSimulationHours(prev, hours));
  };

  const handleJumpToLunch = () => {
    const lunchHour = simulationState.config.lunchBreakStartHour ?? 13.0;
    if (currentHour < lunchHour) {
      setSimulationState(prev => skipSimulationHours(prev, lunchHour - currentHour));
    }
  };

  const handleJumpToEndOfShift = () => {
    const shiftEnd = simulationState.config.shiftStartHour + simulationState.config.shiftDurationHours;
    if (currentHour < shiftEnd) {
      setSimulationState(prev => skipSimulationHours(prev, shiftEnd - currentHour));
    }
  };

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      setSimulationState(prev => updateSimulationDate(prev, newDate));
    }
  };

  const handleSetConveyorMode = (mode: 'STEADY_CONTINUOUS_FLOW' | 'DEMAND_PULL') => {
    handleSaveConfig({ conveyorDispatchMode: mode });
  };

  const handleApplyCustomLayout = (blocks: CustomBlock[], connections: CustomConnection[]) => {
    setSimulationState(prev => applyCustomLayoutToPlantTwin(prev, blocks, connections));
  };

  // If operator is not authenticated, render the industry-standard Operator Login Portal
  if (!authSession.isAuthenticated) {
    return (
      <OperatorLoginPortal
        onLogin={handleLogin}
        defaultOrganisation="Mechanical Engg. Dept., IIESTS"
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 w-full max-w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-950/50 text-white shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>DigiTwin</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  v2.8
                </span>
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] shadow-sm">
                <span className="text-slate-300 font-semibold tracking-wide">
                  {authSession.operator.organisation || 'Mechanical Engg. Dept., IIESTS'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  TENANT DB ACTIVE
                </span>
              </div>
              {/* Environment Indicator Pill */}
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  authSession.environment === 'PRODUCTION'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                    : authSession.environment === 'HISTORICAL'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  authSession.environment === 'PRODUCTION' ? 'bg-emerald-400 animate-ping' : authSession.environment === 'HISTORICAL' ? 'bg-amber-400' : 'bg-cyan-400'
                }`} />
                <span>{authSession.environment}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Industrial Digital Twin & Discrete Event Simulator • Certified Precision Engineering
            </p>
          </div>
        </div>

        {/* Global Live Indicators & Navigation Triggers */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Quick Entity Manifest Inspection Trigger */}
          <button
            onClick={() => setInspectionStationId('inventory_rm1')}
            className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600/20 via-slate-800 to-indigo-600/20 hover:from-cyan-600/40 hover:to-indigo-600/40 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Inspect currently queued entities, material barcodes, lot numbers, and dwell times across Inventory, Converge, and Dispatch blocks"
          >
            <Boxes className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Entity Manifest</span>
            <span className="xl:hidden">Manifest</span>
          </button>

          {/* Active Alerts Pill */}
          {activeFaultCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/40 rounded-lg text-rose-300 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{activeFaultCount} Fault</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nominal</span>
            </div>
          )}

          {/* Daily Shift Summary Report Trigger */}
          <button
            onClick={() => setIsShiftSummaryOpen(true)}
            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600/30 via-slate-800 to-amber-700/30 hover:from-amber-600/50 hover:to-amber-700/50 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Open Daily Shift Summary Report (Major maintenance events, total kWh energy consumed, and cumulative RUL reduction)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Shift Summary Report</span>
            <span className="lg:hidden">Report</span>
            <span className="text-[10px] bg-amber-950 px-1.5 py-0.2 rounded font-mono text-amber-400">
              ₹ & kWh
            </span>
          </button>

          {/* AI Plant Co-Pilot Modal Trigger */}
          <button
            onClick={() => setIsAIChatbotOpen(true)}
            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-950/50 transition border border-purple-400/40"
            title="Chat with DigiTwin AI Co-Pilot about plant health, active faults, bottlenecks, and solutions"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Employee Setup Trigger */}
          <button
            onClick={() => setIsEmployeeModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Configure employee roster, wage rates, roles, and station assignments"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Employees ({employees.length})</span>
            <span className="md:hidden">Staff ({employees.length})</span>
          </button>

          {/* Plant Operational Config Trigger */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Configure Shift Duration, Truck Delivery Schedule, Barehand Unloading, and Machining Times"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Shift & Logistics</span>
            <span className="md:hidden">Config</span>
          </button>

          {/* QC Subsystem Quick Trigger Button */}
          <button
            onClick={() => setIsQCModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Inspect Quality Control Multi-Stage Subsystem (Check I, II, Rework, III)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">QC Subsystem & Rework</span>
            <span className="xl:hidden">QC Subsystem</span>
            <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 rounded font-mono text-emerald-400">
              {simulationState.stations['qc_rm1']?.qcSubsystem?.firstPassYield ?? 88}%
            </span>
          </button>

          {/* Material Traceability & Excel CSV Export */}
          <button
            onClick={() => setIsTraceabilityModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Material Traceability Journey Ledger - Track every raw material entry & timing and export to Excel CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Traceability & Export (.csv)</span>
            <span className="lg:hidden">Traceability</span>
            <span className="text-[10px] bg-amber-950 px-1.5 py-0.2 rounded font-mono text-amber-400">
              CSV
            </span>
          </button>

          {/* Guide / Documentation Modal Trigger */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition border border-slate-700"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Data Guide</span>
            <span className="md:hidden">Guide</span>
          </button>

          {/* Admin Governance & Parameter Approvals Modal Trigger */}
          <button
            onClick={() => { loadChangeRequests(); setIsApprovalsModalOpen(true); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow border ${
              isAdmin
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-500/40'
            }`}
            title="Designated Admin Governance & Parameter Change Proposals"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Approvals</span>
            <span className="sm:hidden">Admin</span>
            {changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold animate-pulse">
                {changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length}
              </span>
            )}
          </button>

          {/* Operator Profile Chip & Sign Out */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                {authSession.operator.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="font-semibold text-white text-[11px] truncate max-w-[110px]">
                  {authSession.operator.name}
                </div>
                <div className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]">
                  {authSession.operator.badgeId}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
              title="Sign Out of DigiTwin Operator Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sweep Toast / Admin Guard Banner */}
      {sweepToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] bg-slate-900 border border-amber-500/80 rounded-xl px-4 py-3 text-amber-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{sweepToast}</span>
          </div>
          <button
            onClick={() => setSweepToast(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 max-w-7xl w-full mx-auto space-y-4 overflow-x-hidden">
        {/* Primary View Mode Switcher (SimEvents vs Custom Simulink Layout vs Finance & ERP vs Energy & Sustainability) */}
        <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-xl gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveViewMode('simevents_twin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeViewMode === 'simevents_twin'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-200" />
              <span>1. SimEvents Digital Twin (28 Stations)</span>
            </button>

            <button
              onClick={() => setActiveViewMode('custom_builder')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeViewMode === 'custom_builder'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-300" />
              <span>2. Custom Layout Canvas (Simulink Drag & Drop)</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded-full font-mono">
                Interactive
              </span>
            </button>

            <button
              onClick={() => setActiveViewMode('finance_erp')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeViewMode === 'finance_erp'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <span>3. Finance, Unit Economics & ERP (₹ INR)</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded-full font-mono">
                COGS + MRP
              </span>
            </button>

            <button
              onClick={() => setActiveViewMode('energy_analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeViewMode === 'energy_analytics'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-emerald-600 text-white shadow-lg shadow-amber-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>4. Energy Consumption & Sustainability Analytics</span>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-1.5 py-0.2 rounded-full font-mono">
                kW • ₹ • CO₂
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsAIChatbotOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow transition animate-pulse"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Plant AI Co-Pilot</span>
          </button>
        </div>

        {/* VIEW 2: CUSTOM SIMULINK LAYOUT BUILDER */}
        {activeViewMode === 'custom_builder' && (
          <CustomLayoutBuilder
            currentPlantSimulationState={simulationState}
            onApplyLayoutToPlantTwin={handleApplyCustomLayout}
            onSwitchToPhysicalTwinView={() => setActiveViewMode('simevents_twin')}
          />
        )}

        {/* VIEW 3: FINANCE, PER-UNIT ECONOMICS & ERP */}
        {activeViewMode === 'finance_erp' && (
          <FinanceAndERPView
            completedToday={simulationState.completedCount}
            dailyTarget={simulationState.config.dailyTargetUnits}
            employees={employees}
            scrapCountToday={simulationState.rejectedCount}
            simulatedDayCount={simulationState.config.simulatedDayCount}
            simulatedDate={simulationState.config.simulatedDate}
          />
        )}

        {/* VIEW 4: ENERGY CONSUMPTION & SUSTAINABILITY ANALYTICS */}
        {activeViewMode === 'energy_analytics' && (
          <EnergyAnalyticsView
            energy={plantEnergyAnalytics}
            simulatedSecondsOfDay={simulationState.config.simulatedSecondsOfDay}
            simulatedDate={simulationState.config.simulatedDate}
            isShiftOpen={simulationState.config.isShiftOpen}
            completedToday={simulationState.completedCount}
          />
        )}

        {/* VIEW 1: DEFAULT SIMEVENTS DISCRETE TWIN */}
        {activeViewMode === 'simevents_twin' && (
          <div className="space-y-4">
            {/* TIME NAVIGATION, DATE PICKER, SKIP HOURS & CONVEYOR MODE BAR */}
            <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Starting Date Picker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Starting Date:</span>
                </span>
                <input
                  type="date"
                  value={simulationState.config.simulatedDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded-lg px-2.5 py-1 text-white font-mono text-xs font-bold focus:border-cyan-500 outline-none transition cursor-pointer"
                  title="Change simulation date"
                />
              </div>

              {/* Skip Hours Action Group */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fast-Forward:</span>
                </span>
                <button
                  onClick={() => handleSkipHours(1)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold transition shadow-sm"
                  title="Skip forward 1 operating hour"
                >
                  +1h
                </button>
                <button
                  onClick={() => handleSkipHours(2)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold transition shadow-sm"
                  title="Skip forward 2 operating hours"
                >
                  +2h
                </button>
                <button
                  onClick={handleJumpToLunch}
                  disabled={currentHour >= (simulationState.config.lunchBreakStartHour ?? 13.0)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium transition"
                  title="Jump to Lunch Break (1:00 PM)"
                >
                  Jump to Lunch (1:00 PM)
                </button>
                <button
                  onClick={handleJumpToEndOfShift}
                  disabled={currentHour >= (simulationState.config.shiftStartHour + simulationState.config.shiftDurationHours)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-indigo-200 border border-indigo-500/30 rounded-lg text-xs font-medium transition"
                  title="Jump to Shift End (4:00 PM)"
                >
                  Jump to Shift End (4:00 PM)
                </button>
              </div>

              {/* Conveyor Dispatch Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
                <span className="text-[10px] text-slate-400 px-1.5 font-semibold uppercase">Conveyor Mode:</span>
                <button
                  onClick={() => handleSetConveyorMode('STEADY_CONTINUOUS_FLOW')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    (simulationState.config.conveyorDispatchMode ?? 'STEADY_CONTINUOUS_FLOW') === 'STEADY_CONTINUOUS_FLOW'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Steady Continuous Flow: transports entity ahead of time so it arrives at CNC entrance right as CNC finishes"
                >
                  Steady Continuous Flow
                </button>
                <button
                  onClick={() => handleSetConveyorMode('DEMAND_PULL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    simulationState.config.conveyorDispatchMode === 'DEMAND_PULL'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Demand Pull (JIT): dispatched from inventory only after CNC finishes previous workpiece"
                >
                  Demand Pull (JIT)
                </button>
              </div>
            </div>

            {/* TIME & DATE STAMP BANNER - Real-Time Calendar, Clock, Shift Progress, and Backlog Arrears */}
            <section aria-label="Time and Date Stamp & Plant Operating Status">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Clock & Calendar Timestamp */}
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-cyan-950/60">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Plant Real-Time Timestamp
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Day {simulationState.config.simulatedDayCount} • 8:00 AM Shift Start
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
                    {clockData.timeStr}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">
                    {simulationState.config.simulatedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Context & Cumulative Machine Wear */}
            <div className="flex-1 max-w-xl bg-slate-950/70 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">
                    {simulationState.config.shiftDurationHours}h Working Shift (08:00 AM – {formatShiftEndHour(shiftStart, shiftDuration)})
                  </span>
                  {simulationState.config.lunchBreakEnabled &&
                  isShiftActive &&
                  currentHour >= (simulationState.config.lunchBreakStartHour ?? 13.0) &&
                  currentHour < (simulationState.config.lunchBreakStartHour ?? 13.0) + (simulationState.config.lunchBreakDurationMinutes ?? 60) / 60 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse">
                      <span>☕ LUNCH BREAK (1:00 PM – 2:00 PM)</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        simulationState.config.isShiftOpen
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {simulationState.config.isShiftOpen ? 'ACTIVE SHIFT' : 'SHIFT CLOSED (MACHINES OFF)'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {simulationState.config.lunchBreakEnabled &&
                  isShiftActive &&
                  currentHour >= (simulationState.config.lunchBreakStartHour ?? 13.0) &&
                  currentHour < (simulationState.config.lunchBreakStartHour ?? 13.0) + (simulationState.config.lunchBreakDurationMinutes ?? 60) / 60
                    ? 'Workers on lunch break (60m) • Unloading & Manual Assembly paused • Factory on standby'
                    : simulationState.config.isShiftOpen
                    ? `Machines active • Flank wear rate ~0.045mm/h • Worker fatigue ${simulationState.config.workerFatiguePercentage}%`
                    : 'Shift closed • Transporters & CNC spindles powered down • Backlog rolls to arrears'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="text-right sm:min-w-[120px]">
                <span className="text-[10px] text-slate-400 font-mono block">
                  {shiftElapsedHours.toFixed(1)}h / {shiftDuration}h ({Math.min(100, Math.round((shiftElapsedHours / shiftDuration) * 100))}%)
                </span>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, (shiftElapsedHours / shiftDuration) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Target & Arrears Tracker */}
            {/* Failure Simulation Quick Controls & Advance Day */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs space-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Today Finished Goods:</span>
                  <span className="font-mono text-emerald-400 font-extrabold text-sm">
                    {simulationState.completedCount} / {simulationState.config.dailyTargetUnits}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                  <span className="text-slate-400">Arrears Backlog:</span>
                  <span className={simulationState.config.arrearsUnits > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                    {simulationState.config.arrearsUnits} units
                  </span>
                </div>
                <div className="text-[9px] text-cyan-300 font-mono">
                  360 RM Delivered (120/line)
                </div>
              </div>

              {/* Stochastic Failure Quick Action Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
                {/* Randomize Failure Button */}
                <button
                  onClick={handleRandomizeFailure}
                  className="px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  title="Inject an immediate random machine failure event (bearing wear, spindle overheat, backlash, or tool chipping)"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Randomize Fault</span>
                </button>

                {/* Stochastic Autopilot Toggle */}
                <button
                  onClick={handleToggleRandomFailures}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 border transition ${
                    simulationState.config.randomFailuresEnabled
                      ? 'bg-purple-950/60 text-purple-300 border-purple-500/50 hover:bg-purple-900/60'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700/80'
                  }`}
                  title={
                    simulationState.config.randomFailuresEnabled
                      ? `Stochastic failures active (MTBF: ${simulationState.config.mtbfHours}h, rate: ${simulationState.config.failureFrequency}). Click to pause.`
                      : 'Stochastic failures paused. Click to enable autonomous machine breakdowns.'
                  }
                >
                  <span className={`w-2 h-2 rounded-full ${simulationState.config.randomFailuresEnabled ? 'bg-purple-400 animate-ping' : 'bg-slate-500'}`} />
                  <span className="hidden sm:inline">Failures:</span>
                  <span className="font-mono font-bold">
                    {simulationState.config.randomFailuresEnabled ? `${simulationState.config.failureFrequency}` : 'OFF'}
                  </span>
                </button>

                {/* Repair All Machines Button */}
                {activeFaultCount > 0 && (
                  <button
                    onClick={handleRepairAll}
                    className="px-2.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-semibold flex items-center gap-1 transition animate-pulse"
                    title="Clear all active equipment faults and return machines to nominal processing"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Repair All</span>
                  </button>
                )}
              </div>

              {/* Advance to Next Day Button */}
              <button
                onClick={() => setSimulationState(prev => advanceToNextDay(prev))}
                className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition hover:scale-[1.02] active:scale-[0.98]"
                title="Roll unfinished units into tomorrow's arrears, resume backlog pieces from their exact positions, reset shift clock to 08:00 AM, and dispatch next truck delivery"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-200" />
                <span className="whitespace-nowrap">Advance to Next Day</span>
              </button>
            </div>
          </div>

          {/* Failure Notification Toast */}
          {failureNotification && (
            <div className="mt-2.5 px-4 py-2 bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">{failureNotification}</span>
              </div>
              <button
                onClick={() => setFailureNotification(null)}
                className="text-slate-400 hover:text-white ml-2 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
          )}
        </section>

        {/* Real-Time Animated Factory Floor Canvas */}
        <section aria-label="Factory Floor Layout & Animation">
          <FactoryCanvas
            simulationState={simulationState}
            selectedStationId={selectedStationId}
            onSelectStation={id => setSelectedStationId(id)}
            onTogglePlay={handleTogglePlay}
            onSpeedChange={handleSpeedChange}
            onStep={handleStep}
            onReset={handleReset}
            onOpenPlantConfigModal={() => setIsConfigModalOpen(true)}
            onSelectUnloadingMode={handleSelectUnloadingMode}
            isAdmin={isAdmin}
            onStopBlocked={() =>
              setSweepToast(
                'Action Blocked: Only authorized System Administrators (Sayandip Mallick, Nilesh Banik, Soumyajit Chakraborty, Chitrayan Biswas) can stop the digital twin simulation.'
              )
            }
          />
        </section>

        {/* Secondary Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('optimization')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition ${
              activeMainTab === 'optimization'
                ? 'bg-slate-800 text-cyan-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Operational Optimization & OEE
          </button>

          <button
            onClick={() => setActiveMainTab('performance_trends')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition ${
              activeMainTab === 'performance_trends'
                ? 'bg-slate-800 text-cyan-300 shadow border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Performance Trends (7 Days)
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
              Recharts
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('component_deep_dive')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition ${
              activeMainTab === 'component_deep_dive'
                ? 'bg-slate-800 text-cyan-300 shadow border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            Component Deep-Dive & Analytics
          </button>

          <button
            onClick={() => setActiveMainTab('leaderboard')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition ${
              activeMainTab === 'leaderboard'
                ? 'bg-slate-800 text-cyan-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Equipment Health & ML Matrix
          </button>

          <button
            onClick={() => setActiveMainTab('qc_subsystem')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition ${
              activeMainTab === 'qc_subsystem'
                ? 'bg-slate-800 text-emerald-300 shadow border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            QC Subsystem & Rework Circuit
          </button>
        </div>

        {/* TAB 1: Optimization Dashboard */}
        {activeMainTab === 'optimization' && (
          <OptimizationDashboard
            oee={simulationState.oee}
            stations={simulationState.stations}
            completedCount={simulationState.completedCount}
            rejectedCount={simulationState.rejectedCount}
            wipCount={simulationState.wipCount}
            timeSeconds={simulationState.timeSeconds}
            bottleneckStationId={simulationState.bottleneckStationId}
            lineBalanceScore={simulationState.lineBalanceScore}
            onSelectStation={id => setSelectedStationId(id)}
            onAutoBalance={handleAutoBalance}
            performanceHistory={simulationState.performanceHistory}
            dailyTargetUnits={simulationState.config.dailyTargetUnits}
            currentArrearsUnits={simulationState.config.arrearsUnits}
            currentDayCount={simulationState.config.simulatedDayCount}
            simulatedDate={simulationState.config.simulatedDate}
            onAdvanceDay={() => setSimulationState(prev => advanceToNextDay(prev))}
          />
        )}

        {/* TAB: Dedicated Performance Trends (7 Days) */}
        {activeMainTab === 'performance_trends' && (
          <div className="space-y-4">
            <PerformanceTrendsCard
              performanceHistory={simulationState.performanceHistory}
              currentCompletedCount={simulationState.completedCount}
              dailyTargetUnits={simulationState.config.dailyTargetUnits}
              currentArrearsUnits={simulationState.config.arrearsUnits}
              currentDayCount={simulationState.config.simulatedDayCount}
              simulatedDate={simulationState.config.simulatedDate}
              onAdvanceDay={() => setSimulationState(prev => advanceToNextDay(prev))}
            />

            {/* 7-Day Performance Log & Variance Ledger */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    7-Day Simulation Output & Arrears Backlog Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive daily shift reconciliation showing finished assemblies, target adherence, and arrears backlog carryover.
                  </p>
                </div>
                <button
                  onClick={() => setSimulationState(prev => advanceToNextDay(prev))}
                  className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Advance Shift to Day {simulationState.config.simulatedDayCount + 1}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Simulation Day</th>
                      <th className="py-2.5 px-3">Simulated Date</th>
                      <th className="py-2.5 px-3">Finished Goods</th>
                      <th className="py-2.5 px-3">Daily Target</th>
                      <th className="py-2.5 px-3">Variance</th>
                      <th className="py-2.5 px-3">Arrears Backlog</th>
                      <th className="py-2.5 px-3">First Pass Yield</th>
                      <th className="py-2.5 px-3">OEE</th>
                      <th className="py-2.5 px-3">Shift Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(simulationState.performanceHistory?.slice(-7) || []).map((row, idx) => {
                      const delta = row.finishedGoods - row.targetUnits;
                      const isMet = delta >= 0;

                      return (
                        <tr
                          key={`${row.dateStr}-${row.day}-${idx}`}
                          className={`hover:bg-slate-800/40 transition ${
                            row.isCurrentDay ? 'bg-cyan-950/20 font-bold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-white flex items-center gap-2 font-sans font-semibold">
                            {row.isCurrentDay && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            )}
                            {row.dayLabel}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{row.dateStr}</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-bold">
                            {row.finishedGoods} units
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {row.targetUnits} units
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                isMet
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {isMet ? `+${delta}` : delta} u
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`font-semibold ${
                                row.arrearsBacklog > 20
                                  ? 'text-rose-400'
                                  : row.arrearsBacklog > 0
                                  ? 'text-amber-300'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {row.arrearsBacklog} units
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{row.fpy}%</td>
                          <td className="py-2.5 px-3 text-slate-300">{row.oee}%</td>
                          <td className="py-2.5 px-3 font-sans">
                            {row.isCurrentDay ? (
                              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                                In Progress
                              </span>
                            ) : isMet ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                                Quota Fulfilled
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                                Deficit Rolled Over
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: In-Depth Component Analysis & Telemetry */}
        {activeMainTab === 'component_deep_dive' && (
          <ComponentDeepDiveView
            simulationState={simulationState}
            onSelectStation={id => setSelectedStationId(id)}
            onInjectFault={handleInjectFault}
            onPerformMaintenance={handleRepair}
            onOpenQCModal={id => {
              setSelectedQCId(id);
              setIsQCModalOpen(true);
            }}
          />
        )}

        {/* TAB 2: Equipment Health & ML Anomaly Matrix */}
        {activeMainTab === 'leaderboard' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Machine Learning Equipment Diagnostics & Anomaly Scores
                </h2>
                <p className="text-xs text-slate-400">
                  Continuous inference using Isolation Forest, Deep Autoencoders, and Weibull Remaining Useful Life (RUL) with active flank wear tracking
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const degradedCount = Object.values(simulationState.stations).filter(
                      s => s.mlResult.isAnomaly || s.sensors.toolWearIndex > 0.12 || s.sensors.vibrationRms > 2.8
                    ).length;
                    const faultCount = Object.values(simulationState.stations).filter(
                      s => s.activeFault !== 'NONE'
                    ).length;
                    setSweepToast(
                      `ML Sweep executed: 28 equipment units analyzed. Detected ${faultCount} critical fault(s) and ${degradedCount} component(s) in progressive wear/degradation zone.`
                    );
                    setTimeout(() => setSweepToast(null), 5000);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Run ML Diagnostic Sweep</span>
                </button>
              </div>
            </div>

            {sweepToast && (
              <div className="p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-xs text-cyan-200 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{sweepToast}</span>
                </div>
                <button
                  onClick={() => setSweepToast(null)}
                  className="text-cyan-400 hover:text-white font-mono ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Equipment / Block</th>
                    <th className="py-2.5 px-3">SimEvents Tag</th>
                    <th className="py-2.5 px-3">Line</th>
                    <th className="py-2.5 px-3">Vibration (ISO 10816)</th>
                    <th className="py-2.5 px-3">Temp (°C)</th>
                    <th className="py-2.5 px-3">Tool Wear (VB)</th>
                    <th className="py-2.5 px-3">Anomaly Index</th>
                    <th className="py-2.5 px-3">ML Diagnostic Class</th>
                    <th className="py-2.5 px-3">RUL (Hours)</th>
                    <th className="py-2.5 px-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(simulationState.stations)
                    .filter(s => !s.isQueue && s.type !== 'truck_source' && s.type !== 'sink_dispatch')
                    .map(station => {
                      const ml = station.mlResult;
                      const hasFault = station.activeFault !== 'NONE';
                      const isDegraded = ml.isAnomaly || station.sensors.toolWearIndex > 0.14 || station.sensors.vibrationRms > 2.8;

                      return (
                        <tr
                          key={station.id}
                          onClick={() => setSelectedStationId(station.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              hasFault
                                ? 'bg-rose-500 animate-pulse'
                                : isDegraded
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`} />
                            <div>
                              <div className="text-white font-medium">{station.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Run Hours: {station.cumulativeRunHours.toFixed(1)}h
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-400 text-[11px]">
                            {station.simulinkTag}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">
                            {station.line}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className={`${
                              station.sensors.vibrationRms > 4.5
                                ? 'text-rose-400 font-bold'
                                : station.sensors.vibrationRms > 2.8
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-300'
                            }`}>
                              {station.sensors.vibrationRms.toFixed(2)} mm/s
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className={`${
                              station.sensors.temperature > 65
                                ? 'text-rose-400 font-bold'
                                : station.sensors.temperature > 52
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-300'
                            }`}>
                              {station.sensors.temperature.toFixed(1)} °C
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {station.sensors.toolWearIndex > 0 ? (
                              <span className={station.sensors.toolWearIndex > 0.25 ? 'text-rose-400 font-bold' : station.sensors.toolWearIndex > 0.14 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                                {station.sensors.toolWearIndex.toFixed(3)} mm
                              </span>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    ml.anomalyScore > 0.5
                                      ? 'bg-rose-500'
                                      : ml.anomalyScore > 0.25
                                      ? 'bg-amber-400'
                                      : 'bg-cyan-500'
                                  }`}
                                  style={{ width: `${Math.min(100, ml.anomalyScore * 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold">
                                {(ml.anomalyScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-block ${
                              hasFault
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isDegraded
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {ml.predictedFailureClass}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span className={
                              ml.remainingUsefulLifeHours < 24
                                ? 'text-rose-400'
                                : ml.remainingUsefulLifeHours < 80
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }>
                              {ml.remainingUsefulLifeHours} hrs
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasFault ? (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRepair(station.id);
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded font-semibold transition shadow"
                                  title="Perform maintenance and repair this machine"
                                >
                                  Repair
                                </button>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const fault: FaultType = station.type === 'cnc_lathe'
                                      ? 'TOOL_FLANK_WEAR'
                                      : station.type === 'cnc_milling'
                                      ? 'SPINDLE_THERMAL_EXPANSION'
                                      : 'SPINDLE_BEARING_VIBRATION';
                                    handleInjectFault(station.id, fault);
                                  }}
                                  className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 text-[10px] rounded font-semibold transition"
                                  title="Inject test failure into this machine"
                                >
                                  Inject Fault
                                </button>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedStationId(station.id);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] rounded font-semibold transition"
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: QC Subsystem & Rework Circuit */}
        {activeMainTab === 'qc_subsystem' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Quality Control Subsystem (Check I, Check II, Rework, Check III)
                </h2>
                <p className="text-xs text-slate-400">
                  Exact block wiring and routing matching your uploaded Quality Control subsystem diagram.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsQCModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <span>Open Fullscreen Subsystem Studio</span>
                  <span>↗</span>
                </button>
              </div>
            </div>

            {/* Side-by-side screenshot & live metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Screenshot Reference */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Simulink Subsystem Screenshot:</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    public/assets/aistudio/Screenshot_2026-11-03_2032002_16658021.png
                  </span>
                </div>
                <div className="bg-white/95 p-2 rounded-lg flex justify-center overflow-hidden border border-slate-700">
                  <img
                    src="/assets/aistudio/Screenshot_2026-11-03_2032002_16658021.png"
                    alt="Simulink Quality Control Subsystem Diagram"
                    className="max-h-48 object-contain rounded"
                  />
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Notice the 3-stage flow: <strong>CHECK I</strong> passes directly to top outfeed or diverts to <strong>CHECK II</strong>. CHECK II splits fatal rejects to <strong>Scrap Sink 1</strong> or routes recoverable parts to <strong>REWORK</strong> $\rightarrow$ <strong>CHECK III</strong> $\rightarrow$ Output Join!
                </div>
              </div>

              {/* Live Yield & Flow State */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Live Performance across 3 Intake Lines:
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { id: 'qc_rm1', label: 'QC Line 1 (Lathe Shafts)' },
                      { id: 'qc_rm2', label: 'QC Line 2 (Milled Housings)' },
                      { id: 'qc_rm3', label: 'QC Line 3 (Shaped Gears)' },
                    ].map(line => {
                      const st = simulationState.stations[line.id];
                      const qc = st?.qcSubsystem;
                      return (
                        <div key={line.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-white">{line.label}</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              FPY: {qc?.firstPassYield ?? 88}% • RTY: {qc?.rolledThroughputYield ?? 94}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Check I Passed: <strong className="text-emerald-400">{qc?.check1Passed ?? 14}</strong></span>
                            <span>Reworked: <strong className="text-amber-400">{qc?.reworkProcessed ?? 2}</strong></span>
                            <span>Scrapped: <strong className="text-rose-400">{(qc?.check2Scrapped ?? 0) + (qc?.check3Scrapped ?? 0)}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Six Sigma DMAIC Integration</span>
                  <button
                    onClick={() => setIsQCModalOpen(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                  >
                    Launch Interactive Schematic →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        )}
      </main>

      {/* Floating Action Button for AI Co-Pilot */}
      <button
        onClick={() => setIsAIChatbotOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-2xl shadow-purple-950/80 flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 border border-purple-400/40"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <span className="text-xs tracking-wide">AI Plant Co-Pilot</span>
      </button>

      {/* Slide-out Station Telemetry Drawer */}
      <StationTelemetryDrawer
        station={selectedStation}
        entities={simulationState.entities}
        onClose={() => setSelectedStationId(null)}
        onInjectFault={handleInjectFault}
        onRepair={handleRepair}
        onToggleManualStop={handleToggleManualStop}
        onOpenQCSubsystem={id => {
          setSelectedQCId(id);
          setIsQCModalOpen(true);
        }}
        onOpenEntityInspection={id => {
          setInspectionStationId(id as InspectableStationId);
        }}
      />

      {/* Entity Inspection Modal for Inventory, Converge, and Dispatch blocks */}
      {!!inspectionStationId && (
        <EntityInspectionModal
          isOpen={true}
          stationId={inspectionStationId}
          onClose={() => setInspectionStationId(null)}
          onSelectStation={id => setInspectionStationId(id)}
          state={simulationState}
        />
      )}

      {/* Employee & Workforce Setup Modal */}
      <EmployeeManagementModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onUpdateEmployees={handleUpdateEmployees}
        isAdmin={isAdmin}
      />

      {/* AI Plant Diagnostics Chatbot Modal */}
      <PlantAIChatbotModal
        isOpen={isAIChatbotOpen}
        onClose={() => setIsAIChatbotOpen(false)}
        simulationState={simulationState}
        onRepairStation={handleRepair}
      />

      {/* Quality Control Subsystem Modal */}
      <QCSubsystemModal
        isOpen={isQCModalOpen}
        onClose={() => setIsQCModalOpen(false)}
        stations={simulationState.stations}
        selectedQCId={selectedQCId}
        onSelectQCId={id => setSelectedQCId(id)}
      />

      {/* Material Traceability & Excel CSV Export Modal */}
      <MaterialTraceabilityModal
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
        records={simulationState.itemLifecycleLedger || []}
        currentDateStr={simulationState.config.simulatedDate}
      />

      {/* Data Integration & ML Engineering Modal */}
      <DataIntegrationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onInjectExternalTelemetry={handleInjectExternalTelemetry}
      />

      {/* Plant Operational Configuration Modal */}
      <PlantConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={simulationState.config}
        onSaveConfig={handleSaveConfig}
        onTriggerRandomFailure={handleRandomizeFailure}
        onRepairAll={handleRepairAll}
        isAdmin={isAdmin}
        onRequestApproval={handleParameterApprovalRequest}
      />

      {/* Admin Governance & Parameter Change Proposals Modal */}
      {isApprovalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Admin Governance & Parameter Proposals
                  </h3>
                  <p className="text-xs text-slate-400">
                    Active Profile: <strong className="text-slate-200">{authSession.operator.name}</strong> ({authSession.operator.badgeId}) • {isAdmin ? <span className="text-emerald-400 font-bold">Authorized Admin</span> : <span className="text-amber-400">Operator Access</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApprovalsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* 4 Designated Super-Admins Directory */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    4 Designated System Administrators
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">Authorized: Stop/Reset/Edit/Approve</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {DESIGNATED_ADMINS.map(admin => (
                    <div key={admin.badgeId} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-white text-[11px] truncate">{admin.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{admin.badgeId} • {admin.email}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono font-bold shrink-0">
                        ADMIN
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Parameter Change Proposals List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Pending Proposals ({changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length})
                  </span>
                  <button onClick={loadChangeRequests} className="text-cyan-400 hover:underline text-[11px]">
                    Refresh
                  </button>
                </div>

                {changeRequests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-80" />
                    <p className="font-semibold text-slate-200">No Pending Parameter Change Proposals</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      When plant operators submit changes from Shift & Logistics, proposals will appear here for admin review.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {changeRequests
                      .filter(r => r.status === 'PENDING_ADMIN_APPROVAL')
                      .map(req => (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs">{req.requesterName}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                                {req.requesterBadge}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(req.createdAt || req.timestamp || Date.now()).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono">
                              Parameters: <strong className="text-cyan-300">{Object.keys(req.proposedChanges || req.proposedConfigChanges || {}).join(', ')}</strong>
                            </div>
                            {req.reason && (
                              <div className="text-[10px] text-slate-400 italic">
                                "{req.reason}"
                              </div>
                            )}
                          </div>

                          {isAdmin ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleReviewProposal(req.id, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReviewProposal(req.id, false)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs flex items-center gap-1 border border-rose-700 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800 px-2.5 py-1 rounded-lg">
                              Awaiting Super-Admin Approval
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Shift Summary Report Modal */}
      <ShiftSummaryModal
        isOpen={isShiftSummaryOpen}
        onClose={() => setIsShiftSummaryOpen(false)}
        report={shiftSummaryReport}
        onAdvanceToNextDay={() => {
          setSimulationState(prev => advanceToNextDay(prev));
          setIsShiftSummaryOpen(false);
        }}
      />
    </div>
  );
}
