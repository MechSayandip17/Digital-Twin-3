import React from 'react';
import {
  Zap,
  Sun,
  Flame,
  Activity,
  Gauge,
  Layers,
  TrendingUp,
  RotateCw,
  Droplets,
  DollarSign,
  Leaf,
  BarChart3,
  Factory,
} from 'lucide-react';
import { PlantEnergyAnalytics } from '../types/energy';
import { formatIndianCurrency, formatIndianNumber } from '../utils/shiftSummaryReport';

interface EnergyAnalyticsViewProps {
  energy: PlantEnergyAnalytics;
  simulatedSecondsOfDay: number;
  simulatedDate: string;
  isShiftOpen: boolean;
  completedToday: number;
}

export const EnergyAnalyticsView: React.FC<EnergyAnalyticsViewProps> = ({
  energy,
  simulatedSecondsOfDay,
  simulatedDate,
  isShiftOpen,
  completedToday,
}) => {
  const currentHour = (simulatedSecondsOfDay / 3600) % 24;
  const h = Math.floor(currentHour);
  const m = Math.floor((currentHour % 1) * 60);
  const timeStr = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;

  // Subsystem percentage breakdown
  const totalSubsystems = Math.max(1, energy.machiningPowerKw + energy.transporterPowerKw + energy.assemblyPackagingKw + energy.coolingHvacPowerKw);
  const machiningPct = Math.round((energy.machiningPowerKw / totalSubsystems) * 100);
  const coolingPct = Math.round((energy.coolingHvacPowerKw / totalSubsystems) * 100);
  const assemblyPct = Math.round((energy.assemblyPackagingKw / totalSubsystems) * 100);
  const transporterPct = Math.max(0, 100 - machiningPct - coolingPct - assemblyPct);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-emerald-600 rounded-xl text-white shadow-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Energy Consumption & Sustainability Analytics
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Indian Industrial HT Tariff • CEA Standards
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live high-frequency electrical telemetry, spindle mechanical cutting load, chiller refrigeration, and rooftop solar offset.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3.5 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Industrial Tariff Rate:</span>
            <span className="text-amber-400 font-bold">₹8.50 / kWh (HT-1)</span>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Current Plant Power:</span>
            <span className="text-cyan-300 font-bold">{energy.totalInstantPowerKw} kW</span>
          </div>
        </div>
      </div>

      {/* 4 Main Electrical & Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Real-Time Active Power Draw */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Real-Time Power Demand</span>
            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {energy.totalInstantPowerKw}
            </span>
            <span className="text-xs text-slate-500 font-mono">kW</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-slate-400">Peak Today:</span>
            <span className="font-mono font-bold text-slate-200">{energy.peakDemandKw} kW</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Power Factor (PF):</span>
            <span className="font-mono text-emerald-400 font-bold">{energy.powerFactor} Lag</span>
          </div>
        </div>

        {/* 2. Cumulative Energy & Indian Electricity Cost */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Shift Energy Consumed</span>
            <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {energy.todayTotalKwh}
            </span>
            <span className="text-xs text-slate-500 font-mono">kWh</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-slate-400">Electricity Cost Today:</span>
            <span className="font-mono font-bold text-amber-400">
              {formatIndianCurrency(energy.todayEnergyCostInr)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Monthly Projection:</span>
            <span className="font-mono text-slate-300">
              {formatIndianNumber(energy.projectedMonthlyBillInr)}
            </span>
          </div>
        </div>

        {/* 3. Rooftop Solar Generation & Clean Offset */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">120 kWp Solar Generation</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Sun className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {energy.solarGenerationKw}
            </span>
            <span className="text-xs text-slate-500 font-mono">kW Solar</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-slate-400">Clean Energy Offset:</span>
            <span className="font-mono font-bold text-emerald-400">
              {energy.solarOffsetPercentage}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Generated Today:</span>
            <span className="font-mono text-slate-300">{energy.solarGenerationTodayKwh} kWh</span>
          </div>
        </div>

        {/* 4. Carbon Footprint & Specific Energy Consumption */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Sustainability & SEC</span>
            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
              <Leaf className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {energy.carbonEmissionsTodayKg}
            </span>
            <span className="text-xs text-slate-500 font-mono">kg CO₂</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-slate-400">Specific Energy (SEC):</span>
            <span className="font-mono font-bold text-slate-200">
              {energy.specificEnergyKwhPerUnit} kWh/unit
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Grid Emission Basis:</span>
            <span className="font-mono text-slate-400">0.82 kg/kWh</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Spindle RPMs & Coolant/Chiller Usage Tracker + Subsystem Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Machine Spindle Dynamics & Cooling Systems */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Machine Dynamic Spindle RPMs, Chiller Load & Cutting Power</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Live Sensor Feedback • {timeStr}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CNC Lathe */}
            {(() => {
              const p = energy.stationProfiles['cnc_lathe'];
              const rpm = p?.spindleRpm || 0;
              const kw = p?.currentPowerKw || 0;
              const chillerKw = p?.chillerPowerKw || 0;
              const coolantKw = p?.coolantPumpKw || 0;

              return (
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">CNC Lathe Machine</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Line 1
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-cyan-400 animate-spin" />
                        Spindle Speed:
                      </span>
                      <span className="font-mono font-bold text-cyan-300">{rpm} RPM</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, (rpm / 3500) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Draw:</span>
                      <span className="font-mono font-bold text-white">{kw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        Coolant Pump:
                      </span>
                      <span className="font-mono text-blue-300">{coolantKw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Oil Chiller:</span>
                      <span className="font-mono text-slate-300">{chillerKw} kW</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CNC Milling */}
            {(() => {
              const p = energy.stationProfiles['cnc_milling'];
              const rpm = p?.spindleRpm || 0;
              const kw = p?.currentPowerKw || 0;
              const chillerKw = p?.chillerPowerKw || 0;
              const coolantKw = p?.coolantPumpKw || 0;

              return (
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">CNC Milling Center</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Line 2
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-indigo-400 animate-spin" />
                        Spindle Speed:
                      </span>
                      <span className="font-mono font-bold text-indigo-300">{rpm} RPM</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, (rpm / 7500) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Draw:</span>
                      <span className="font-mono font-bold text-white">{kw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        70-bar Coolant:
                      </span>
                      <span className="font-mono text-blue-300">{coolantKw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ref Chiller:</span>
                      <span className="font-mono text-slate-300">{chillerKw} kW</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CNC Shaping */}
            {(() => {
              const p = energy.stationProfiles['cnc_shaping'];
              const rpm = p?.spindleRpm || 0;
              const kw = p?.currentPowerKw || 0;
              const chillerKw = p?.chillerPowerKw || 0;
              const coolantKw = p?.coolantPumpKw || 0;

              return (
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">CNC Gear Shaping</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Line 3
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-emerald-400 animate-spin" />
                        Spindle / Ram:
                      </span>
                      <span className="font-mono font-bold text-emerald-300">{rpm} SPM</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, (rpm / 2000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Draw:</span>
                      <span className="font-mono font-bold text-white">{kw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        Cutting Oil Pump:
                      </span>
                      <span className="font-mono text-blue-300">{coolantKw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hydraulic Chiller:</span>
                      <span className="font-mono text-slate-300">{chillerKw} kW</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right 1 Col: Electrical Load Distribution Pie / Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Subsystem Power Distribution</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* CNC Machining */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">CNC Precision Machining</span>
                <span className="font-mono font-bold text-cyan-400">
                  {energy.machiningPowerKw} kW ({machiningPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{ width: `${machiningPct}%` }}
                />
              </div>
            </div>

            {/* Cooling & Environmental Chiller */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Cooling, Chiller & Cleanroom HVAC</span>
                <span className="font-mono font-bold text-blue-400">
                  {energy.coolingHvacPowerKw} kW ({coolingPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${coolingPct}%` }}
                />
              </div>
            </div>

            {/* Assembly & Packaging */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Robotic Assembly & Heat Sealer</span>
                <span className="font-mono font-bold text-indigo-400">
                  {energy.assemblyPackagingKw} kW ({assemblyPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${assemblyPct}%` }}
                />
              </div>
            </div>

            {/* Transporters */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Conveyor Belt Drives</span>
                <span className="font-mono font-bold text-emerald-400">
                  {energy.transporterPowerKw} kW ({transporterPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${transporterPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[11px] space-y-1 text-slate-400">
            <span className="font-semibold text-slate-300 block">Energy Optimization Insight:</span>
            <p>
              High-pressure coolant pumps consume ~22% of total spindle energy. Variable Frequency Drives (VFDs) reduce bypass throttling losses during idle cycle transitions.
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Power Consumption & Solar Generation Profile Curve */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Shift Electrical Demand Profile vs Rooftop Solar Generation</span>
            </h3>
            <p className="text-xs text-slate-400">
              Tracking grid demand against 120 kWp solar PV clean power injection.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 bg-cyan-400 rounded-sm" />
              Total Plant kW
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 bg-amber-400 rounded-sm" />
              Solar PV Injection
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
          {energy.hourlyProfile.map((hp, idx) => {
            const maxScale = 140; // max kW
            const totalHeight = Math.min(100, (hp.totalKw / maxScale) * 100);
            const solarHeight = Math.min(100, (hp.solarKw / maxScale) * 100);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {hp.totalKw} kW
                </div>
                <div className="w-full max-w-[36px] flex items-end gap-1 h-full">
                  {/* Total Plant kW bar */}
                  <div
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 rounded-t transition-all"
                    style={{ height: `${totalHeight}%` }}
                    title={`Plant Load: ${hp.totalKw} kW`}
                  />
                  {/* Solar kW bar */}
                  <div
                    className="flex-1 bg-amber-400 hover:bg-amber-300 rounded-t transition-all"
                    style={{ height: `${solarHeight}%` }}
                    title={`Solar Generation: ${hp.solarKw} kW`}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  {hp.hourLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Grid Import: {Math.max(0, energy.todayTotalKwh - energy.solarGenerationTodayKwh).toFixed(0)} kWh</span>
          <span>Clean Solar Self-Consumption: {energy.solarGenerationTodayKwh} kWh</span>
          <span className="text-emerald-400 font-bold">Carbon Avoided: {Math.round(energy.solarGenerationTodayKwh * 0.82)} kg CO₂</span>
        </div>
      </div>
    </div>
  );
};
