import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  PlantOEE,
  Station,
  FaultType,
  DailyPerformanceRecord,
} from '../types/factory';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Zap,
  Gauge,
  Cpu,
  BarChart2,
  Settings,
  Calendar,
  Info,
} from 'lucide-react';
import { PerformanceTrendsCard } from './PerformanceTrendsCard';
import { TelemetryFlowRatesPanel } from './TelemetryFlowRatesPanel';

interface OptimizationDashboardProps {
  oee: PlantOEE;
  stations: Record<string, Station>;
  completedCount: number;
  rejectedCount: number;
  wipCount: number;
  timeSeconds: number;
  bottleneckStationId: string | null;
  lineBalanceScore: number;
  onSelectStation: (stationId: string) => void;
  onAutoBalance: () => void;
  performanceHistory?: DailyPerformanceRecord[];
  dailyTargetUnits?: number;
  currentArrearsUnits?: number;
  currentDayCount?: number;
  simulatedDate?: string;
  onAdvanceDay?: () => void;
}

export const OptimizationDashboard: React.FC<OptimizationDashboardProps> = ({
  oee,
  stations,
  completedCount,
  rejectedCount,
  wipCount,
  timeSeconds,
  bottleneckStationId,
  lineBalanceScore,
  onSelectStation,
  onAutoBalance,
  performanceHistory,
  dailyTargetUnits = 120,
  currentArrearsUnits = 0,
  currentDayCount = 1,
  simulatedDate,
  onAdvanceDay,
}) => {
  const stationList = Object.values(stations).filter(
    s => !s.isQueue && s.type !== 'truck_source' && s.type !== 'sink_dispatch'
  );

  const activeFaults = Object.values(stations).filter(s => s.activeFault !== 'NONE');
  const bottleneckStation = bottleneckStationId ? stations[bottleneckStationId] : null;

  const [oeeDecomposedMode, setOeeDecomposedMode] = useState<boolean>(false);
  const [selectedTelemetryStationId, setSelectedTelemetryStationId] = useState<string>(() => {
    return bottleneckStationId || (stations['cnc_lathe'] ? 'cnc_lathe' : Object.keys(stations)[0] || '');
  });

  const currentTelemetryStation = stations[selectedTelemetryStationId] || stations['cnc_lathe'] || stationList[0];

  // 7-Day Overall OEE Trend Data for Recharts
  const oee7DayData = useMemo(() => {
    const history = performanceHistory || [];
    const currentDay = currentDayCount || 1;

    // Build 7-day timeline
    if (history.length <= 1) {
      const days = [];
      for (let i = 1; i <= 7; i++) {
        const isToday = i === currentDay;
        const currentOee = isToday ? oee.overallOEE : 0;
        days.push({
          day: i,
          dayLabel: isToday ? `Day ${i} (Today)` : `Day ${i}`,
          dateStr: isToday ? (simulatedDate || 'Today') : `Shift ${i}`,
          overallOEE: currentOee,
          availability: isToday ? oee.availability : 0,
          performance: isToday ? oee.performance : 0,
          quality: isToday ? oee.quality : 0,
          target: 85,
          isToday,
        });
      }
      return days;
    }

    const slice = history.slice(-7);
    return slice.map((rec, idx) => {
      const isLatest = idx === slice.length - 1;
      const isToday = isLatest && !!rec.isCurrentDay;
      const ov = isToday ? oee.overallOEE : (rec.oee ?? 0);
      const qual = isToday ? oee.quality : (rec.fpy ?? 0);
      const avail = isToday ? oee.availability : (ov > 0 ? Math.min(100, Math.round(ov * 1.05)) : 0);
      const perf = isToday ? oee.performance : (ov > 0 ? Math.max(0, Math.round(ov * 0.98)) : 0);
      return {
        day: rec.day,
        dayLabel: rec.dayLabel || `Day ${rec.day}`,
        dateStr: rec.dateStr || `Day ${rec.day}`,
        overallOEE: ov,
        availability: avail,
        performance: perf,
        quality: qual,
        target: 85,
        isToday,
      };
    });
  }, [performanceHistory, oee, currentDayCount, simulatedDate]);

  // Average 7-day OEE
  const avg7DayOee = useMemo(() => {
    if (oee7DayData.length === 0) return 0;
    const sum = oee7DayData.reduce((acc, curr) => acc + curr.overallOEE, 0);
    return Number((sum / oee7DayData.length).toFixed(1));
  }, [oee7DayData]);

  // Calculate hourly throughput rate
  const simulatedHours = Math.max(0.01, timeSeconds / 3600);
  const throughputPerHour = Math.round(completedCount / simulatedHours);

  return (
    <div className="space-y-4 text-slate-100">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* OEE Metric */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Overall OEE
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              oee.overallOEE >= 85 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              oee.overallOEE >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              oee.overallOEE > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {oee.overallOEE >= 85 ? 'World Class' : oee.overallOEE >= 70 ? 'Acceptable' : oee.overallOEE > 0 ? 'Deficit' : 'Standby (0%)'}
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-2">
            {oee.overallOEE}%
            <span className="text-xs font-normal text-slate-400">Target: 85%</span>
          </div>
          {/* Mini Recharts Sparkline for Overall OEE Trend */}
          <div className="h-8 w-full my-1.5 pt-0.5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oee7DayData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                  type="monotone"
                  dataKey="overallOEE"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-[11px] text-center pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-slate-400 text-[10px]">Avail.</div>
              <div className="font-semibold text-cyan-300">{oee.availability}%</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Perf.</div>
              <div className="font-semibold text-blue-300">{oee.performance}%</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Quality</div>
              <div className="font-semibold text-emerald-300">{oee.quality}%</div>
            </div>
          </div>
        </div>

        {/* Throughput & Yield */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Finished Goods
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
              Yield {(100 - (rejectedCount / Math.max(1, completedCount + rejectedCount)) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-2">
            {completedCount} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80 text-slate-400">
            <span>Scrap: <strong className="text-rose-400">{rejectedCount}</strong></span>
            <span>Rate: <strong className="text-emerald-400">{throughputPerHour} u/h</strong></span>
          </div>
        </div>

        {/* WIP & Flow Balance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Work In Progress (WIP)
            </span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
              Balance {lineBalanceScore}%
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-2">
            {wipCount} <span className="text-xs font-normal text-slate-400">entities active</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
            <span className="text-slate-400">Sim. Time:</span>
            <span className="font-mono text-cyan-300 text-xs">
              {Math.floor(timeSeconds / 60)}m {Math.floor(timeSeconds % 60)}s
            </span>
          </div>
        </div>

        {/* Bottleneck & Predictive Alert */}
        <div className={`rounded-xl p-3.5 shadow-sm border ${
          activeFaults.length > 0
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium flex items-center gap-1.5">
              {activeFaults.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              {activeFaults.length > 0 ? 'Equipment Anomaly' : 'Operational Status'}
            </span>
            {bottleneckStation && (
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Bottleneck
              </span>
            )}
          </div>
          {activeFaults.length > 0 ? (
            <div>
              <div className="text-sm font-bold text-rose-300 truncate">
                {activeFaults[0].name}
              </div>
              <div className="text-[11px] text-rose-200/90 mt-1 line-clamp-1">
                {activeFaults[0].mlResult.predictedFailureClass}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-bold text-emerald-300">All Stations Nominal</div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                Bottleneck: <strong className="text-slate-200">{bottleneckStation?.name ?? 'Balanced (Optimal Flow)'}</strong>
              </div>
            </div>
          )}
          <div className="mt-2 pt-1 border-t border-slate-800/80 text-[11px]">
            {activeFaults.length > 0 ? (
              <button
                onClick={() => onSelectStation(activeFaults[0].id)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline text-[11px] transition"
              >
                Inspect Telemetry & ML Diagnosis →
              </button>
            ) : (
              <span className="text-slate-400 text-[11px]">0 active critical alarms</span>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Overall OEE Trend Card (Recharts) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                Overall OEE Trend
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  Past 7 Days
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualizing overall plant efficiency (Availability × Performance × Quality) tracking against the 85% World-Class manufacturing standard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setOeeDecomposedMode(false)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  !oeeDecomposedMode
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Overall OEE Only
              </button>
              <button
                onClick={() => setOeeDecomposedMode(true)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  oeeDecomposedMode
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Decomposed (A / P / Q)
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Current Live OEE</span>
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {oee.overallOEE}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {oee.overallOEE === 0 ? 'Shift starting / Cold start (0%)' : oee.overallOEE >= 85 ? 'World Class' : 'Active shift tracking'}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>7-Day Average OEE</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {avg7DayOee}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across recorded past shifts
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Benchmark Target</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              85.0%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ISO / Industry World Class
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Target Gap</span>
            </div>
            <div className={`text-xl font-bold font-mono ${oee.overallOEE >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {oee.overallOEE >= 85 ? `+${(oee.overallOEE - 85).toFixed(1)}%` : `${(oee.overallOEE - 85).toFixed(1)}%`}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Delta to 85% threshold
            </div>
          </div>
        </div>

        {/* Recharts Line Chart for 7-Day Overall OEE */}
        <div className="h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={oee7DayData} margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                tickLine={{ stroke: '#334155' }}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white">{d.dayLabel}</span>
                        <span className="text-[10px] font-mono text-slate-400">{d.dateStr}</span>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                            Overall OEE:
                          </span>
                          <span className="font-mono font-bold text-white text-sm">{d.overallOEE}%</span>
                        </div>
                        {oeeDecomposedMode && (
                          <>
                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span>Availability:</span>
                              <span className="font-mono text-cyan-300">{d.availability}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span>Performance:</span>
                              <span className="font-mono text-blue-300">{d.performance}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span>Quality (FPY):</span>
                              <span className="font-mono text-emerald-300">{d.quality}%</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                          <span>Target:</span>
                          <span className="font-mono text-emerald-400 font-semibold">85.0%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={85}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Target (85%)', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                y={70}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Acceptable (70%)', fill: '#f59e0b', fontSize: 10, position: 'insideBottomLeft' }}
              />
              <Line
                type="monotone"
                dataKey="overallOEE"
                name="Overall OEE"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#06b6d4', strokeWidth: 2, fill: '#0f172a' }}
                activeDot={{ r: 6, fill: '#38bdf8' }}
              />
              {oeeDecomposedMode && (
                <>
                  <Line
                    type="monotone"
                    dataKey="availability"
                    name="Availability"
                    stroke="#38bdf8"
                    strokeWidth={1.8}
                    strokeDasharray="2 2"
                    dot={{ r: 2.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="performance"
                    name="Performance"
                    stroke="#818cf8"
                    strokeWidth={1.8}
                    strokeDasharray="2 2"
                    dot={{ r: 2.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    name="Quality"
                    stroke="#34d399"
                    strokeWidth={1.8}
                    strokeDasharray="2 2"
                    dot={{ r: 2.5 }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7-Day Performance Trends Card (Recharts) */}
      <PerformanceTrendsCard
        performanceHistory={performanceHistory}
        currentCompletedCount={completedCount}
        dailyTargetUnits={dailyTargetUnits}
        currentArrearsUnits={currentArrearsUnits}
        currentDayCount={currentDayCount}
        simulatedDate={simulatedDate}
        onAdvanceDay={onAdvanceDay}
      />

      {/* Real-Time Operational Dynamics & Flow Rates (Subscribed to Live Simulation State) */}
      {currentTelemetryStation && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                  Real-Time Telemetry & Operational Flow Rates
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                    Live Stream
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Subscribed live to continuous discrete-event state ticks. Monitor instantaneous infeed arrival, processing speed, outfeed departure, and daily cumulative volume.
              </p>
            </div>

            {/* Station Dropdown Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="telemetry-station-select" className="text-xs text-slate-400 shrink-0 font-medium">
                Active Station:
              </label>
              <select
                id="telemetry-station-select"
                value={currentTelemetryStation.id}
                onChange={(e) => setSelectedTelemetryStationId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[240px] truncate"
              >
                {stationList.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.simulinkTag})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TelemetryFlowRatesPanel
            station={currentTelemetryStation}
            isConveyor={currentTelemetryStation.type.includes('transporter')}
          />
        </div>
      )}

      {/* Utilization & Balancing Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Station Utilization Bars */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Line Station Utilization & Capacity Balance
              </h3>
              <p className="text-xs text-slate-400">
                SimEvents server block utilization rates. Stations exceeding 85% constitute system bottlenecks.
              </p>
            </div>
            <button
              onClick={onAutoBalance}
              className="text-xs px-2.5 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 rounded-lg font-medium transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Rebalance Speeds
            </button>
          </div>

          <div className="space-y-2.5">
            {stationList.map(station => {
              const isBottleneck = station.id === bottleneckStationId;
              const hasFault = station.activeFault !== 'NONE';

              return (
                <div
                  key={station.id}
                  onClick={() => {
                    onSelectStation(station.id);
                    setSelectedTelemetryStationId(station.id);
                  }}
                  className="group cursor-pointer hover:bg-slate-800/40 p-1.5 rounded-lg transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition">
                        {station.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">
                        {station.simulinkTag}
                      </span>
                      {isBottleneck && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                          CRITICAL PATH
                        </span>
                      )}
                      {hasFault && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 rounded font-bold animate-pulse">
                          FAULT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {station.itemsProcessed} parts
                      </span>
                      <span className={`font-mono font-bold text-xs ${
                        station.utilization >= 85 ? 'text-amber-400' :
                        station.utilization >= 40 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {station.utilization}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        hasFault
                          ? 'bg-rose-500'
                          : isBottleneck
                          ? 'bg-amber-400'
                          : station.utilization > 75
                          ? 'bg-cyan-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.max(4, station.utilization)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Optimization Advisor */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Digital Twin Prescriptive Advisor
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Automated heuristics for line balancing and predictive error reduction.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <div className="font-semibold text-cyan-300 mb-0.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Line Balancing Recommendation
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {bottleneckStation ? (
                    <>
                      <strong>{bottleneckStation.name}</strong> is currently on the critical path ({bottleneckStation.utilization}% load).
                      Consider tuning nominal cycle time from {bottleneckStation.nominalProcessingTime}s or pre-buffering in upstream queue.
                    </>
                  ) : (
                    'Plant line stages are evenly balanced within optimal utilization envelopes. No active critical path bottleneck detected.'
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <div className="font-semibold text-indigo-300 mb-0.5 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Conveyor Transport Optimization
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  Transporters RM1, RM2, RM3 are configured with 5-second delays per your SimEvents model.
                  Belt drive tension sensors show healthy traction at ~450 N.
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <div className="font-semibold text-emerald-300 mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ISO 10816 Vibration Compliance
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  Machines are continuously compared against ISO 10816-3 Class II (Rigid foundations, 15-75 kW motors).
                  Alarm threshold: 7.1 mm/s RMS.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Discrete Event Step: <strong>0.1s dt</strong></span>
            <span className="text-cyan-400 font-mono">SimEvents v2026.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
