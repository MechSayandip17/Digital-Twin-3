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
import { ShiftSummaryReport, formatIndianCurrency, formatIndianNumber } from '../utils/shiftSummaryReport';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ShiftSummaryReport;
  onAdvanceToNextDay?: () => void;
}

/**
 * Triggers a pristine, professional printable window ready for instant Save as PDF or physical print.
 */
function exportReportToPdf(report: ShiftSummaryReport) {
  const printWindow = window.open('', '_blank', 'width=1000,height=1100');
  if (!printWindow) {
    window.print();
    return;
  }

  const faultRowsHtml = report.faultIncidentsToday && report.faultIncidentsToday.length > 0
    ? report.faultIncidentsToday.map(f => `
      <tr>
        <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${f.timestamp}</td>
        <td><strong>${f.stationName}</strong> (${f.line})</td>
        <td>${f.faultType.replace(/_/g, ' ')}</td>
        <td><span class="status-pill status-${f.severity.toLowerCase()}">${f.severity}</span></td>
        <td><span class="status-pill ${f.status === 'RESOLVED' ? 'status-healthy' : 'status-alarm'}">${f.status}</span></td>
        <td>${f.actionTaken}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" style="text-align: center; color: #166534; padding: 10px;">Zero machine faults or breakdowns recorded during this shift. All systems operated within nominal limits.</td></tr>';

  const equipRowsHtml = report.equipmentSummaries.map(st => `
    <tr>
      <td><strong>${st.name}</strong></td>
      <td>${st.line}</td>
      <td style="font-family: monospace;">${st.cumulativeRunHours}h</td>
      <td style="font-family: monospace; color: #dc2626;">-${st.rulReductionTodayHours}h</td>
      <td style="font-family: monospace; font-weight: bold; color: ${st.remainingUsefulLifeHours < 24 ? '#dc2626' : '#166534'};">${st.remainingUsefulLifeHours} hrs</td>
      <td>${st.predictedFailureClass}</td>
      <td><span class="status-pill ${st.healthStatus === 'CRITICAL_ALARM' ? 'status-alarm' : st.healthStatus === 'ADVISORY' ? 'status-advisory' : 'status-healthy'}">${st.healthStatus}</span></td>
    </tr>
  `).join('');

  const directivesHtml = report.prescriptiveRecommendations.map((rec, i) => `
    <li style="margin-bottom: 6px;"><strong style="color: #0284c7;">[${i + 1}]</strong> ${rec}</li>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DigiTwin Shift Summary - Day ${report.dayNumber} (${report.shiftDateStr})</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; line-height: 1.45; }
    .header { border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; border: 1px solid #0284c7; color: #0284c7; background: #f0f9ff; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 14px; }
    .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
    .card-title { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
    .card-value { font-size: 20px; font-weight: 800; color: #0f172a; font-family: monospace; }
    .card-sub { font-size: 9.5px; color: #475569; margin-top: 3px; }
    .section { margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
    .section-header { background: #f1f5f9; padding: 7px 12px; font-weight: 700; font-size: 11px; color: #1e293b; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .section-body { padding: 10px 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f8fafc; text-align: left; padding: 6px 8px; border-bottom: 1.5px solid #cbd5e1; color: #475569; font-weight: 700; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #fcfcfd; }
    .status-pill { display: inline-block; padding: 1.5px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .status-healthy { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .status-advisory { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .status-alarm { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .status-critical { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .status-high { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .status-medium { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .status-low { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .footer { margin-top: 18px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; }
    ul { margin: 0; padding-left: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">AEROTWIN MANUFACTURING DIGITAL TWIN</h1>
      <div class="subtitle">Official Daily Shift Summary, Quality & Predictive Maintenance Report</div>
      <div class="subtitle"><strong>Day ${report.dayNumber}</strong> • Date: <strong>${report.shiftDateStr}</strong> • Shift Window: <strong>${report.shiftWindow}</strong></div>
    </div>
    <div style="text-align: right;">
      <span class="badge">${report.shiftStatus.replace(/_/g, ' ')}</span>
      <div style="font-size: 9px; color: #64748b; margin-top: 4px;">ISO 10816 • CEA Energy Standards</div>
      <div style="font-size: 9px; color: #64748b;">Indian Aerospace Quality Matrix</div>
    </div>
  </div>

  <!-- Primary KPIs -->
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Finished Goods Output</div>
      <div class="card-value" style="color: #0284c7;">${report.finishedGoodsToday} <span style="font-size: 11px; color: #64748b;">/ ${report.dailyTargetUnits} u</span></div>
      <div class="card-sub">Fulfillment: <strong>${report.fulfillmentPercentage}%</strong> • FPY: ${report.firstPassYieldPercent}%</div>
    </div>
    <div class="card">
      <div class="card-title">Arrears Backlog Carried</div>
      <div class="card-value" style="color: ${report.arrearsBacklogUnits > 0 ? '#d97706' : '#166534'};">${report.arrearsBacklogUnits} <span style="font-size: 11px; color: #64748b;">units</span></div>
      <div class="card-sub">Today's Deficit: <strong>${report.arrearsTodayDeficit > 0 ? `+${report.arrearsTodayDeficit} u` : '0 u'}</strong></div>
    </div>
    <div class="card">
      <div class="card-title">Total Energy Consumed</div>
      <div class="card-value" style="color: #d97706;">${report.totalEnergyConsumedKwh.toFixed(0)} <span style="font-size: 11px; color: #64748b;">kWh</span></div>
      <div class="card-sub">Cost: <strong>${formatIndianCurrency(report.totalEnergyCostInr)}</strong> • Solar: ${report.solarOffsetPercent}%</div>
    </div>
    <div class="card">
      <div class="card-title">Machinery Health Status</div>
      <div class="card-value" style="color: ${report.criticalEquipmentList.length > 0 ? '#dc2626' : '#166534'};">${report.criticalEquipmentList.length > 0 ? `${report.criticalEquipmentList.length} ALARM` : 'NOMINAL'}</div>
      <div class="card-sub">Cumulative RUL Lost: <strong>-${report.totalFleetRulReductionHours.toFixed(1)}h</strong></div>
    </div>
  </div>

  <!-- Section: QC Defects, Per-Day Reworks & Scraps -->
  <div class="section">
    <div class="section-header">
      <span>DAILY QUALITY CONTROL DEFECTS, REWORKS & SCRAP LOSSES</span>
      <span style="font-family: monospace; font-size: 10px;">Total Write-off: ${formatIndianCurrency(report.scrapsToday.scrapCostInr)}</span>
    </div>
    <div class="section-body">
      <div class="grid-2" style="margin-bottom: 0;">
        <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
          <strong style="color: #d97706;">🔄 Daily Reworks Total: ${report.reworksToday.total} units</strong>
          <div style="margin-top: 4px; font-size: 10px; color: #475569;">
            <div>• Line RM1 (CNC Lathe): <strong>${report.reworksToday.rm1Lathe} units</strong></div>
            <div>• Line RM2 (CNC Milling): <strong>${report.reworksToday.rm2Milling} units</strong></div>
            <div>• Line RM3 (CNC Shaping): <strong>${report.reworksToday.rm3Shaping} units</strong></div>
            <div style="margin-top: 2px; color: #64748b;">Cycle time penalty incurred: ~${report.reworksToday.reworkCycleTimeMinutes} minutes</div>
          </div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
          <strong style="color: #dc2626;">🗑️ Daily Scraps Total: ${report.scrapsToday.total} units</strong>
          <div style="margin-top: 4px; font-size: 10px; color: #475569;">
            <div>• Line RM1 (Billet rejects): <strong>${report.scrapsToday.rm1Lathe} units</strong></div>
            <div>• Line RM2 (Casting flaws): <strong>${report.scrapsToday.rm2Milling} units</strong></div>
            <div>• Line RM3 (Plate cracks): <strong>${report.scrapsToday.rm3Shaping} units</strong></div>
            <div style="margin-top: 2px; color: #dc2626; font-weight: bold;">Material scrap cost loss: ${formatIndianCurrency(report.scrapsToday.scrapCostInr)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Section: Plant Entity Throughput by Stage & Type -->
  <div class="section">
    <div class="section-header">
      <span>PER-DAY ENTITY THROUGHPUT BY MATERIAL TYPE & MANUFACTURING STAGE</span>
      <span style="font-family: monospace; font-size: 10px;">Full Inflow-to-Dispatch Flow</span>
    </div>
    <div class="section-body" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th>Material Line / Item Type</th>
            <th>Truck Unloaded</th>
            <th>CNC Machined</th>
            <th>QC Passed</th>
            <th>Downstream Transition</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>RM1 Titanium Bar Billet</strong></td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm1BilletUnloaded}</td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm1BilletMachined}</td>
            <td style="font-family: monospace; color: #166534; font-weight: bold;">${report.entityThroughputByType.rm1BilletQcPassed}</td>
            <td>Staged into Converge Joiner</td>
          </tr>
          <tr>
            <td><strong>RM2 Aluminum Casting Housing</strong></td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm2CastingUnloaded}</td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm2CastingMachined}</td>
            <td style="font-family: monospace; color: #166534; font-weight: bold;">${report.entityThroughputByType.rm2CastingQcPassed}</td>
            <td>Staged into Converge Joiner</td>
          </tr>
          <tr>
            <td><strong>RM3 Steel Gear Blank Plate</strong></td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm3PlateUnloaded}</td>
            <td style="font-family: monospace;">${report.entityThroughputByType.rm3PlateMachined}</td>
            <td style="font-family: monospace; color: #166534; font-weight: bold;">${report.entityThroughputByType.rm3PlateQcPassed}</td>
            <td>Staged into Converge Joiner</td>
          </tr>
          <tr style="background: #f0fdf4;">
            <td><strong>Converged 3-Part Assemblies</strong></td>
            <td colspan="2">Merged Sets: <strong>${report.entityThroughputByType.mergedSetsCount}</strong></td>
            <td colspan="2">Final Assembled Mechanisms: <strong>${report.entityThroughputByType.assembledUnitsCount}</strong></td>
          </tr>
          <tr style="background: #f0f9ff;">
            <td><strong>Packaging & Shipping Dispatch</strong></td>
            <td colspan="2">Packaged Finished Boxes: <strong>${report.entityThroughputByType.packagedGoodsCount}</strong></td>
            <td colspan="2">Dispatched to Logistics Hub: <strong style="color: #0284c7;">${report.entityThroughputByType.dispatchedToWarehouseCount}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Section: Machine Faults & Breakdowns Logged Today -->
  <div class="section">
    <div class="section-header">
      <span>DAILY MACHINE FAULTS, DEGRADATIONS & INCIDENTS (WITH TIMESTAMPS)</span>
      <span style="font-family: monospace; font-size: 10px;">${report.faultIncidentsToday ? report.faultIncidentsToday.length : 0} Events Logged</span>
    </div>
    <div class="section-body" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Machine / Station</th>
            <th>Incident Class</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Maintenance Resolution</th>
          </tr>
        </thead>
        <tbody>
          ${faultRowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Section: Equipment Health & Weibull RUL Matrix -->
  <div class="section">
    <div class="section-header">
      <span>EQUIPMENT HEALTH & WEIBULL REMAINING USEFUL LIFE (RUL) MATRIX (16 STATIONS)</span>
      <span style="font-family: monospace; font-size: 10px;">Total Fleet: 16 Units</span>
    </div>
    <div class="section-body" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th>Station / Machine</th>
            <th>Line</th>
            <th>Operating Hours</th>
            <th>Shift RUL Loss</th>
            <th>Remaining RUL</th>
            <th>Diagnostic Class</th>
            <th>Health State</th>
          </tr>
        </thead>
        <tbody>
          ${equipRowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Section: Prescriptive Directives -->
  <div class="section">
    <div class="section-header">
      <span>PRESCRIPTIVE ENGINEERING DIRECTIVES FOR NEXT WORKING SHIFT</span>
    </div>
    <div class="section-body">
      <ul>
        ${directivesHtml}
      </ul>
    </div>
  </div>

  <div class="footer">
    <span>DigiTwin Discrete Event Simulation Digital Twin • Certified under Indian Aerospace Standards</span>
    <span>Generated: ${report.shiftDateStr} • Confidential Internal Plant Document</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  report,
  onAdvanceToNextDay,
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
              <div className="flex items-center gap-2">
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
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Day {report.dayNumber} • {report.shiftDateStr}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{report.shiftWindow}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReportToPdf(report)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              title="Print official shift summary report or save directly as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
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
              onClick={() => exportReportToPdf(report)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print / Save PDF</span>
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
