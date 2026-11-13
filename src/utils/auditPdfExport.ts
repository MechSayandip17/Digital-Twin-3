import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdminAuditLog } from '../types/auth';
import { ShiftSummaryReport, formatIndianCurrency } from './shiftSummaryReport';

export interface AuditPdfRow {
  timestamp: string;
  action: string;
  adminActor: string;
  target: string;
  details: string;
  id: string;
}

/**
 * Formats audit log records into clean, printable table rows for PDF export.
 */
export function buildAuditPdfRows(logs: AdminAuditLog[]): AuditPdfRow[] {
  return logs.map((log) => ({
    timestamp: log.timestampStr || new Date(log.timestamp || Date.now()).toLocaleString(),
    action: (log.action || 'EVENT').replace(/_/g, ' '),
    adminActor: `${log.adminEmail || 'System Admin'}${log.adminBadge ? ` (${log.adminBadge})` : ''}`,
    target: log.targetName || log.targetId || '—',
    details: log.details || '—',
    id: log.id || '—',
  }));
}

/**
 * Generates and downloads a formatted A4 PDF of the Admin Audit Trail directly in the browser.
 */
export function exportAuditLogsToPdf(
  logs: AdminAuditLog[],
  options?: {
    title?: string;
    filterLabel?: string;
    searchQuery?: string;
    exportedBy?: string;
  }
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `digitwin-admin-audit-log-${dateStamp}.pdf`;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('AEROTWIN DIGITAL TWIN — ADMIN GOVERNANCE AUDIT LOG', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${options?.title || 'System Audit Trail & Governance Log'}  •  Generated: ${nowStr}`,
    14,
    18
  );
  doc.text(
    `Total Entries: ${logs.length}  •  Filter: ${options?.filterLabel || 'ALL'}${
      options?.searchQuery ? `  •  Search: "${options.searchQuery}"` : ''
    }${options?.exportedBy ? `  •  Exported By: ${options.exportedBy}` : ''}`,
    14,
    23
  );

  const rows = buildAuditPdfRows(logs);

  autoTable(doc, {
    startY: 32,
    head: [['Timestamp', 'Action Type', 'Admin Actor', 'Target', 'Governance Details', 'Log ID']],
    body: rows.map((r) => [r.timestamp, r.action, r.adminActor, r.target, r.details, r.id]),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 46 },
      3: { cellWidth: 34 },
      4: { cellWidth: 96 },
      5: { cellWidth: 27, font: 'courier', fontSize: 7 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `DigiTwin Admin Portal • Confidential Governance Audit Trail • Page ${data.pageNumber} of ${pageCount}`,
        14,
        203
      );
    },
  });

  doc.save(filename);
  return filename;
}

/**
 * Generates and downloads a formatted A4 PDF of the Daily Shift Summary Report directly in the browser
 * (avoids window.open popup blocking inside iframes).
 */
export function exportDailyShiftReportToPdf(report: ShiftSummaryReport): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const filename = `digitwin-shift-summary-day${report.dayNumber}-${report.shiftDateStr || 'latest'}.pdf`;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AEROTWIN — DAILY SHIFT SUMMARY REPORT', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Day ${report.dayNumber} • Date: ${report.shiftDateStr} • Shift Window: ${report.shiftWindow}`,
    14,
    18
  );
  doc.text(
    `Shift Status: ${report.shiftStatus.replace(/_/g, ' ')} • Real-Time Shift End: ${report.shiftEndTimeStr}`,
    14,
    24
  );

  autoTable(doc, {
    startY: 34,
    head: [['Key Performance Metric', 'Recorded Value', 'Target / Standard']],
    body: [
      ['Finished Goods Produced', `${report.finishedGoodsToday} units`, `${report.dailyTargetUnits} units (${report.fulfillmentPercentage}%)`],
      ['Arrears Backlog Carried', `${report.arrearsBacklogUnits} units`, `Today's Deficit: +${report.arrearsTodayDeficit} u`],
      ['Overall Plant OEE', `${report.overallOeePercent}%`, `First Pass Yield: ${report.firstPassYieldPercent}%`],
      ['QC Reworks / Scraps Today', `${report.reworksToday?.total ?? 0} reworks / ${report.scrapsToday?.total ?? 0} scraps`, `Scrap Loss: ${formatIndianCurrency(report.scrapsToday?.scrapCostInr ?? 0)}`],
      ['Energy Consumed & Cost', `${(report.totalEnergyConsumedKwh ?? 0).toFixed(1)} kWh`, `${formatIndianCurrency(report.totalEnergyCostInr ?? 0)} (Solar: ${report.solarOffsetPercent ?? 0}%)`],
      ['Cumulative Fleet RUL Lost', `-${(report.totalFleetRulReductionHours ?? 0).toFixed(1)} hrs`, `Critical Alarms: ${report.criticalEquipmentList?.length ?? 0}`],
    ],
    headStyles: { fillColor: [2, 132, 199], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const equipY = ((doc as any).lastAutoTable?.finalY || 90) + 6;
  autoTable(doc, {
    startY: equipY,
    head: [['Station / Machine', 'Line', 'Run Hours', 'Shift RUL Loss', 'Remaining RUL', 'Health State']],
    body: (report.equipmentSummaries || []).map((st) => [
      st.name,
      st.line,
      `${st.cumulativeRunHours}h`,
      `-${st.rulReductionTodayHours}h`,
      `${st.remainingUsefulLifeHours}h`,
      st.healthStatus,
    ]),
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  doc.save(filename);
  return filename;
}
