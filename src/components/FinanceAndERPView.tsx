import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  RotateCcw,
  Sliders,
  GitBranch,
  Truck,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  ShoppingCart,
  Send,
  Boxes
} from 'lucide-react';
import {
  FinancialParameters,
  DEFAULT_FINANCIAL_PARAMS,
} from '../types/financeErp';
import { Employee } from '../types/employee';
import { formatIndianCurrency, formatIndianNumber } from '../utils/shiftSummaryReport';
import {
  BOMNode,
  MASTER_AEROSPACE_BOM,
  DEFAULT_DIGITWIN_WORK_ORDERS,
  INITIAL_PHYSICAL_STOCK,
  WorkOrderMRP,
  calculateMRPRequirements,
  LivePhysicalInventoryStock,
} from '../utils/mrpEngine';

interface FinanceAndERPViewProps {
  completedToday: number;
  dailyTarget: number;
  employees: Employee[];
  scrapCountToday: number;
  simulatedDayCount: number;
  simulatedDate: string;
}

export const FinanceAndERPView: React.FC<FinanceAndERPViewProps> = ({
  completedToday,
  dailyTarget,
  employees,
  scrapCountToday,
  simulatedDayCount,
  simulatedDate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'economics' | 'work_orders' | 'mrp_bom' | 'config'>('economics');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('WO-2026-001');

  // Parameters
  const [params, setParams] = useState<FinancialParameters>(() => {
    try {
      const saved = localStorage.getItem('digitwin_financial_params_inr');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_FINANCIAL_PARAMS;
  });

  // Work Orders state
  const [workOrders, setWorkOrders] = useState<WorkOrderMRP[]>(() => {
    try {
      const saved = localStorage.getItem('digitwin_work_orders_inr');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_DIGITWIN_WORK_ORDERS;
  });

  // Live Physical Stock state for MRP
  const [stockState, setStockState] = useState<LivePhysicalInventoryStock>(() => {
    try {
      const saved = localStorage.getItem('digitwin_mrp_stock');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PHYSICAL_STOCK;
  });

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState<Partial<WorkOrderMRP>>({
    customer: '',
    partDescription: '',
    targetQuantity: 100,
    priority: 'STANDARD',
    unitTargetPriceInr: params.targetWholesalePricePerUnit,
    dueDate: '2026-11-20',
  });

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Run MRP calculations based on currently selected work order
  const mrpResults = useMemo(() => {
    return calculateMRPRequirements(selectedWorkOrderId, workOrders, stockState);
  }, [selectedWorkOrderId, workOrders, stockState]);

  // Calculate Labor Payroll from employee roster (in ₹/hr)
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const totalHourlyLaborCost = activeEmployees.reduce((sum, e) => sum + e.hourlyWage, 0);

  // Compute Per-Unit Economics in Indian Rupees (₹)
  const productionRatePerHour = Math.max(5, completedToday > 0 ? completedToday / 4 : dailyTarget / 8);

  const directMaterialCost = params.rm1BarCost + params.rm2CastingCost + params.rm3PlateCost; // ₹10,600
  const directLaborCost = totalHourlyLaborCost / productionRatePerHour;
  const energyAndUtilitiesCost = (params.averagePlantPowerKw * params.electricityTariffPerKwh) / productionRatePerHour;
  const machineDepreciationCost = params.machineDepreciationPerHour / productionRatePerHour;
  const toolingConsumablesCost = params.toolingReplacementCostPerUnit;
  const scrapRateRatio = Math.max(0.01, scrapCountToday / Math.max(1, completedToday + scrapCountToday));
  const scrapQualityBurdenCost = directMaterialCost * scrapRateRatio * params.scrapWriteOffPenalty;

  const totalCogs =
    directMaterialCost +
    directLaborCost +
    energyAndUtilitiesCost +
    machineDepreciationCost +
    toolingConsumablesCost +
    scrapQualityBurdenCost;

  const grossMarginAmount = params.targetWholesalePricePerUnit - totalCogs;
  const grossMarginPercentage = (grossMarginAmount / params.targetWholesalePricePerUnit) * 100;

  // Daily fixed costs (Overhead + Depreciation for 8-hour shift)
  const dailyFixedOverhead = (params.facilityOverheadPerHour + params.machineDepreciationPerHour) * 8;
  const contributionMarginPerUnit = params.targetWholesalePricePerUnit - (directMaterialCost + toolingConsumablesCost);
  const dailyBreakEvenUnits = Math.ceil(dailyFixedOverhead / Math.max(1, contributionMarginPerUnit));

  // Today's Operating P&L Ledger (in INR / ₹)
  const todayRevenue = completedToday * params.targetWholesalePricePerUnit;
  const todayTotalCogs = completedToday * totalCogs;
  const todayOperatingProfit = todayRevenue - todayTotalCogs;

  const handleSaveParams = (newParams: FinancialParameters) => {
    setParams(newParams);
    try {
      localStorage.setItem('digitwin_financial_params_inr', JSON.stringify(newParams));
    } catch {
      // ignore
    }
  };

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customer || !newOrderForm.partDescription) return;

    const idNumber = workOrders.length + 1;
    const newId = `WO-2026-${String(idNumber).padStart(3, '0')}`;
    const newWO: WorkOrderMRP = {
      id: newId,
      orderNumber: `PO/CUST/${newId}`,
      customer: newOrderForm.customer,
      assemblyPartNumber: 'DT-ASSY-HYD-100',
      partDescription: newOrderForm.partDescription,
      targetQuantity: Number(newOrderForm.targetQuantity) || 100,
      completedQuantity: 0,
      wipQuantity: 0,
      priority: (newOrderForm.priority as any) || 'STANDARD',
      status: 'PLANNED',
      unitTargetPriceInr: Number(newOrderForm.unitTargetPriceInr) || params.targetWholesalePricePerUnit,
      totalContractValueInr: (Number(newOrderForm.targetQuantity) || 100) * (Number(newOrderForm.unitTargetPriceInr) || params.targetWholesalePricePerUnit),
      releasedDate: simulatedDate,
      dueDate: newOrderForm.dueDate || '2026-11-25',
      assignedLine: 'Full Line RM1+RM2+RM3',
      isMaterialAllocated: false,
      notes: 'Custom batch work order added to DigiTwin ERP.',
    };

    const updated = [newWO, ...workOrders];
    setWorkOrders(updated);
    try {
      localStorage.setItem('digitwin_work_orders_inr', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setSelectedWorkOrderId(newId);
    setIsNewOrderModalOpen(false);
    showNotification(`Created Work Order ${newId} for ${newWO.customer}`);
  };

  // Action: Allocate Material for Work Order
  const handleAllocateWorkOrder = (woId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === woId) {
          return {
            ...wo,
            isMaterialAllocated: true,
            status: wo.status === 'PLANNED' ? 'ALLOCATED' : wo.status,
          };
        }
        return wo;
      })
    );

    // Update stock allocation in stockState
    setStockState((prev) => {
      const updated = { ...prev };
      mrpResults.allocationItems.forEach((item) => {
        if (updated[item.partNumber]) {
          updated[item.partNumber] = {
            ...updated[item.partNumber],
            allocated: updated[item.partNumber].allocated + Math.min(item.grossRequirement, updated[item.partNumber].onHand),
          };
        }
      });
      try {
        localStorage.setItem('digitwin_mrp_stock', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    showNotification(`Materials allocated for Work Order ${woId}`);
  };

  // Action: Release Work Order to Shop Floor
  const handleReleaseWorkOrder = (woId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === woId) {
          return {
            ...wo,
            status: 'IN_PRODUCTION',
            isMaterialAllocated: true,
          };
        }
        return wo;
      })
    );
    showNotification(`Work Order ${woId} released to DigiTwin shop floor!`);
  };

  // Action: Auto-Release PO for all shortages
  const handleAutoGeneratePO = () => {
    const shortages = mrpResults.allocationItems.filter((i) => i.netRequirement > 0);
    if (shortages.length === 0) {
      showNotification('No active shortages! Stock buffers are optimal.');
      return;
    }

    setStockState((prev) => {
      const updated = { ...prev };
      shortages.forEach((item) => {
        if (updated[item.partNumber]) {
          updated[item.partNumber] = {
            ...updated[item.partNumber],
            scheduledInflow: updated[item.partNumber].scheduledInflow + item.plannedOrderRelease,
          };
        }
      });
      try {
        localStorage.setItem('digitwin_mrp_stock', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    showNotification(`Generated POs for ${shortages.length} shortage items totaling ${formatIndianCurrency(mrpResults.totalProcurementCostInr)}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-slate-200">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-cyan-400 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-wide">
              ERP Manufacturing Operations & MRP Subsystem
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              INR ₹ Currency
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Department of Mechanical Engineering, IIESTS • Multi-level BOM explosion, inventory allocation, and work order dispatching
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('economics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'economics' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unit Economics & P&L
          </button>
          <button
            onClick={() => setActiveSubTab('work_orders')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'work_orders' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Work Orders ({workOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('mrp_bom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'mrp_bom' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>MRP & Multi-Level BOM</span>
            {mrpResults.criticalShortageCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                {mrpResults.criticalShortageCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'config' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Financial Parameters
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: UNIT ECONOMICS & P&L */}
      {activeSubTab === 'economics' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Target Selling Price</span>
              <strong className="text-lg font-bold text-white font-mono">
                {formatIndianCurrency(params.targetWholesalePricePerUnit)}
              </strong>
              <span className="text-[11px] text-slate-500 block mt-0.5">Wholesale Contract Price / Unit</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Total Unit COGS</span>
              <strong className="text-lg font-bold text-cyan-400 font-mono">
                {formatIndianCurrency(Math.round(totalCogs))}
              </strong>
              <span className="text-[11px] text-slate-500 block mt-0.5">Fully Absorbed Cost of Goods</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Gross Margin / Unit</span>
              <strong className="text-lg font-bold text-emerald-400 font-mono">
                {formatIndianCurrency(Math.round(grossMarginAmount))}
              </strong>
              <span className="text-[11px] text-emerald-400/80 font-mono block mt-0.5">
                {grossMarginPercentage.toFixed(1)}% Gross Margin
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Daily Break-Even Volume</span>
              <strong className="text-lg font-bold text-amber-400 font-mono">
                {dailyBreakEvenUnits} <span className="text-xs font-normal text-slate-400">units/shift</span>
              </strong>
              <span className="text-[11px] text-slate-500 block mt-0.5">To cover fixed plant overhead</span>
            </div>
          </div>

          {/* COGS Breakdown Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Direct Cost of Goods Sold (COGS) Structure (₹ / Unit)
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                100% Total = {formatIndianCurrency(Math.round(totalCogs))}
              </span>
            </div>

            <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-800 border border-slate-700">
              <div
                style={{ width: `${(directMaterialCost / totalCogs) * 100}%` }}
                className="bg-blue-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Materials {((directMaterialCost / totalCogs) * 100).toFixed(0)}%
              </div>
              <div
                style={{ width: `${(directLaborCost / totalCogs) * 100}%` }}
                className="bg-indigo-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Labor
              </div>
              <div
                style={{ width: `${(machineDepreciationCost / totalCogs) * 100}%` }}
                className="bg-cyan-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Machinery
              </div>
              <div
                style={{ width: `${(toolingConsumablesCost / totalCogs) * 100}%` }}
                className="bg-amber-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Tools
              </div>
              <div
                style={{ width: `${(energyAndUtilitiesCost / totalCogs) * 100}%` }}
                className="bg-purple-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Power
              </div>
              <div
                style={{ width: `${(scrapQualityBurdenCost / totalCogs) * 100}%` }}
                className="bg-rose-600 h-full flex items-center justify-center text-[10px] font-bold text-white font-mono"
              >
                Scrap
              </div>
            </div>

            {/* Grid of Components */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>1. Direct Raw Materials</span>
                  <strong className="text-white font-mono">{formatIndianCurrency(directMaterialCost)}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  RM1 Ti Bar ({formatIndianCurrency(params.rm1BarCost)}) + RM2 Casting ({formatIndianCurrency(params.rm2CastingCost)}) + RM3 Plate ({formatIndianCurrency(params.rm3PlateCost)})
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>2. Direct Workforce Labor</span>
                  <strong className="text-indigo-400 font-mono">{formatIndianCurrency(Math.round(directLaborCost))}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeEmployees.length} on-duty staff payroll allocated over cycle output
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>3. Machine Capital Wear</span>
                  <strong className="text-cyan-400 font-mono">{formatIndianCurrency(Math.round(machineDepreciationCost))}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  CNC lathe, milling, and shaping depreciation amortized
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>4. Tooling & Consumables</span>
                  <strong className="text-amber-400 font-mono">{formatIndianCurrency(toolingConsumablesCost)}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Carbide insert indexing and cutting fluid replenishment
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>5. Electricity & Utilities</span>
                  <strong className="text-purple-400 font-mono">{formatIndianCurrency(Math.round(energyAndUtilitiesCost))}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  ₹{params.electricityTariffPerKwh}/kWh HT tariff @ {params.averagePlantPowerKw} kW load
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>6. Scrap Quality Waste</span>
                  <strong className="text-rose-400 font-mono">{formatIndianCurrency(Math.round(scrapQualityBurdenCost))}</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Cost penalty absorbed from condemned QC defect parts
                </div>
              </div>
            </div>
          </div>

          {/* Today's Daily P&L Statement */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Today's Real-Time Operating Financial Statement (Day {simulatedDayCount} • {simulatedDate})</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Net Operating EBITDA: {formatIndianCurrency(Math.round(todayOperatingProfit))}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Gross Revenue Today</span>
                <strong className="text-emerald-400 font-mono text-base block mt-0.5">
                  {formatIndianNumber(todayRevenue)}
                </strong>
                <span className="text-[9px] text-slate-500">{completedToday} units delivered</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Production COGS</span>
                <strong className="text-cyan-400 font-mono text-base block mt-0.5">
                  {formatIndianNumber(Math.round(todayTotalCogs))}
                </strong>
                <span className="text-[9px] text-slate-500">Direct costs absorbed</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Scrap Losses Incurred</span>
                <strong className="text-rose-400 font-mono text-base block mt-0.5">
                  {formatIndianCurrency(Math.round(scrapCountToday * directMaterialCost * params.scrapWriteOffPenalty))}
                </strong>
                <span className="text-[9px] text-slate-500">{scrapCountToday} pieces rejected</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-emerald-900/60 bg-emerald-950/30">
                <span className="text-emerald-300 block text-[10px] font-semibold">Operating Net Income</span>
                <strong className="text-emerald-400 font-mono text-base block mt-0.5">
                  {formatIndianNumber(Math.round(todayOperatingProfit))}
                </strong>
                <span className="text-[9px] text-emerald-400/80 font-mono">
                  {todayRevenue > 0 ? ((todayOperatingProfit / todayRevenue) * 100).toFixed(1) : 0}% Net Margin
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ERP WORK ORDERS DISPATCH BOARD */}
      {activeSubTab === 'work_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Active ERP Production Work Orders (Indian Defence & Aerospace)</h3>
              <p className="text-xs text-slate-400">
                Scheduled batch contracts with live material allocation and shop floor dispatching
              </p>
            </div>
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Order</span>
            </button>
          </div>

          {/* Work Orders Table */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Part / Assembly</th>
                  <th className="py-2.5 px-4">Batch Progress</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Contract Value (₹)</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {workOrders.map((wo) => {
                  const progressPct = Math.round((wo.completedQuantity / wo.targetQuantity) * 100);
                  const isSelected = selectedWorkOrderId === wo.id;
                  return (
                    <tr
                      key={wo.id}
                      onClick={() => setSelectedWorkOrderId(wo.id)}
                      className={`cursor-pointer transition ${isSelected ? 'bg-cyan-950/40 border-l-4 border-cyan-400' : 'hover:bg-slate-900/60'}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {wo.id}
                        <div className="text-[10px] text-slate-500 font-normal">{wo.orderNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{wo.customer}</td>
                      <td className="py-3 px-4 text-slate-200">
                        {wo.partDescription}
                        <div className="text-[10px] text-slate-400 font-mono">{wo.assignedLine}</div>
                      </td>
                      <td className="py-3 px-4 w-44">
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-slate-400">
                            {wo.completedQuantity} / {wo.targetQuantity} units
                          </span>
                          <span className="text-cyan-400 font-bold">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            wo.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : wo.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatIndianNumber(wo.totalContractValueInr)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">{wo.dueDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            wo.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : wo.status === 'IN_PRODUCTION'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-800 animate-pulse'
                              : wo.status === 'ALLOCATED'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {wo.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {!wo.isMaterialAllocated && wo.status === 'PLANNED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAllocateWorkOrder(wo.id);
                            }}
                            className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-500 text-white rounded text-[11px] font-medium transition"
                          >
                            Allocate
                          </button>
                        )}
                        {wo.status === 'ALLOCATED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleaseWorkOrder(wo.id);
                            }}
                            className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition"
                          >
                            Dispatch
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkOrderId(wo.id);
                            setActiveSubTab('mrp_bom');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[11px] font-medium border border-slate-700 transition"
                        >
                          MRP BOM
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MRP & MULTI-LEVEL BOM EXPLOSION */}
      {activeSubTab === 'mrp_bom' && (
        <div className="space-y-6">
          {/* Top Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Target Work Order:</span>
                <select
                  value={selectedWorkOrderId}
                  onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-1 font-mono font-bold"
                >
                  {workOrders.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.id} - {w.customer} ({w.targetQuantity} units)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Selected End Item: <strong className="text-white">{mrpResults.targetOrder?.partDescription}</strong> • Assembly: <strong className="text-cyan-400 font-mono">DT-ASSY-HYD-100</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block">Total Projected PO Cost</span>
                <strong className="text-sm font-mono text-emerald-400 font-bold">
                  {formatIndianCurrency(mrpResults.totalProcurementCostInr)}
                </strong>
              </div>
              <button
                onClick={handleAutoGeneratePO}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Auto-Issue Shortage POs</span>
              </button>
            </div>
          </div>

          {/* Section: Multi-Level Bill of Materials (BOM) Tree Structure */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span>Multi-Level Engineering Bill of Materials (BOM Structure)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">AS9100D Certified Aerospace Configuration</span>
            </div>

            {/* Visual Tree */}
            <div className="space-y-2 text-xs">
              {/* Level 0 */}
              <div className="p-3 bg-slate-900/90 border border-cyan-500/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LEVEL 0
                  </span>
                  <div>
                    <strong className="text-white font-mono text-sm">{MASTER_AEROSPACE_BOM.partNumber}</strong>
                    <div className="text-slate-300">{MASTER_AEROSPACE_BOM.name}</div>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <span className="text-slate-400">Qty: 1 per Unit</span>
                  <div className="text-emerald-400 font-mono font-bold">{formatIndianCurrency(MASTER_AEROSPACE_BOM.unitCostInr)}</div>
                </div>
              </div>

              {/* Children Level 1 & Level 2 */}
              <div className="pl-6 space-y-2 border-l-2 border-slate-800 ml-4">
                {MASTER_AEROSPACE_BOM.children?.map((child) => (
                  <div key={child.partNumber} className="space-y-1.5">
                    {/* Level 1 Node */}
                    <div className="p-2.5 bg-slate-900/70 border border-purple-500/30 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          LEVEL 1
                        </span>
                        <div>
                          <strong className="text-white font-mono text-xs">{child.partNumber}</strong>
                          <div className="text-slate-300 text-[11px]">{child.name}</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px]">
                        <span className="text-slate-400">Line: <span className="font-mono text-purple-300">{child.lineAssignment}</span> • Lead: {child.leadTimeDays}d</span>
                        <div className="text-emerald-400 font-mono">{formatIndianCurrency(child.unitCostInr)}</div>
                      </div>
                    </div>

                    {/* Level 2 Nodes (Raw Materials / Fasteners) */}
                    {child.children && (
                      <div className="pl-6 space-y-1.5 border-l-2 border-slate-800/60 ml-4">
                        {child.children.map((subChild) => (
                          <div
                            key={subChild.partNumber}
                            className="p-2 bg-slate-950/80 border border-slate-800 rounded flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                LEVEL 2 (RAW)
                              </span>
                              <div>
                                <span className="text-slate-300 font-mono font-semibold">{subChild.partNumber}</span>
                                <div className="text-slate-400 text-[10px]">{subChild.name}</div>
                              </div>
                            </div>
                            <div className="text-right text-[10px]">
                              <span className="text-slate-400">Ratio: {subChild.quantityPerParent} {subChild.unitOfMeasure} • Scrap: +{subChild.scrapFactorPercent}%</span>
                              <div className="text-slate-300 font-mono">{formatIndianCurrency(subChild.unitCostInr)} / {subChild.unitOfMeasure}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Live MRP Net Requirements & Inventory Allocation Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-400" />
                  <span>MRP II Net Requirements & Safety Buffer Analysis</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Gross Requirements = Exploded demand • Net = Max(0, Gross - Available - Scheduled + Safety)
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Optimal
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Shortage Detected
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Part # / Description</th>
                    <th className="py-2.5 px-3">Lvl</th>
                    <th className="py-2.5 px-3">Gross Req</th>
                    <th className="py-2.5 px-3">On Hand</th>
                    <th className="py-2.5 px-3">Allocated</th>
                    <th className="py-2.5 px-3">Available (ATP)</th>
                    <th className="py-2.5 px-3">Inflow</th>
                    <th className="py-2.5 px-3">Safety Stock</th>
                    <th className="py-2.5 px-3">Net Req</th>
                    <th className="py-2.5 px-3">Planned Release</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {mrpResults.allocationItems.map((item) => {
                    const isShortage = item.netRequirement > 0;
                    return (
                      <tr key={item.partNumber} className={`hover:bg-slate-900/60 transition ${isShortage ? 'bg-rose-950/20' : ''}`}>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-mono font-bold text-cyan-300">{item.partNumber}</div>
                          <div className="text-[10px] text-slate-400">{item.name}</div>
                          <div className="text-[9px] text-slate-500">{item.supplier}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              item.level === 0 ? 'bg-cyan-900 text-cyan-300' : item.level === 1 ? 'bg-purple-900 text-purple-300' : 'bg-amber-900 text-amber-300'
                            }`}
                          >
                            L{item.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {item.grossRequirement} {item.unitOfMeasure}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{item.onHandStock}</td>
                        <td className="py-2.5 px-3 text-amber-400">{item.allocatedStock}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-400">{item.availableToPromise}</td>
                        <td className="py-2.5 px-3 text-emerald-400">+{item.scheduledInflow}</td>
                        <td className="py-2.5 px-3 text-slate-400">{item.safetyStock}</td>
                        <td className="py-2.5 px-3">
                          <strong className={isShortage ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                            {item.netRequirement}
                          </strong>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300">
                          {item.plannedOrderRelease > 0 ? (
                            <span>
                              {item.plannedOrderRelease} <span className="text-[9px] text-slate-500">by {item.targetReleaseDate}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.actionRequired === 'RELEASE_PO' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              RELEASE PO
                            </span>
                          )}
                          {item.actionRequired === 'EXPEDITE_TRUCK' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              EXPEDITE
                            </span>
                          )}
                          {item.actionRequired === 'IN_PRODUCTION' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              IN WORK
                            </span>
                          )}
                          {item.actionRequired === 'ALLOCATED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              ALLOCATED
                            </span>
                          )}
                          {item.actionRequired === 'NONE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10">
                              OK
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

      {/* SUB-TAB 4: FINANCIAL PARAMETERS CONFIGURATION */}
      {activeSubTab === 'config' && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Financial & Unit Economics Parameter Configuration (Indian Standard ₹)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Adjust wholesale product pricing, raw material supply costs, and machine depreciation rates
              </p>
            </div>
            <button
              onClick={() => handleSaveParams(DEFAULT_FINANCIAL_PARAMS)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Reset Standards</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Target Wholesale Selling Price (₹/Unit)
              </label>
              <input
                type="number"
                min="5000"
                max="200000"
                step="500"
                value={params.targetWholesalePricePerUnit}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    targetWholesalePricePerUnit: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                RM1 Titanium Alloy Bar Stock (₹/Unit)
              </label>
              <input
                type="number"
                min="500"
                max="50000"
                step="100"
                value={params.rm1BarCost}
                onChange={(e) => handleSaveParams({ ...params, rm1BarCost: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                RM2 Aluminum Casting Housing (₹/Unit)
              </label>
              <input
                type="number"
                min="500"
                max="50000"
                step="100"
                value={params.rm2CastingCost}
                onChange={(e) => handleSaveParams({ ...params, rm2CastingCost: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                RM3 Steel Gear Blank (₹/Unit)
              </label>
              <input
                type="number"
                min="200"
                max="30000"
                step="50"
                value={params.rm3PlateCost}
                onChange={(e) => handleSaveParams({ ...params, rm3PlateCost: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Electricity Tariff (₹/kWh) - HT Industrial
              </label>
              <input
                type="number"
                step="0.10"
                min="4.0"
                max="25.0"
                value={params.electricityTariffPerKwh}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    electricityTariffPerKwh: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-purple-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Tooling & Consumables Cost (₹/Unit)
              </label>
              <input
                type="number"
                step="10"
                min="50"
                max="5000"
                value={params.toolingReplacementCostPerUnit}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    toolingReplacementCostPerUnit: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Machinery Depreciation (₹/Hour)
              </label>
              <input
                type="number"
                step="100"
                min="500"
                max="20000"
                value={params.machineDepreciationPerHour}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    machineDepreciationPerHour: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Facility & General Overhead (₹/Hour)
              </label>
              <input
                type="number"
                step="100"
                min="500"
                max="30000"
                value={params.facilityOverheadPerHour}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    facilityOverheadPerHour: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Scrap Waste Penalty Multiplier
              </label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="2.5"
                value={params.scrapWriteOffPenalty}
                onChange={(e) =>
                  handleSaveParams({
                    ...params,
                    scrapWriteOffPenalty: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-rose-300 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Work Order */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Create New ERP Production Work Order</h3>
            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Customer / Agency *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hindustan Aeronautics Limited (HAL)"
                  value={newOrderForm.customer || ''}
                  onChange={(e) => setNewOrderForm((prev) => ({ ...prev, customer: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Part / Assembly Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hydraulic Actuator Assembly"
                  value={newOrderForm.partDescription || ''}
                  onChange={(e) => setNewOrderForm((prev) => ({ ...prev, partDescription: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Batch Target Quantity</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={newOrderForm.targetQuantity || 100}
                    onChange={(e) => setNewOrderForm((prev) => ({ ...prev, targetQuantity: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-cyan-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newOrderForm.priority}
                    onChange={(e) => setNewOrderForm((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Delivery Due Date</label>
                <input
                  type="date"
                  value={newOrderForm.dueDate || '2026-11-20'}
                  onChange={(e) => setNewOrderForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs"
                >
                  Release Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
