import React, { useState, useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Move,
  TrendingUp,
} from 'lucide-react';
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
import { Station } from '../types/factory';
import { DraggableResizableWindow } from './DraggableResizableWindow';

interface TelemetryFlowRatesPanelProps {
  station: Station;
  isConveyor?: boolean;
  onToggleManualStop?: (stationId: string) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const TelemetryFlowRatesPanel: React.FC<TelemetryFlowRatesPanelProps> = ({
  station,
  isConveyor = false,
  onToggleManualStop,
  className = '',
  defaultCollapsed = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [windowErrorNotice, setWindowErrorNotice] = useState<string | null>(null);

  const history = station.history || [];
  const nominalSec = station.nominalProcessingTime > 0 ? station.nominalProcessingTime : 30;
  const defaultSpeed = Number((60 / nominalSec).toFixed(2));

  // Extract raw series with safe fallbacks
  const utilData = useMemo(() => {
    return history.map(h => {
      const u = h.utilization !== undefined ? h.utilization : station.utilization;
      return typeof u === 'number' && !isNaN(u) ? u : (station.status === 'BUSY' ? 85 : 0);
    });
  }, [history, station.utilization, station.status]);

  const rawArrivals = useMemo(() => {
    return history.map(h => {
      const a = h.arrivalRate;
      return typeof a === 'number' && !isNaN(a) ? a : 0;
    });
  }, [history]);

  const rawDepartures = useMemo(() => {
    return history.map(h => {
      const d = h.departureRate;
      return typeof d === 'number' && !isNaN(d) ? d : 0;
    });
  }, [history]);

  const rawSpeeds = useMemo(() => {
    return history.map(h => {
      const s = h.processingSpeed;
      return typeof s === 'number' && !isNaN(s) ? s : defaultSpeed;
    });
  }, [history, defaultSpeed]);

  // Safe statistical peaks
  const maxArrival = Math.max(3.0, ...rawArrivals);
  const maxDeparture = Math.max(3.0, ...rawDepartures);
  const maxSpeed = Math.max(3.0, defaultSpeed * 1.3, ...rawSpeeds);

  // Latest scalar values
  const latestUtil = utilData.length > 0 ? utilData[utilData.length - 1] : (station.utilization ?? 0);
  const latestArrival = rawArrivals.length > 0 ? rawArrivals[rawArrivals.length - 1] : 0;
  const latestDeparture = rawDepartures.length > 0 ? rawDepartures[rawDepartures.length - 1] : 0;
  const latestSpeed = rawSpeeds.length > 0 ? rawSpeeds[rawSpeeds.length - 1] : defaultSpeed;

  const avgArrival = rawArrivals.length > 0
    ? Number((rawArrivals.reduce((a, b) => a + b, 0) / rawArrivals.length).toFixed(2))
    : 0;
  const avgDeparture = rawDepartures.length > 0
    ? Number((rawDepartures.reduce((a, b) => a + b, 0) / rawDepartures.length).toFixed(2))
    : 0;
  const avgUtil = utilData.length > 0
    ? Number((utilData.reduce((a, b) => a + b, 0) / utilData.length).toFixed(1))
    : 0;

  // Cumulative Day Data calculations
  const cumulativeArrivals = (station.processedToday || 0) + (station.currentlyProcessingCount || 0) + (station.currentQueueCount || 0);
  const cumulativeDepartures = station.processedToday || 0;
  const busyMinutes = Math.floor((station.busyTimeAccumulated || 0) / 60);
  const busySeconds = Math.floor((station.busyTimeAccumulated || 0) % 60);
  const shiftDutyCycle = station.totalTimeAccumulated > 0
    ? Number(((station.busyTimeAccumulated / station.totalTimeAccumulated) * 100).toFixed(1))
    : 0;
  const avgShiftFlowRate = station.totalTimeAccumulated > 30
    ? Number(((station.processedToday / (station.totalTimeAccumulated / 60))).toFixed(2))
    : 0;
  const peakFlowRate = Math.max(0, ...rawDepartures);

  // Robust SVG points generator that ALWAYS produces a visible path even with 0 or 1 point
  const generateSvgPoints = (data: number[], maxVal: number) => {
    if (data.length === 0) {
      return { line: '0,92 100,92', area: '0,92 100,92 100,98 0,98' };
    }
    const safeData = data.length === 1 ? [data[0], data[0]] : data;
    const pts = safeData.map((val, idx) => {
      const x = (idx / (safeData.length - 1)) * 100;
      const normalized = Math.max(0, Math.min(1, maxVal > 0 ? val / maxVal : 0));
      // y ranges from 88 (low) to 12 (high peak)
      const y = 88 - normalized * 76;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePoints = pts.join(' ');
    const areaPoints = `0,95 ${linePoints} 100,95`;
    return { line: linePoints, area: areaPoints };
  };

  const utilSvg = useMemo(() => generateSvgPoints(utilData, 100), [utilData]);
  const arrivalSvg = useMemo(() => generateSvgPoints(rawArrivals, maxArrival), [rawArrivals, maxArrival]);
  const departureSvg = useMemo(() => generateSvgPoints(rawDepartures, maxDeparture), [rawDepartures, maxDeparture]);
  const speedSvg = useMemo(() => generateSvgPoints(rawSpeeds, maxSpeed), [rawSpeeds, maxSpeed]);

  // Recharts high-resolution dataset for Maximized overlay and standalone window
  const rechartsData = useMemo(() => {
    if (history.length === 0) {
      return [{
        time: '0s',
        utilization: latestUtil,
        arrivalRate: latestArrival,
        departureRate: latestDeparture,
        processingSpeed: latestSpeed,
      }];
    }
    return history.map((h, i) => ({
      time: `${h.timestamp !== undefined ? h.timestamp.toFixed(1) : i}s`,
      utilization: h.utilization ?? latestUtil,
      arrivalRate: h.arrivalRate ?? 0,
      departureRate: h.departureRate ?? 0,
      processingSpeed: h.processingSpeed ?? defaultSpeed,
      vibrationRms: h.vibrationRms ?? 0,
      temperature: h.temperature ?? 0,
    }));
  }, [history, latestUtil, latestArrival, latestDeparture, latestSpeed, defaultSpeed]);

  // Function to open dedicated telemetry window
  const handleOpenInNewWindow = () => {
    try {
      const newWin = window.open('', `DigiTwin_${station.id}`, 'width=1150,height=780,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
      if (!newWin) {
        setWindowErrorNotice('Popup blocked by browser. Opened maximized view in viewport instead.');
        setIsMaximized(true);
        setTimeout(() => setWindowErrorNotice(null), 4000);
        return;
      }

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DigiTwin Live Telemetry — ${station.name} (${station.simulinkTag})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #020617; color: #f8fafc; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .card-title { font-size: 13px; color: #94a3b8; font-weight: 600; display: flex; justify-content: space-between; margin-bottom: 8px; }
    .card-val { font-size: 26px; font-weight: bold; font-family: monospace; }
    .cyan { color: #06b6d4; }
    .emerald { color: #10b981; }
    .sky { color: #38bdf8; }
    .amber { color: #f59e0b; }
    .chart-box { height: 120px; background: #090d16; border-radius: 8px; border: 1px solid #1e293b; margin: 12px 0 8px; padding: 4px; position: relative; }
    svg { width: 100%; height: 100%; }
    .footer-stat { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace; }
    .timestamp { font-size: 12px; color: #64748b; }
    .live-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 10px;">
        <span class="live-dot"></span>
        ${station.name} — Real-time Telemetry Stream
      </div>
      <div class="timestamp">SimEvents Line: ${station.line} • Tag: <span class="badge">${station.simulinkTag}</span> • Nominal Cycle: ${nominalSec}s</div>
    </div>
    <div>
      <button onclick="window.print()" style="background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">Print Telemetry Report</button>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">
        <span>Line Station Utilisation</span>
        <span class="cyan">Peak: 100%</span>
      </div>
      <div class="card-val cyan">${latestUtil}%</div>
      <div class="chart-box">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-dasharray="2 2" stroke-width="0.5" />
          <polygon fill="rgba(6, 182, 212, 0.15)" points="${utilSvg.area}" />
          <polyline fill="none" stroke="#06b6d4" stroke-width="2.5" points="${utilSvg.line}" />
        </svg>
      </div>
      <div class="footer-stat"><span>Baseline Target: 80%</span><span>Avg: ${avgUtil}%</span><span>Status: ${station.status}</span></div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Infeed Arrival Rate (Inflow Cadence)</span>
        <span class="emerald">Peak: ${maxArrival.toFixed(2)} u/min</span>
      </div>
      <div class="card-val emerald">${latestArrival.toFixed(2)} <span style="font-size: 13px; font-weight: normal; color: #94a3b8;">u/min</span></div>
      <div class="chart-box">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-dasharray="2 2" stroke-width="0.5" />
          <polygon fill="rgba(16, 185, 129, 0.15)" points="${arrivalSvg.area}" />
          <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="${arrivalSvg.line}" />
        </svg>
      </div>
      <div class="footer-stat"><span>Min: 0.00 u/min</span><span>Avg: ${avgArrival} u/min</span><span>Cadence: Continuous</span></div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Outfeed Departure Rate (Transfer)</span>
        <span class="sky">Peak: ${maxDeparture.toFixed(2)} u/min</span>
      </div>
      <div class="card-val sky">${latestDeparture.toFixed(2)} <span style="font-size: 13px; font-weight: normal; color: #94a3b8;">u/min</span></div>
      <div class="chart-box">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-dasharray="2 2" stroke-width="0.5" />
          <polygon fill="rgba(56, 189, 248, 0.15)" points="${departureSvg.area}" />
          <polyline fill="none" stroke="#38bdf8" stroke-width="2.5" points="${departureSvg.line}" />
        </svg>
      </div>
      <div class="footer-stat"><span>Min: 0.00 u/min</span><span>Avg: ${avgDeparture} u/min</span><span>Downstream Route</span></div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Machine Processing Speed (Capacity)</span>
        <span class="amber">Nominal: ${defaultSpeed} u/min</span>
      </div>
      <div class="card-val amber">${latestSpeed.toFixed(2)} <span style="font-size: 13px; font-weight: normal; color: #94a3b8;">u/min</span></div>
      <div class="chart-box">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-dasharray="2 2" stroke-width="0.5" />
          <polygon fill="rgba(245, 158, 11, 0.15)" points="${speedSvg.area}" />
          <polyline fill="none" stroke="#f59e0b" stroke-width="2.5" points="${speedSvg.line}" />
        </svg>
      </div>
      <div class="footer-stat"><span>Cycle: ${nominalSec}s</span><span>ISO 10816 Status: ${station.activeFault === 'NONE' ? 'Nominal' : station.activeFault}</span></div>
    </div>
  </div>

  <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 12px;">
    DigiTwin Industrial Digital Twin Simulation Suite • Standalone Pop-out Telemetry Stream
  </div>
</body>
</html>
      `;
      newWin.document.open();
      newWin.document.write(htmlContent);
      newWin.document.close();
    } catch {
      setWindowErrorNotice('Browser security policy blocked pop-up. Fullscreen modal activated.');
      setIsMaximized(true);
      setTimeout(() => setWindowErrorNotice(null), 4000);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toast Alert Notice if Popup Window is Blocked */}
      {windowErrorNotice && (
        <div className="bg-amber-950/90 border border-amber-600/80 text-amber-200 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{windowErrorNotice}</span>
          </div>
          <button onClick={() => setWindowErrorNotice(null)} className="text-amber-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Panel Header with Controls: Minimize, Maximize, Open in New Window */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Real-Time Operational Dynamics & Flow Rates</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                SimEvents 0.1s dt
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Live infeed arrival, processing cadence, outfeed departure, and server utilization.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Pop out to Draggable Resizable Window */}
          <button
            onClick={() => setIsFloatingOpen(true)}
            title="Pop out graphs into a resizable, draggable floating window"
            className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1 text-[11px] font-medium"
          >
            <Move className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pop Out Window</span>
          </button>

          {/* Open in New Window Button */}
          <button
            onClick={handleOpenInNewWindow}
            title="Open telemetry curves in a dedicated pop-out window"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition flex items-center gap-1 text-[11px] font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">New Window</span>
          </button>

          {/* Maximize / Fullscreen Modal Button */}
          <button
            onClick={() => setIsMaximized(true)}
            title="Maximize telemetry view into high-resolution modal"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {/* Minimize / Collapse Toggle Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand flow rate graphs' : 'Minimize flow rate graphs'}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Minimized Pill View */}
      {isMinimized && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
            <span>Util: <strong className="text-cyan-300">{latestUtil}%</strong></span>
            <span>•</span>
            <span>Infeed: <strong className="text-emerald-400">{latestArrival.toFixed(2)} u/m</strong></span>
            <span>•</span>
            <span>Outfeed: <strong className="text-sky-300">{latestDeparture.toFixed(2)} u/m</strong></span>
            <span>•</span>
            <span>Speed: <strong className="text-amber-300">{latestSpeed.toFixed(2)} u/m</strong></span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline transition ml-2"
          >
            Show Graphs
          </button>
        </div>
      )}

      {/* Expanded 4-Grid Flow Cards */}
      {!isMinimized && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Line Station Utilisation */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Station Utilisation Rate</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
                {latestUtil}%
              </span>
            </div>

            <div className="h-20 w-full bg-slate-900/90 rounded-lg p-1.5 border border-slate-800/80 relative overflow-hidden">
              {/* Reference Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none opacity-20">
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
              </div>

              {/* 80% Baseline marker */}
              <div className="absolute top-[28%] left-0 right-0 border-b border-cyan-500/25 border-dashed pointer-events-none" />

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <defs>
                  <linearGradient id={`utilGrad_${station.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <polygon fill={`url(#utilGrad_${station.id})`} points={utilSvg.area} />
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  points={utilSvg.line}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Target: 80%</span>
              <span>Avg: {avgUtil}%</span>
              <span>State: <strong className="text-cyan-400">{station.status}</strong></span>
            </div>
          </div>

          {/* Card 2: Infeed Arrival Rate */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Infeed Arrival Rate</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {latestArrival.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">u/min</span>
              </span>
            </div>

            <div className="h-20 w-full bg-slate-900/90 rounded-lg p-1.5 border border-slate-800/80 relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none opacity-20">
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
              </div>

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <defs>
                  <linearGradient id={`arrGrad_${station.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <polygon fill={`url(#arrGrad_${station.id})`} points={arrivalSvg.area} />
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={arrivalSvg.line}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Cadence: Continuous</span>
              <span>Avg: {avgArrival} u/min</span>
              <span>Peak: {maxArrival.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 3: Outfeed Departure Rate */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Outfeed Departure Rate</span>
              </span>
              <span className="font-mono text-sky-300 font-bold text-sm">
                {latestDeparture.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">u/min</span>
              </span>
            </div>

            <div className="h-20 w-full bg-slate-900/90 rounded-lg p-1.5 border border-slate-800/80 relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none opacity-20">
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
              </div>

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <defs>
                  <linearGradient id={`depGrad_${station.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <polygon fill={`url(#depGrad_${station.id})`} points={departureSvg.area} />
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  points={departureSvg.line}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Transfer: Downstream</span>
              <span>Avg: {avgDeparture} u/min</span>
              <span>Peak: {maxDeparture.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 4: Processing Speed */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 relative overflow-hidden group hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Processing Speed</span>
              </span>
              <span className="font-mono text-amber-300 font-bold text-sm">
                {latestSpeed.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">u/min</span>
              </span>
            </div>

            <div className="h-20 w-full bg-slate-900/90 rounded-lg p-1.5 border border-slate-800/80 relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none opacity-20">
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
                <div className="border-b border-slate-500 w-full" />
              </div>

              {/* Cycle time guide line */}
              <div className="absolute top-[35%] left-0 right-0 border-b border-amber-500/25 border-dashed pointer-events-none" />

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <defs>
                  <linearGradient id={`spdGrad_${station.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <polygon fill={`url(#spdGrad_${station.id})`} points={speedSvg.area} />
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  points={speedSvg.line}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Nominal: {defaultSpeed} u/m</span>
              <span>Cycle: {nominalSec}s</span>
              <span>Capacity: {station.isQueue ? 'Buffer' : 'Machine'}</span>
            </div>
          </div>

          {/* Cumulative Day Totals & Operational Duty Cycle Banner */}
          <div className="sm:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400">Total Arrived Today</span>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{cumulativeArrivals} units</div>
              <span className="text-[9px] text-slate-500">Infeed cumulative</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400">Total Departed Today</span>
              <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">{cumulativeDepartures} units</div>
              <span className="text-[9px] text-slate-500">Outfeed cumulative</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400">Shift Active Run Time</span>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">{busyMinutes}m {busySeconds}s</div>
              <span className="text-[9px] text-slate-500">Duty cycle: {shiftDutyCycle}%</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400">Avg / Peak Flow Rate</span>
              <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">{avgShiftFlowRate} <span className="text-[10px] font-normal text-slate-400">/ {peakFlowRate.toFixed(1)} u/m</span></div>
              <span className="text-[9px] text-slate-500">Shift throughput pace</span>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Fullscreen Modal Overlay */}
      {isMaximized && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-3 md:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{station.name} — Real-Time Telemetry & Flow Dynamics</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {station.simulinkTag}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    High-frequency discrete-event operational rates, infeed arrivals, machine speeds, and station utilization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenInNewWindow}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-600 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pop Out to Separate Window</span>
                </button>
                <button
                  onClick={() => setIsMaximized(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Close maximized view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with Recharts Chart & Live Data Table */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Current Utilisation</div>
                  <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{latestUtil}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">Average: {avgUtil}% • Target: 80%</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Infeed Arrival Rate</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {latestArrival.toFixed(2)} <span className="text-xs text-slate-400 font-normal">u/min</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Peak: {maxArrival.toFixed(2)} u/min</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Outfeed Departure Rate</div>
                  <div className="text-2xl font-bold font-mono text-sky-300 mt-1">
                    {latestDeparture.toFixed(2)} <span className="text-xs text-slate-400 font-normal">u/min</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Peak: {maxDeparture.toFixed(2)} u/min</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs text-slate-400">Processing Speed</div>
                  <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                    {latestSpeed.toFixed(2)} <span className="text-xs text-slate-400 font-normal">u/min</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Cycle Duration: {nominalSec}s</div>
                </div>
              </div>

              {/* Main Recharts High-Resolution Multi-Series Waveform */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Continuous Operational Dynamics (Recharts Multi-Axis Visualization)
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Sample Window: Last {history.length} Ticks
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rechartsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        stroke="#64748b"
                        domain={[0, 100]}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax + 1))]}
                        tick={{ fill: '#10b981', fontSize: 11 }}
                        tickFormatter={(v) => `${v} u/m`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f8fafc',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <ReferenceLine yAxisId="left" y={80} stroke="#06b6d4" strokeDasharray="4 4" label="Target Util (80%)" />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="utilization"
                        name="Utilisation (%)"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="arrivalRate"
                        name="Infeed Arrival (u/min)"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="departureRate"
                        name="Outfeed Departure (u/min)"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="processingSpeed"
                        name="Capacity Speed (u/min)"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Historical Telemetry Stream Table */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Recent Telemetry Audit Ledger
                  </h4>
                  <span className="text-xs text-slate-400">Total samples recorded: {history.length}</span>
                </div>

                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3">Utilisation</th>
                        <th className="py-2 px-3">Infeed Arrival</th>
                        <th className="py-2 px-3">Outfeed Departure</th>
                        <th className="py-2 px-3">Processing Speed</th>
                        <th className="py-2 px-3">Vibration RMS</th>
                        <th className="py-2 px-3">Temp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {history.slice(-10).reverse().map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3">{h.timestamp !== undefined ? h.timestamp.toFixed(1) : idx}s</td>
                          <td className="py-1.5 px-3 text-cyan-300">{h.utilization ?? latestUtil}%</td>
                          <td className="py-1.5 px-3 text-emerald-400">{(h.arrivalRate ?? 0).toFixed(2)} u/m</td>
                          <td className="py-1.5 px-3 text-sky-300">{(h.departureRate ?? 0).toFixed(2)} u/m</td>
                          <td className="py-1.5 px-3 text-amber-300">{(h.processingSpeed ?? defaultSpeed).toFixed(2)} u/m</td>
                          <td className="py-1.5 px-3 text-slate-300">{h.vibrationRms.toFixed(2)} mm/s</td>
                          <td className="py-1.5 px-3 text-slate-300">{h.temperature.toFixed(1)}°C</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Synchronized with SimEvents 0.1s discrete-event simulation engine</span>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable & Resizable Floating Window Pop-out */}
      {isFloatingOpen && (
        <DraggableResizableWindow
          isOpen={isFloatingOpen}
          onClose={() => setIsFloatingOpen(false)}
          title={`${station.name} — Live Flow Rates & Telemetry`}
          subtitle={`SimEvents Line ${station.line} • Tag: ${station.simulinkTag}`}
          icon={<Activity className="w-4 h-4 text-cyan-400" />}
          onOpenInNewWindow={handleOpenInNewWindow}
          initialWidth={720}
          initialHeight={560}
        >
          <div className="space-y-4">
            {/* Cumulative Totals in Floating Window */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400">Total Arrived Today</span>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{cumulativeArrivals} u</div>
                <span className="text-[9px] text-slate-500">Infeed cumulative</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400">Total Departed Today</span>
                <div className="text-base font-bold font-mono text-sky-400 mt-0.5">{cumulativeDepartures} u</div>
                <span className="text-[9px] text-slate-500">Outfeed cumulative</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400">Active Run Time</span>
                <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">{busyMinutes}m {busySeconds}s</div>
                <span className="text-[9px] text-slate-500">Duty cycle: {shiftDutyCycle}%</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400">Shift Average Flow</span>
                <div className="text-base font-bold font-mono text-amber-300 mt-0.5">{avgShiftFlowRate} <span className="text-[10px] font-normal text-slate-400">u/min</span></div>
                <span className="text-[9px] text-slate-500">Peak: {peakFlowRate.toFixed(1)} u/m</span>
              </div>
            </div>

            {/* 4 Flow Rate Micro-Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Station Utilisation</span>
                  <span className="font-mono text-cyan-300 font-bold">{latestUtil}%</span>
                </div>
                <div className="h-12 w-full mt-1">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={utilSvg.line} vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Infeed Arrival Rate</span>
                  <span className="font-mono text-emerald-400 font-bold">{latestArrival.toFixed(2)} u/m</span>
                </div>
                <div className="h-12 w-full mt-1">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={arrivalSvg.line} vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Outfeed Departure Rate</span>
                  <span className="font-mono text-sky-400 font-bold">{latestDeparture.toFixed(2)} u/m</span>
                </div>
                <div className="h-12 w-full mt-1">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={departureSvg.line} vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Processing Speed</span>
                  <span className="font-mono text-amber-300 font-bold">{latestSpeed.toFixed(2)} u/m</span>
                </div>
                <div className="h-12 w-full mt-1">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" points={speedSvg.line} vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recharts Continuous Waveform */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live Discrete-Event Dynamics (Recharts Multi-Axis)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sample: {history.length} ticks</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rechartsData} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#64748b" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[0, 'auto']} tick={{ fill: '#10b981', fontSize: 10 }} tickFormatter={(v) => `${v} u/m`} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine yAxisId="left" y={80} stroke="#06b6d4" strokeDasharray="4 4" />
                    <Line yAxisId="left" type="monotone" dataKey="utilization" name="Utilisation (%)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="arrivalRate" name="Infeed Arrival (u/m)" stroke="#10b981" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="departureRate" name="Outfeed Departure (u/m)" stroke="#38bdf8" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="processingSpeed" name="Speed (u/m)" stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DraggableResizableWindow>
      )}
    </div>
  );
};
