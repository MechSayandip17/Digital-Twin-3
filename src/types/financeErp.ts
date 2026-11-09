export interface FinancialParameters {
  // Selling Price
  targetWholesalePricePerUnit: number; // e.g. $485.00

  // Direct Raw Material Costs
  rm1BarCost: number; // e.g. $45.00 per bar
  rm2CastingCost: number; // e.g. $52.00 per casting housing
  rm3PlateCost: number; // e.g. $28.00 per plate

  // Energy & Utility Rates
  electricityTariffPerKwh: number; // e.g. $0.14 / kWh
  averagePlantPowerKw: number; // e.g. 185 kW

  // Capital & Operational Overheads
  machineDepreciationPerHour: number; // e.g. $48.00 / operating hour
  facilityOverheadPerHour: number; // e.g. $65.00 / facility operating hour
  toolingReplacementCostPerUnit: number; // e.g. $6.50 / unit

  // Defect Penalty multiplier
  scrapWriteOffPenalty: number; // 1.2x raw material value lost
}

export interface UnitEconomicsBreakdown {
  directMaterialCost: number;
  directLaborCost: number;
  energyAndUtilitiesCost: number;
  machineDepreciationCost: number;
  toolingConsumablesCost: number;
  scrapQualityBurdenCost: number;
  totalCogs: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
  dailyBreakEvenUnits: number;
}

export type WorkOrderStatus = 'PLANNED' | 'RELEASED' | 'IN_PRODUCTION' | 'COMPLETED' | 'ON_HOLD';
export type WorkOrderPriority = 'ROUTINE' | 'STANDARD' | 'HIGH' | 'CRITICAL';

export interface WorkOrder {
  id: string; // e.g. "WO-8401"
  customer: string;
  partDescription: string;
  targetQuantity: number;
  completedQuantity: number;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  unitTargetPrice: number;
  releasedDate: string;
  dueDate: string;
}

export interface MaterialInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'RAW_MATERIAL' | 'SUBASSEMBLY' | 'FINISHED_GOODS' | 'CONSUMABLE';
  currentStock: number;
  unitOfMeasure: string;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  unitCost: number;
  totalValuation: number;
  supplier: string;
  status: 'OPTIMAL' | 'ADEQUATE' | 'REORDER_REQUIRED' | 'CRITICAL_SHORTAGE';
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-2026-104"
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'PENDING_APPROVAL' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED';
}

export interface DailyFinancialLedger {
  day: number;
  dateStr: string;
  unitsShipped: number;
  grossRevenue: number;
  cogsMaterial: number;
  cogsLabor: number;
  cogsOverheadEnergy: number;
  scrapLossExpense: number;
  totalOperatingCost: number;
  operatingGrossProfit: number;
  profitMarginPercent: number;
}

export const DEFAULT_FINANCIAL_PARAMS: FinancialParameters = {
  targetWholesalePricePerUnit: 38500.0, // ₹38,500 per finished aerospace gearbox assembly
  rm1BarCost: 3850.0, // ₹3,850 per titanium alloy bar stock
  rm2CastingCost: 4400.0, // ₹4,400 per cast housing
  rm3PlateCost: 2350.0, // ₹2,350 per alloy plate
  electricityTariffPerKwh: 8.50, // ₹8.50 / kWh (Indian Industrial HT-1 tariff)
  averagePlantPowerKw: 145.0,
  machineDepreciationPerHour: 3200.0, // ₹3,200 / hr
  facilityOverheadPerHour: 4500.0, // ₹4,500 / hr
  toolingReplacementCostPerUnit: 520.0, // ₹520 / unit
  scrapWriteOffPenalty: 1.25,
};

export const DEFAULT_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-8401',
    customer: 'Hindustan Aeronautics Limited (HAL)',
    partDescription: 'Aerospace Hypoid Gearbox Actuator Assembly',
    targetQuantity: 120,
    completedQuantity: 42,
    priority: 'CRITICAL',
    status: 'IN_PRODUCTION',
    unitTargetPrice: 38500.0,
    releasedDate: '2026-11-01',
    dueDate: '2026-11-06',
  },
  {
    id: 'WO-8402',
    customer: 'ISRO Satellite Propulsion Directorate',
    partDescription: 'Titanium Servo Housing Block (RM2)',
    targetQuantity: 80,
    completedQuantity: 0,
    priority: 'HIGH',
    status: 'RELEASED',
    unitTargetPrice: 28400.0,
    releasedDate: '2026-11-03',
    dueDate: '2026-11-09',
  },
  {
    id: 'WO-8403',
    customer: 'Tata Advanced Systems Limited (TASL)',
    partDescription: 'Turbine Rotor Flange Shaft (RM1 Machined)',
    targetQuantity: 60,
    completedQuantity: 60,
    priority: 'STANDARD',
    status: 'COMPLETED',
    unitTargetPrice: 31200.0,
    releasedDate: '2026-10-28',
    dueDate: '2026-11-04',
  },
  {
    id: 'WO-8404',
    customer: 'Bharat Forge Aerospace & Defence',
    partDescription: 'Planetary Satellite Gear Blanks (RM3)',
    targetQuantity: 150,
    completedQuantity: 15,
    priority: 'ROUTINE',
    status: 'IN_PRODUCTION',
    unitTargetPrice: 18500.0,
    releasedDate: '2026-11-04',
    dueDate: '2026-11-12',
  },
];

export const DEFAULT_INVENTORY: MaterialInventoryItem[] = [
  {
    id: 'inv-rm1',
    sku: 'MAT-RM1-TI4V',
    name: 'Titanium Ti-6Al-4V Round Alloy Bar (Ø 85mm)',
    category: 'RAW_MATERIAL',
    currentStock: 340,
    unitOfMeasure: 'bars',
    reorderPoint: 150,
    safetyStock: 80,
    leadTimeDays: 4,
    unitCost: 3850.0,
    totalValuation: 1309000.0,
    supplier: 'Mishra Dhatu Nigam (MIDHANI)',
    status: 'OPTIMAL',
  },
  {
    id: 'inv-rm2',
    sku: 'MAT-RM2-A380',
    name: 'Cast Aluminum Gearbox Housing Pre-forms',
    category: 'RAW_MATERIAL',
    currentStock: 185,
    unitOfMeasure: 'castings',
    reorderPoint: 120,
    safetyStock: 60,
    leadTimeDays: 5,
    unitCost: 4400.0,
    totalValuation: 814000.0,
    supplier: 'Bharat Forge Precision Castings',
    status: 'ADEQUATE',
  },
  {
    id: 'inv-rm3',
    sku: 'MAT-RM3-4140',
    name: 'AISI 4140 Alloy Steel Gear Disc Blanks',
    category: 'RAW_MATERIAL',
    currentStock: 95,
    unitOfMeasure: 'plates',
    reorderPoint: 110,
    safetyStock: 50,
    leadTimeDays: 3,
    unitCost: 2350.0,
    totalValuation: 223250.0,
    supplier: 'Tata Steel Special Alloy Division',
    status: 'REORDER_REQUIRED',
  },
  {
    id: 'inv-wip',
    sku: 'WIP-LINE-ACTIVE',
    name: 'Work-In-Progress (Active Machining & Conveyor Buffer)',
    category: 'SUBASSEMBLY',
    currentStock: 48,
    unitOfMeasure: 'units',
    reorderPoint: 0,
    safetyStock: 0,
    leadTimeDays: 0,
    unitCost: 12400.0,
    totalValuation: 595200.0,
    supplier: 'Internal Production Line',
    status: 'OPTIMAL',
  },
  {
    id: 'inv-fg',
    sku: 'FG-AERO-HYPOID',
    name: 'Finished Goods: Completed Aerospace Hypoid Gearboxes',
    category: 'FINISHED_GOODS',
    currentStock: 54,
    unitOfMeasure: 'packaged units',
    reorderPoint: 20,
    safetyStock: 10,
    leadTimeDays: 1,
    unitCost: 18200.0,
    totalValuation: 982800.0,
    supplier: 'DigiTwin Plant IIESTS',
    status: 'OPTIMAL',
  },
];
