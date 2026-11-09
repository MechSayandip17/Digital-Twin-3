import React, { useState } from 'react';
import { PlantOperationalConfig } from '../types/factory';
import { parseTimeStringToHour } from '../simulation/plantEngine';
import {
  Clock,
  Truck,
  Users,
  Cog,
  ShieldCheck,
  Package,
  Wrench,
  X,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Layers,
  ArrowRight,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface PlantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlantOperationalConfig;
  onSaveConfig: (updated: Partial<PlantOperationalConfig>) => void;
  onTriggerRandomFailure?: () => void;
  onRepairAll?: () => void;
  isAdmin?: boolean;
  onRequestApproval?: (proposal: Partial<PlantOperationalConfig>, title: string, description: string) => void;
}

export function PlantConfigModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTriggerRandomFailure,
  onRepairAll,
  isAdmin = true,
  onRequestApproval,
}: PlantConfigModalProps) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<PlantOperationalConfig>({ ...config });

  const handleApply = () => {
    // Explicitly synchronize arrivalHour for all trucks with their arrivalTimeStr
    const syncedTrucks = {
      rm1: {
        ...formData.trucks.rm1,
        arrivalHour: parseTimeStringToHour(formData.trucks.rm1.arrivalTimeStr),
      },
      rm2: {
        ...formData.trucks.rm2,
        arrivalHour: parseTimeStringToHour(formData.trucks.rm2.arrivalTimeStr),
      },
      rm3: {
        ...formData.trucks.rm3,
        arrivalHour: parseTimeStringToHour(formData.trucks.rm3.arrivalTimeStr),
      },
    };

    const syncedConfig: Partial<PlantOperationalConfig> = {
      ...formData,
      trucks: syncedTrucks,
    };

    if (!isAdmin && onRequestApproval) {
      onRequestApproval(
        syncedConfig,
        'Operational Shift & Machining Parameters Proposal',
        `Adjusted parameters: Shift ${formData.shiftDurationHours}h, Lathe ${formData.latheCycleTimeMinutes}m, Milling ${formData.millingCycleTimeMinutes}m, Shaping ${formData.shapingCycleTimeMinutes}m, Unloading: ${formData.unloadingMode}`
      );
      onClose();
      return;
    }

    onSaveConfig(syncedConfig);
    onClose();
  };

  const handleApplyStandardDefaults = () => {
    const standardDefaults: Partial<PlantOperationalConfig> = {
      shiftDurationHours: 8,
      shiftStartHour: 8,
      trucks: {
        rm1: {
          arrivalTimeStr: '08:00 AM',
          arrivalHour: 8.0,
          unitsDelivered: 120,
          unitsLeftToUnload: 120,
          hasArrived: false,
          isUnloading: false,
          enabled: true,
          unloadingMode: 'MANUAL_HUMAN',
        },
        rm2: {
          arrivalTimeStr: '08:15 AM',
          arrivalHour: 8.25,
          unitsDelivered: 120,
          unitsLeftToUnload: 120,
          hasArrived: false,
          isUnloading: false,
          enabled: true,
          unloadingMode: 'FORKLIFT',
        },
        rm3: {
          arrivalTimeStr: '08:30 AM',
          arrivalHour: 8.5,
          unitsDelivered: 120,
          unitsLeftToUnload: 120,
          hasArrived: false,
          isUnloading: false,
          enabled: true,
          unloadingMode: 'OVERHEAD_CRANE',
        },
      },
      dailyTargetUnits: 120,
      dailyRmPerTruck: 120,
      lunchBreakEnabled: true,
      lunchBreakStartHour: 13.0,
      lunchBreakDurationMinutes: 60,
      unloadingMode: 'MANUAL_HUMAN',
      humanCrewSize: 3,
      conveyorTransportTimeSeconds: 45,
      conveyorLatheTimeSeconds: 360,
      conveyorMillingTimeSeconds: 240,
      conveyorShapingTimeSeconds: 210,
      latheCycleTimeMinutes: 6.0,
      millingCycleTimeMinutes: 4.0,
      shapingCycleTimeMinutes: 3.5,
      bypassSubassemblyDirectToQC: true,
      qualityParameters: {
        inspectionDurationSeconds: 30,
        reworkDurationSeconds: 180,
        dimensionalToleranceMm: 0.02,
        surfaceRoughnessRa: 0.8,
        hardnessHrcMin: 45,
        hardnessHrcMax: 50,
      },
      assemblyMode: 'SEMI_AUTOMATED',
      assemblyCycleTimeMinutes: 4.0,
      packagingCycleTimeMinutes: 4.0,
      randomFailuresEnabled: true,
      failureFrequency: 'MEDIUM',
      mtbfHours: 16.0,
      toolWearRateMultiplier: 1.0,
    };

    setFormData(prev => ({
      ...prev,
      ...standardDefaults,
      trucks: {
        ...prev.trucks,
        ...standardDefaults.trucks,
      },
      qualityParameters: {
        ...prev.qualityParameters,
        ...standardDefaults.qualityParameters,
      },
    }));
  };

  const handleRandomizeTrucks = () => {
    // Generate random arrival hours between 8.0 and 10.0
    const h1 = 8.0 + Math.random() * 1.8;
    const h2 = 8.0 + Math.random() * 1.8;
    const h3 = 8.0 + Math.random() * 1.8;

    const toTimeStr = (hourVal: number) => {
      const h = Math.floor(hourVal);
      const m = Math.floor((hourVal - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} AM`;
    };

    setFormData(prev => ({
      ...prev,
      trucks: {
        rm1: { ...prev.trucks.rm1, arrivalHour: Number(h1.toFixed(2)), arrivalTimeStr: toTimeStr(h1) },
        rm2: { ...prev.trucks.rm2, arrivalHour: Number(h2.toFixed(2)), arrivalTimeStr: toTimeStr(h2) },
        rm3: { ...prev.trucks.rm3, arrivalHour: Number(h3.toFixed(2)), arrivalTimeStr: toTimeStr(h3) },
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-xl shadow">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Plant Operational Configuration & Shift Parameters
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                  Discrete SimEvents
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure 8-hour shift schedule, autonomous truck arrivals, manual barehand unloading, cycle times, and QC parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyStandardDefaults}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset to standard industrial specifications (120 units RM/truck, 4m assembly)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Factory Standards</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          {/* SECTION 1: Shift & Operating Time */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>1. Shift Duration & Machine Operating Hours</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Daily 8:00 AM Start • Machine Wear Tracking
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Shift Duration: <span className="text-cyan-400 font-bold">{formData.shiftDurationHours} Hours</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="1"
                  value={formData.shiftDurationHours}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, shiftDurationHours: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>4 Hours</span>
                  <span className="text-cyan-400 font-semibold">8h Default</span>
                  <span>16h (2 Shifts)</span>
                  <span>24h (3 Shifts)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <div className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>Shift Window:</span>
                  <span className="font-mono text-cyan-300">
                    08:00 AM – {(8 + formData.shiftDurationHours) % 24}:00 {8 + formData.shiftDurationHours >= 12 ? 'PM' : 'AM'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Machines run for the full duration everyday. Machine wear (VB flank wear and bearing spalling) accumulates proportionally to operating run-hours.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1B: Lunch Break Schedule */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>1B. Lunch Time Break Schedule (Factory Floor Rest Period)</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <span>Enable Lunch Break</span>
                <input
                  type="checkbox"
                  checked={formData.lunchBreakEnabled}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, lunchBreakEnabled: e.target.checked }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {formData.lunchBreakEnabled ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Lunch Start Time:
                  </label>
                  <select
                    value={formData.lunchBreakStartHour}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        lunchBreakStartHour: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={11.5}>11:30 AM</option>
                    <option value={12.0}>12:00 PM</option>
                    <option value={12.5}>12:30 PM</option>
                    <option value={13.0}>01:00 PM (Default)</option>
                    <option value={13.5}>01:30 PM</option>
                    <option value={14.0}>02:00 PM</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Default: 1:00 PM (13:00)</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Lunch Duration:
                  </label>
                  <select
                    value={formData.lunchBreakDurationMinutes}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        lunchBreakDurationMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 Hour - Default)</option>
                    <option value={90}>90 Minutes (1.5 Hours)</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Default: 1 Hour (60 min)</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1">
                  <div className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Active Lunch Window:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {Math.floor(formData.lunchBreakStartHour)}:{Math.round((formData.lunchBreakStartHour % 1) * 60).toString().padStart(2, '0')} – {Math.floor(formData.lunchBreakStartHour + formData.lunchBreakDurationMinutes / 60)}:{Math.round(((formData.lunchBreakStartHour + formData.lunchBreakDurationMinutes / 60) % 1) * 60).toString().padStart(2, '0')} PM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    During lunch break, human operators pause unloading & assembly operations. Stations display status <span className="font-mono text-amber-300">LUNCH_BREAK</span> and machine wear is arrested.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 text-xs text-slate-400 italic bg-slate-900/40 rounded-lg border border-slate-800/60">
                Lunch break is disabled. Factory will operate continuously throughout the {formData.shiftDurationHours}-hour shift without operator meal pause.
              </div>
            )}
          </div>

          {/* SECTION 2: Autonomous Truck Logistics */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>2. Raw Material Truck Delivery Schedule (8:00 AM – 10:00 AM)</span>
              </div>
              <button
                type="button"
                onClick={handleRandomizeTrucks}
                className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/80 rounded text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3" />
                Randomize Arrival Times (8-10 AM)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Truck RM1 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Truck RM1 (Shaft Stock)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    RM1
                  </span>
                </div>
                {/* Truck Enable / Disable Toggle */}
                <div className="flex items-center justify-between bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-300">Truck Delivery Status:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = formData.trucks.rm1.enabled !== false;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm1: { ...prev.trucks.rm1, enabled: !curr },
                        },
                      }));
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      formData.trucks.rm1.enabled !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {formData.trucks.rm1.enabled !== false ? '● ACTIVE INFLOW' : '○ TURNED OFF'}
                  </button>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Arrival Time (8-10 AM):</label>
                  <input
                    type="text"
                    value={formData.trucks.rm1.arrivalTimeStr}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm1: {
                            ...prev.trucks.rm1,
                            arrivalTimeStr: val,
                            arrivalHour: parseTimeStringToHour(val),
                          },
                        },
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Units Delivered:</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={formData.trucks.rm1.unitsDelivered}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm1: { ...prev.trucks.rm1, unitsDelivered: Math.max(0, Number(e.target.value)) },
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-[10px] text-slate-500">Default: 120 units (0 to pause line intake)</span>
                </div>
              </div>

              {/* Truck RM2 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Truck RM2 (Housing Castings)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    RM2
                  </span>
                </div>
                {/* Truck Enable / Disable Toggle */}
                <div className="flex items-center justify-between bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-300">Truck Delivery Status:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = formData.trucks.rm2.enabled !== false;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm2: { ...prev.trucks.rm2, enabled: !curr },
                        },
                      }));
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      formData.trucks.rm2.enabled !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {formData.trucks.rm2.enabled !== false ? '● ACTIVE INFLOW' : '○ TURNED OFF'}
                  </button>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Arrival Time (8-10 AM):</label>
                  <input
                    type="text"
                    value={formData.trucks.rm2.arrivalTimeStr}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm2: {
                            ...prev.trucks.rm2,
                            arrivalTimeStr: val,
                            arrivalHour: parseTimeStringToHour(val),
                          },
                        },
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Units Delivered:</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={formData.trucks.rm2.unitsDelivered}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm2: { ...prev.trucks.rm2, unitsDelivered: Math.max(0, Number(e.target.value)) },
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-[10px] text-slate-500">Default: 120 units (0 to pause line intake)</span>
                </div>
              </div>

              {/* Truck RM3 */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Truck RM3 (Gear Blanks)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    RM3
                  </span>
                </div>
                {/* Truck Enable / Disable Toggle */}
                <div className="flex items-center justify-between bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-300">Truck Delivery Status:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const curr = formData.trucks.rm3.enabled !== false;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm3: { ...prev.trucks.rm3, enabled: !curr },
                        },
                      }));
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      formData.trucks.rm3.enabled !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {formData.trucks.rm3.enabled !== false ? '● ACTIVE INFLOW' : '○ TURNED OFF'}
                  </button>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Arrival Time (8-10 AM):</label>
                  <input
                    type="text"
                    value={formData.trucks.rm3.arrivalTimeStr}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm3: {
                            ...prev.trucks.rm3,
                            arrivalTimeStr: val,
                            arrivalHour: parseTimeStringToHour(val),
                          },
                        },
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Units Delivered:</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={formData.trucks.rm3.unitsDelivered}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        trucks: {
                          ...prev.trucks,
                          rm3: { ...prev.trucks.rm3, unitsDelivered: Math.max(0, Number(e.target.value)) },
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-[10px] text-slate-500">Default: 120 units (0 to pause line intake)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2B: Truck Unloading & Material Infeed Mechanism (3 Distinct Modes Independently Selectable for RM1, RM2, RM3) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>2B. Truck Unloading & Material Infeed Technology (3 Modes Independently Configurable)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>Set All Docks:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      unloadingMode: 'MANUAL_HUMAN',
                      trucks: {
                        rm1: { ...prev.trucks.rm1, unloadingMode: 'MANUAL_HUMAN' },
                        rm2: { ...prev.trucks.rm2, unloadingMode: 'MANUAL_HUMAN' },
                        rm3: { ...prev.trucks.rm3, unloadingMode: 'MANUAL_HUMAN' },
                      },
                    }));
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                >
                  All 👷 Barehand
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      unloadingMode: 'FORKLIFT',
                      trucks: {
                        rm1: { ...prev.trucks.rm1, unloadingMode: 'FORKLIFT' },
                        rm2: { ...prev.trucks.rm2, unloadingMode: 'FORKLIFT' },
                        rm3: { ...prev.trucks.rm3, unloadingMode: 'FORKLIFT' },
                      },
                    }));
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                >
                  All 🚜 Forklift
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      unloadingMode: 'OVERHEAD_CRANE',
                      trucks: {
                        rm1: { ...prev.trucks.rm1, unloadingMode: 'OVERHEAD_CRANE' },
                        rm2: { ...prev.trucks.rm2, unloadingMode: 'OVERHEAD_CRANE' },
                        rm3: { ...prev.trucks.rm3, unloadingMode: 'OVERHEAD_CRANE' },
                      },
                    }));
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                >
                  All 🏗️ Crane
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Select the material handling technology independently for each unloading dock (Truck RM1, Truck RM2, and Truck RM3). The simulation renders distinct live physical animations for each selected mode.
            </p>

            {/* Independent 3 Docks Selectors */}
            <div className="space-y-3">
              {[
                { key: 'rm1' as const, name: 'Truck Unloading RM1', tag: 'RM1 • Lathe Shaft Stock', badgeColor: 'bg-blue-950 text-blue-300 border-blue-800' },
                { key: 'rm2' as const, name: 'Truck Unloading RM2', tag: 'RM2 • Milling Housing Castings', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
                { key: 'rm3' as const, name: 'Truck Unloading RM3', tag: 'RM3 • Shaping Gear Plates', badgeColor: 'bg-amber-950 text-amber-300 border-amber-800' },
              ].map(dock => {
                const currentMode = formData.trucks[dock.key].unloadingMode || formData.unloadingMode || 'MANUAL_HUMAN';
                return (
                  <div key={dock.key} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{dock.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${dock.badgeColor}`}>
                          {dock.tag}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                        Active: {currentMode === 'MANUAL_HUMAN' ? '👷 Barehand Crew' : currentMode === 'FORKLIFT' ? '🚜 Hydraulic Forklift' : '🏗️ Overhead Crane'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Barehand button */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            trucks: {
                              ...prev.trucks,
                              [dock.key]: { ...prev.trucks[dock.key], unloadingMode: 'MANUAL_HUMAN' },
                            },
                          }));
                        }}
                        className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                          currentMode === 'MANUAL_HUMAN'
                            ? 'border-cyan-500 bg-cyan-950/40 text-white ring-1 ring-cyan-500/50'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">👷</span>
                          <div>
                            <div className="text-xs font-bold">Barehand Crew</div>
                            <div className="text-[10px] text-slate-500">Manual Lift (~3.5s)</div>
                          </div>
                        </div>
                        {currentMode === 'MANUAL_HUMAN' && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>

                      {/* Forklift button */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            trucks: {
                              ...prev.trucks,
                              [dock.key]: { ...prev.trucks[dock.key], unloadingMode: 'FORKLIFT' },
                            },
                          }));
                        }}
                        className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                          currentMode === 'FORKLIFT'
                            ? 'border-amber-500 bg-amber-950/40 text-white ring-1 ring-amber-500/50'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚜</span>
                          <div>
                            <div className="text-xs font-bold">Forklift Truck</div>
                            <div className="text-[10px] text-slate-500">Hydraulic Mast (~2.0s)</div>
                          </div>
                        </div>
                        {currentMode === 'FORKLIFT' && <Check className="w-4 h-4 text-amber-400" />}
                      </button>

                      {/* Crane Gantry button */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            trucks: {
                              ...prev.trucks,
                              [dock.key]: { ...prev.trucks[dock.key], unloadingMode: 'OVERHEAD_CRANE' },
                            },
                          }));
                        }}
                        className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                          currentMode === 'OVERHEAD_CRANE'
                            ? 'border-blue-500 bg-blue-950/40 text-white ring-1 ring-blue-500/50'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏗️</span>
                          <div>
                            <div className="text-xs font-bold">Crane Gantry</div>
                            <div className="text-[10px] text-slate-500">Electric Hoist (~1.2s)</div>
                          </div>
                        </div>
                        {currentMode === 'OVERHEAD_CRANE' && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crew options if Barehand is active */}
            {formData.unloadingMode === 'MANUAL_HUMAN' && (
              <div className="mt-2 p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Manual Unloading Crew Size:</span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5].map(crew => (
                      <button
                        key={crew}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, humanCrewSize: crew }))}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                          (formData.humanCrewSize ?? 3) === crew
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {crew} Workers
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Fatigue Index: {formData.workerFatiguePercentage ?? 5}% • Shift Ergonomics ISO 11228-1
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Raw Material Infeed QA & Environmental Specifications */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>3. Raw Material Infeed QA & Environmental Specifications</span>
              </div>
              <span className="text-xs text-slate-400">
                AS9100D Aerospace Certified Infeed Buffer
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Sampling Plan (AQL)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      ANSI/ASQ Z1.4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Normal Level II incoming inspection standard. 99.8% nominal acceptance threshold for aerospace alloys.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300 font-mono">
                  Acceptance: &gt;99.5% Pass Rate
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Moisture & Oxidation</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      0.020% Max
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Desiccant dry-air circulation prevents surface oxidation on titanium bars and cast aluminum housing blanks.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300 font-mono">
                  Current Moisture: 0.012%
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Climate Staging Control</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      21.4°C / 42% RH
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Temperature stabilization prevents thermal expansion variances prior to high-precision CNC lathe and milling intake.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300 font-mono">
                  Target: 20°C - 23°C
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Transporters & Machining Cycle Times */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Cog className="w-4 h-4 text-cyan-400" />
                <span>4. Conveyor Transport & Machining Cycle Times</span>
              </div>
              <span className="text-xs text-slate-400">Configured to exact prompt values</span>
            </div>

            {/* Sub-section: Conveyor Transport Times */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 block">Conveyor Transport Durations (Seconds):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Conveyor Lathe */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Conveyor Lathe (RM1)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={formData.conveyorLatheTimeSeconds ?? 360}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          conveyorLatheTimeSeconds: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Seconds (360s default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Infeed conveyor feeding CNC lathe</p>
                </div>

                {/* Conveyor Milling */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Conveyor Milling (RM2)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={formData.conveyorMillingTimeSeconds ?? 240}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          conveyorMillingTimeSeconds: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Seconds (240s default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Infeed conveyor feeding CNC milling</p>
                </div>

                {/* Conveyor Shaping */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Conveyor Shaping (RM3)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={formData.conveyorShapingTimeSeconds ?? 210}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          conveyorShapingTimeSeconds: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Seconds (210s default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Infeed conveyor feeding CNC shaping</p>
                </div>

                {/* Outfeed Conveyor */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Outfeed Conveyor
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="600"
                      value={formData.conveyorTransportTimeSeconds}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          conveyorTransportTimeSeconds: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Seconds (45s default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Finished packaging transfer conveyor</p>
                </div>
              </div>
            </div>

            {/* Dual Conveyor Infeed Dispatch Modes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  Conveyor Infeed & Dispatch Strategy
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  Dual Modes
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, conveyorDispatchMode: 'STEADY_CONTINUOUS_FLOW' }))}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    (formData.conveyorDispatchMode ?? 'STEADY_CONTINUOUS_FLOW') === 'STEADY_CONTINUOUS_FLOW'
                      ? 'bg-cyan-950 border-cyan-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-cyan-300">Steady Continuous Flow</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Transports entity ahead of time so it arrives at CNC entrance right as cycle completes. Zero starvation.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, conveyorDispatchMode: 'DEMAND_PULL' }))}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    formData.conveyorDispatchMode === 'DEMAND_PULL'
                      ? 'bg-indigo-950 border-indigo-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-indigo-300">On-Demand Pull (JIT)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Entity is dispatched from inventory only after CNC finishes previous workpiece.
                  </div>
                </button>
              </div>
            </div>

            {/* Sub-section: CNC Machining Cycle Times */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-xs font-semibold text-slate-300 block">Machining Cycle Times (Minutes):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Lathe */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    CNC Lathe Cycle Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1.0"
                      max="30.0"
                      step="0.5"
                      value={formData.latheCycleTimeMinutes}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          latheCycleTimeMinutes: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Minutes (6.0m default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Turning & facing shaft components</p>
                </div>

                {/* Milling */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    CNC Milling Cycle Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1.0"
                      max="30.0"
                      step="0.5"
                      value={formData.millingCycleTimeMinutes}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          millingCycleTimeMinutes: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Minutes (4.0m default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Boring & facing casting housings</p>
                </div>

                {/* Shaping */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    CNC Shaping Cycle Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1.0"
                      max="30.0"
                      step="0.5"
                      value={formData.shapingCycleTimeMinutes}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          shapingCycleTimeMinutes: Number(e.target.value),
                        }))
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300"
                    />
                    <span className="text-xs text-slate-400">Minutes (3.5m default)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Gear tooth shaping & slot cutting</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Quality Control Parameters (Subassembly removed) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>5. Quality Control Parameters (Direct Routing from Buffer)</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Subassembly Block Bypassed / Removed</span>
            </div>

            <p className="text-xs text-slate-400">
              Machined components flow directly from line buffers into the 3-stage Quality Control subsystem (Check I → Check II → Rework → Check III) prior to converge assembly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-semibold">Inspection Time:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={formData.qualityParameters.inspectionDurationSeconds}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          inspectionDurationSeconds: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-400">s (30s)</span>
                </div>
                <div className="flex gap-1 pt-0.5">
                  {[
                    { sec: 30, label: '30s' },
                    { sec: 90, label: '1m 30s' },
                    { sec: 45, label: '45s' },
                  ].map(opt => (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          qualityParameters: {
                            ...prev.qualityParameters,
                            inspectionDurationSeconds: opt.sec,
                          },
                        }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                        formData.qualityParameters.inspectionDurationSeconds === opt.sec
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-semibold">Rework Time:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={formData.qualityParameters.reworkDurationSeconds ?? 180}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          reworkDurationSeconds: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-400">s (3 min)</span>
                </div>
                <div className="flex gap-1 pt-0.5">
                  {[
                    { sec: 180, label: '3m' },
                    { sec: 120, label: '2m' },
                    { sec: 240, label: '4m' },
                  ].map(opt => (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          qualityParameters: {
                            ...prev.qualityParameters,
                            reworkDurationSeconds: opt.sec,
                          },
                        }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                        (formData.qualityParameters.reworkDurationSeconds ?? 180) === opt.sec
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Dimensional Tolerance:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.005"
                    min="0.005"
                    max="0.1"
                    value={formData.qualityParameters.dimensionalToleranceMm}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          dimensionalToleranceMm: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-400">± mm (0.02mm)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Surface Roughness Ra:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="3.2"
                    value={formData.qualityParameters.surfaceRoughnessRa}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          surfaceRoughnessRa: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-400">µm (0.8µm)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Hardness Range (HRC):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="20"
                    max="65"
                    value={formData.qualityParameters.hardnessHrcMin}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          hardnessHrcMin: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-500">–</span>
                  <input
                    type="number"
                    min="20"
                    max="65"
                    value={formData.qualityParameters.hardnessHrcMax}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        qualityParameters: {
                          ...prev.qualityParameters,
                          hardnessHrcMax: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs font-mono text-cyan-300"
                  />
                  <span className="text-xs text-slate-400">HRC</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: Final Assembly & Packaging */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>6. Final Assembly Mode (4 Min Average) & Packaging</span>
              </div>
              <span className="text-xs text-slate-400">Converged 3-line assembly</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Final Assembly Automation Level:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="assemblyMode"
                      value="FULLY_AUTOMATED"
                      checked={formData.assemblyMode === 'FULLY_AUTOMATED'}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          assemblyMode: 'FULLY_AUTOMATED',
                          assemblyCycleTimeMinutes: 3.0,
                        }))
                      }
                      className="accent-cyan-500"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-slate-200">Fully Automated Robotic Cell</span>
                      <p className="text-[11px] text-slate-400">High speed articulated arms, ~3.0 min cycle time</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="assemblyMode"
                      value="SEMI_AUTOMATED"
                      checked={formData.assemblyMode === 'SEMI_AUTOMATED'}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          assemblyMode: 'SEMI_AUTOMATED',
                          assemblyCycleTimeMinutes: 4.0,
                        }))
                      }
                      className="accent-cyan-500"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-slate-200">Semi-Automated (Operator + Collaborative Cobot)</span>
                      <p className="text-[11px] text-slate-400">Standard balanced setup, 4.0 minutes on average</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="assemblyMode"
                      value="PURELY_MANUAL"
                      checked={formData.assemblyMode === 'PURELY_MANUAL'}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          assemblyMode: 'PURELY_MANUAL',
                          assemblyCycleTimeMinutes: 5.5,
                        }))
                      }
                      className="accent-cyan-500"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-slate-200">Purely Manual Human Assembly</span>
                      <p className="text-[11px] text-slate-400">Manual torque wrenching by technicians, ~5.5m</p>
                    </div>
                  </label>
                </div>

                <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">Custom Assembly Cycle Time:</span>
                    <span className="font-mono text-cyan-300 font-bold">{formData.assemblyCycleTimeMinutes} min (Avg 4.0m)</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={formData.assemblyCycleTimeMinutes}
                    onChange={e => setFormData(prev => ({ ...prev, assemblyCycleTimeMinutes: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Packaging Station:
                </label>
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Packaging Cycle Time:</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {formData.packagingCycleTimeMinutes} Minutes (240s)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={formData.packagingCycleTimeMinutes}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        packagingCycleTimeMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1.0 min</span>
                    <span className="text-cyan-400 font-semibold">4.0 min Default</span>
                    <span>10.0 min</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    After packaging takes 4 minutes, completed units are moved via outfeed conveyor to the warehouse for dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: Equipment Failure & Reliability Simulation (User Discretion) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>7. Machine Failure & Equipment Reliability Simulation (User Discretion)</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">Customizable Breakdown & Stress Testing</span>
            </div>

            <p className="text-xs text-slate-400">
              Machines do not need to run continuously without failure. You can enable automatic stochastic breakdown events, tune the Mean Time Between Failures (MTBF), accelerate tool wear degradation, or trigger incident events on demand.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stochastic Failure Toggle & MTBF */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.randomFailuresEnabled}
                      onChange={e => setFormData(prev => ({ ...prev, randomFailuresEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
                    />
                    <span>Enable Stochastic Random Failures</span>
                  </label>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${formData.randomFailuresEnabled ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {formData.randomFailuresEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Failure Frequency / MTBF Level:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, failureFrequency: 'LOW', mtbfHours: 48 }))}
                      className={`px-2 py-1.5 rounded text-xs font-semibold border transition text-center ${
                        formData.failureFrequency === 'LOW'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Low (~48h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, failureFrequency: 'MEDIUM', mtbfHours: 16 }))}
                      className={`px-2 py-1.5 rounded text-xs font-semibold border transition text-center ${
                        formData.failureFrequency === 'MEDIUM'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Medium (~16h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, failureFrequency: 'HIGH', mtbfHours: 6 }))}
                      className={`px-2 py-1.5 rounded text-xs font-semibold border transition text-center ${
                        formData.failureFrequency === 'HIGH'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      High (~6h)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300">Custom MTBF (Operating Hours):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={formData.mtbfHours}
                      onChange={e => setFormData(prev => ({ ...prev, mtbfHours: Math.max(1, Number(e.target.value)) }))}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 text-right"
                    />
                    <span className="text-xs text-slate-400">Hours</span>
                  </div>
                </div>
              </div>

              {/* Tool Wear Rate & Manual Controls */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Tool Wear Degradation Multiplier:</span>
                    <span className="text-xs font-mono text-cyan-300 font-bold">{formData.toolWearRateMultiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    value={formData.toolWearRateMultiplier}
                    onChange={e => setFormData(prev => ({ ...prev, toolWearRateMultiplier: Number(e.target.value) }))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0.5x (Slow)</span>
                    <span className="text-cyan-400 font-semibold">1.0x (Nominal ~250h)</span>
                    <span>10.0x (Rapid Wear)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 block">Instant Actions (User Discretion):</span>
                  <div className="flex flex-wrap gap-2">
                    {onTriggerRandomFailure && (
                      <button
                        type="button"
                        onClick={onTriggerRandomFailure}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 flex items-center gap-1.5 transition"
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        <span>Randomize Failure Now</span>
                      </button>
                    )}
                    {onRepairAll && (
                      <button
                        type="button"
                        onClick={onRepairAll}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 flex items-center gap-1.5 transition"
                      >
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Repair All Machines</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-800/80 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span>
              {isAdmin ? (
                <strong className="text-emerald-300">Admin Authority: Changes apply directly to Digital Twin.</strong>
              ) : (
                <span className="text-amber-300">
                  Parameter edits require verification by an Administrator (Nilesh, Soumyajit, Chitrayan, or Sayandip) before taking effect.
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
                isAdmin
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
                  : 'bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-amber-900/40'
              }`}
            >
              {isAdmin ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Operational Parameters</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-200" />
                  <span>Submit for Admin Approval</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
