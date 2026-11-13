import React from 'react';
import {
  X,
  FileText,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Sun,
  ShieldAlert,
  ArrowRight,
  Download,
  Layers,
  Wrench,
  PackageCheck,
  AlertOctagon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ShiftSummaryReport, formatIndianCurrency } from '../utils/shiftSummaryReport';
import { exportDailyShiftReportToPdf } from '../utils/auditPdfExport';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ShiftSummaryReport;
  onAdvanceToNextDay?: () => void;
  isLiveSynced?: boolean;
  lastSyncedAt?: string;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  report,
  onAdvanceToNextDay,
  isLiveSynced = true,
  lastSyncedAt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="shift-summary-report-printable"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Daily Shift Summary Report
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider ${
                    report.shiftStatus === 'SHIFT_COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {report.shiftStatus === 'SHIFT_COMPLETED' ? 'Shift Completed' : 'Shift In Progress'}
                </span>
                {isLiveSynced && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700">
                    LIVE SYNC ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Day {report.dayNumber} • {report.shiftDateStr}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{report.shiftWindow}</span>
                <span>•</span>
                <span className="text-cyan-300 font-mono">
                  Shift End: {report.shiftEndTimeStr}
                </span>
                {lastSyncedAt && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    • Synced {new Date(lastSyncedAt).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportDailyShiftReportToPdf(report)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              title="Download official daily shift summary report as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-slate-200 text-xs custom-scrollbar">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* 1. Production Output */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Finished Goods Produced</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {report.finishedGoodsToday}
                </span>
                <span className="text-xs text-slate-500 font-mono">/ {report.dailyTargetUnits} u</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Fulfillment:</span>
                <span
                  className={`font-mono font-bold ${
                    report.fulfillmentPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {report.fulfillmentPercentage}%
                </span>
              </div>
            </div>

            {/* 2. Arrears Backlog */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Arrears Backlog Carried</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono ${
                    report.arrearsBacklogUnits > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {report.arrearsBacklogUnits}
                </span>
                <span className="text-xs text-slate-500">units</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Today's Deficit:</span>
                <span className="font-mono text-slate-300 font-bold">
                  {report.arrearsTodayDeficit > 0 ? `+${report.arrearsTodayDeficit} u deficit` : 'Zero deficit'}
                </span>
              </div>
            </div>

            {/* 3. Total Energy Consumed */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Total Energy Consumed</span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-amber-300">
                  {report.totalEnergyConsumedKwh.toFixed(0)}
                </span>
                <span className="text-xs text-slate-500 font-mono">kWh</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Cost (₹8.50/u):</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatIndianCurrency(report.totalEnergyCostInr)}
                </span>
              </div>
            </div>

            {/* 4. Fleet RUL Reduction */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Cumulative RUL Lost</span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-rose-400">
                  -{report.totalFleetRulReductionHours.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">Hours</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Critical Alarms:</span>
                <span
                  className={`font-mono font-bold ${
                    report.criticalEquipmentList.length > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {report.criticalEquipmentList.length > 0 ? `${report.criticalEquipmentList.length} alert` : '0 nominal'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: QC Defects, Per-Day Reworks & Scrap Losses */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center justify-between uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Quality Control Defects, Per-Day Reworks & Scrap Write-offs</span>
              </span>
              <span className="text-[11px] font-mono text-rose-400 font-bold">
                Total Scrap Loss: {formatIndianCurrency(report.scrapsToday.scrapCostInr)}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reworks summary card */}
              <div className="p-3.5 bg-slate-900/70 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rework Operations Today</span>
                  </span>
                  <span className="text-base font-bold font-mono text-amber-300">
                    {report.reworksToday.total} units
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM1 CNC Lathe Reworks:</span>
                    <span className="font-mono font-semibold">{report.reworksToday.rm1Lathe}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM2 CNC Milling Reworks:</span>
                    <span className="font-mono font-semibold">{report.reworksToday.rm2Milling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM3 CNC Shaping Reworks:</span>
                    <span className="font-mono font-semibold">{report.reworksToday.rm3Shaping}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px] pt-1">
                    <span>Rework cycle time penalty:</span>
                    <span className="font-mono text-amber-400">~{report.reworksToday.reworkCycleTimeMinutes} min lost</span>
                  </div>
                </div>
              </div>

              {/* Scraps summary card */}
              <div className="p-3.5 bg-slate-900/70 border border-rose-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanent Scrap Discards Today</span>
                  </span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    {report.scrapsToday.total} units
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM1 Titanium Billet Scraps:</span>
                    <span className="font-mono font-semibold">{report.scrapsToday.rm1Lathe}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM2 Aluminum Housing Scraps:</span>
                    <span className="font-mono font-semibold">{report.scrapsToday.rm2Milling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• RM3 Steel Gear Plate Scraps:</span>
                    <span className="font-mono font-semibold">{report.scrapsToday.rm3Shaping}</span>
                  </div>
                  <div className="flex justify-between text-rose-400 text-[10px] pt-1 font-bold">
                    <span>Direct Material Cost Write-off:</span>
                    <span className="font-mono">{formatIndianCurrency(report.scrapsToday.scrapCostInr)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Per-Day Entity Throughput by Material Type */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center justify-between uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Per-Day Entity Throughput by Type (Inflow → Machine → QC → Dispatch)</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                Dispatched Today: {report.entityThroughputByType.dispatchedToWarehouseCount} Units
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2 px-2.5">Entity / Raw Material</th>
                    <th className="py-2 px-2.5">Truck Unloaded</th>
                    <th className="py-2 px-2.5">CNC Machined</th>
                    <th className="py-2 px-2.5">QC Passed</th>
                    <th className="py-2 px-2.5">Downstream Transition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr className="hover:bg-slate-900/40 transition">
                    <td className="py-2 px-2.5 font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
                      <span>RM1 Titanium Alloy Billet</span>
                    </td>
                    <td className="py-2 px-2.5 text-cyan-300">{report.entityThroughputByType.rm1BilletUnloaded}</td>
                    <td className="py-2 px-2.5 text-slate-300">{report.entityThroughputByType.rm1BilletMachined}</td>
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{report.entityThroughputByType.rm1BilletQcPassed}</td>
                    <td className="py-2 px-2.5 font-sans text-slate-400">Converge Joiner Infeed</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40 transition">
                    <td className="py-2 px-2.5 font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                      <span>RM2 Aluminum Casting Housing</span>
                    </td>
                    <td className="py-2 px-2.5 text-cyan-300">{report.entityThroughputByType.rm2CastingUnloaded}</td>
                    <td className="py-2 px-2.5 text-slate-300">{report.entityThroughputByType.rm2CastingMachined}</td>
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{report.entityThroughputByType.rm2CastingQcPassed}</td>
                    <td className="py-2 px-2.5 font-sans text-slate-400">Converge Joiner Infeed</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40 transition">
                    <td className="py-2 px-2.5 font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                      <span>RM3 Steel Gear Blank Plate</span>
                    </td>
                    <td className="py-2 px-2.5 text-cyan-300">{report.entityThroughputByType.rm3PlateUnloaded}</td>
                    <td className="py-2 px-2.5 text-slate-300">{report.entityThroughputByType.rm3PlateMachined}</td>
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{report.entityThroughputByType.rm3PlateQcPassed}</td>
                    <td className="py-2 px-2.5 font-sans text-slate-400">Converge Joiner Infeed</td>
                  </tr>
                  <tr className="bg-slate-900/60">
                    <td className="py-2 px-2.5 font-sans font-semibold text-indigo-300 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Synchronous Merge & Final Assembly</span>
                    </td>
                    <td colSpan={2} className="py-2 px-2.5 text-slate-300">
                      Merged Sets: <strong className="text-white">{report.entityThroughputByType.mergedSetsCount}</strong>
                    </td>
                    <td colSpan={2} className="py-2 px-2.5 text-emerald-400 font-bold">
                      Assembled Mechanisms: {report.entityThroughputByType.assembledUnitsCount}
                    </td>
                  </tr>
                  <tr className="bg-slate-900/60">
                    <td className="py-2 px-2.5 font-sans font-semibold text-amber-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Packaging & Shipping Dispatch</span>
                    </td>
                    <td colSpan={2} className="py-2 px-2.5 text-slate-300">
                      Packaged Boxes: <strong className="text-white">{report.entityThroughputByType.packagedGoodsCount}</strong>
                    </td>
                    <td colSpan={2} className="py-2 px-2.5 text-cyan-300 font-bold">
                      Dispatched Outbound: {report.entityThroughputByType.dispatchedToWarehouseCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: Machine Faults Happening Today with Real-Time Timestamps */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center justify-between uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Machine Fault Incidents Happening Today (with Timestamp Log)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {report.faultIncidentsToday ? report.faultIncidentsToday.length : 0} Incidents Logged
              </span>
            </h3>

            {!report.faultIncidentsToday || report.faultIncidentsToday.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero unscheduled machine faults or breakdowns recorded during this shift. All plant equipment maintained nominal ISO tolerances.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-2.5">Timestamp</th>
                      <th className="py-2 px-2.5">Machine / Station</th>
                      <th className="py-2 px-2.5">Incident Class</th>
                      <th className="py-2 px-2.5">Severity</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5">Resolution Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {report.faultIncidentsToday.map((incident) => (
                      <tr key={incident.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-2.5 font-bold text-cyan-300">
                          {incident.timestamp}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-semibold text-slate-200">
                          {incident.stationName} <span className="text-slate-400 font-mono text-[10px]">({incident.line})</span>
                        </td>
                        <td className="py-2 px-2.5 font-sans text-rose-300">
                          {incident.faultType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              incident.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : incident.severity === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : incident.severity === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {incident.severity}
                          </span>
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              incident.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {incident.status}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-sans text-slate-400 truncate max-w-[200px]" title={incident.actionTaken}>
                          {incident.actionTaken}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Machinery Health & Remaining Useful Life (RUL) Matrix */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center justify-between uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <span>Equipment Health & Weibull RUL Matrix</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Total Fleet: {report.equipmentSummaries.length} Stations Traced
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2 px-2.5">Station / Machine</th>
                    <th className="py-2 px-2.5">Line</th>
                    <th className="py-2 px-2.5">Operating Hours</th>
                    <th className="py-2 px-2.5">Shift RUL Loss</th>
                    <th className="py-2 px-2.5">Remaining RUL</th>
                    <th className="py-2 px-2.5">Diagnostic Class</th>
                    <th className="py-2 px-2.5">Health State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {report.equipmentSummaries.map((st) => (
                    <tr key={st.stationId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2 px-2.5 font-sans font-semibold text-slate-200">
                        {st.name}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400">{st.line}</td>
                      <td className="py-2 px-2.5 text-slate-300">{st.cumulativeRunHours}h</td>
                      <td className="py-2 px-2.5 text-rose-400 font-bold">-{st.rulReductionTodayHours}h</td>
                      <td className="py-2 px-2.5 font-bold">
                        <span className={st.remainingUsefulLifeHours < 24 ? 'text-rose-400' : 'text-emerald-400'}>
                          {st.remainingUsefulLifeHours} hrs
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-sans text-slate-300 truncate max-w-[200px]" title={st.predictedFailureClass}>
                        {st.predictedFailureClass}
                      </td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            st.healthStatus === 'CRITICAL_ALARM'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : st.healthStatus === 'ADVISORY'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {st.healthStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Energy Consumption & Sustainability Overview */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Energy Consumption & Sustainability Performance (Indian Standards)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Peak Demand Recorded</span>
                <p className="text-sm font-bold font-mono text-white mt-0.5">
                  {report.peakDemandKw} kW
                </p>
                <span className="text-[10px] text-slate-500 font-mono">PF: {report.powerFactor} Lag</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Rooftop Solar Offset</span>
                <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{report.solarOffsetPercent}%</span>
                </p>
                <span className="text-[10px] text-slate-500 font-mono">{report.solarGenerationKwh} kWh clean</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Carbon Footprint (CEA)</span>
                <p className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                  {report.carbonEmissionsKg} kg CO₂
                </p>
                <span className="text-[10px] text-slate-500">0.82 kg/kWh Grid Avg</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Specific Energy (SEC)</span>
                <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">
                  {report.specificEnergyKwhPerUnit} kWh/unit
                </p>
                <span className="text-[10px] text-slate-500">Per Finished Part</span>
              </div>
            </div>
          </div>

          {/* Section: Prescriptive Directives for Tomorrow's Shift */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Prescriptive Engineering Directives for Next Working Shift</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {report.prescriptiveRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold font-mono">[{i + 1}]</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Shift Summary verified under Indian Aerospace & ISO 10816 standards
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => exportDailyShiftReportToPdf(report)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
            >
              Close
            </button>
            {onAdvanceToNextDay && (
              <button
                onClick={() => {
                  onAdvanceToNextDay();
                  onClose();
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
              >
                <span>Advance to Next Working Day</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
