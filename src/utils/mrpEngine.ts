/**
 * DigiTwin Manufacturing Resource Planning (MRP II) & Multi-Level BOM Engine
 * Certified for Aerospace & Precision Manufacturing (AS9100D / ISO 9001)
 * Department of Mechanical Engineering, IIESTS
 */

export interface BOMNode {
  partNumber: string;
  name: string;
  level: number; // 0: Top Assembly, 1: Sub-Assembly / Machined Component, 2: Raw Material / Fastener
  lineAssignment?: 'RM1' | 'RM2' | 'RM3' | 'MERGE' | 'FINAL';
  quantityPerParent: number;
  scrapFactorPercent: number; // e.g. 5% machining allowance
  unitOfMeasure: string;
  leadTimeDays: number;
  unitCostInr: number;
  supplierOrShop: string;
  specification: string;
  children?: BOMNode[];
}

export interface MRPAllocationItem {
  partNumber: string;
  name: string;
  level: number;
  line: string;
  unitOfMeasure: string;
  grossRequirement: number;
  onHandStock: number;
  allocatedStock: number;
  availableToPromise: number; // On Hand - Allocated
  scheduledInflow: number; // Arriving on current shift trucks
  safetyStock: number;
  netRequirement: number; // Max(0, Gross - Available - Scheduled + Safety)
  plannedOrderRelease: number;
  actionRequired: 'NONE' | 'RELEASE_PO' | 'EXPEDITE_TRUCK' | 'IN_PRODUCTION' | 'ALLOCATED';
  unitCostInr: number;
  totalCostInr: number;
  leadTimeDays: number;
  targetReleaseDate: string;
  supplier: string;
}

export interface WorkOrderMRP {
  id: string; // e.g. "WO-2026-001"
  orderNumber: string;
  customer: string;
  assemblyPartNumber: string;
  partDescription: string;
  targetQuantity: number;
  completedQuantity: number;
  wipQuantity: number;
  priority: 'ROUTINE' | 'STANDARD' | 'HIGH' | 'CRITICAL';
  status: 'PLANNED' | 'ALLOCATED' | 'RELEASED' | 'IN_PRODUCTION' | 'COMPLETED' | 'ON_HOLD';
  unitTargetPriceInr: number;
  totalContractValueInr: number;
  releasedDate: string;
  dueDate: string;
  assignedLine: string;
  isMaterialAllocated: boolean;
  notes?: string;
}

// Master Multi-Level Bill of Materials (BOM)
export const MASTER_AEROSPACE_BOM: BOMNode = {
  partNumber: 'DT-ASSY-HYD-100',
  name: 'Aerospace Electro-Hydraulic Actuator Assembly',
  level: 0,
  lineAssignment: 'FINAL',
  quantityPerParent: 1,
  scrapFactorPercent: 0,
  unitOfMeasure: 'Units',
  leadTimeDays: 1,
  unitCostInr: 38500,
  supplierOrShop: 'DigiTwin Final Assembly & Test Bay',
  specification: 'MIL-STD-810G / AS9100D Certified',
  children: [
    {
      partNumber: 'DT-SUB-SPOOL-01',
      name: 'Precision Hydraulic Spool (RM1 Machined)',
      level: 1,
      lineAssignment: 'RM1',
      quantityPerParent: 1,
      scrapFactorPercent: 3,
      unitOfMeasure: 'Pcs',
      leadTimeDays: 2,
      unitCostInr: 5800,
      supplierOrShop: 'CNC Lathe Cell #1',
      specification: 'Roughness Ra ≤ 0.20µm, Cylindricity 0.005mm',
      children: [
        {
          partNumber: 'RAW-RM1-TI4V',
          name: 'Grade 5 Titanium Bar Stock (Ti-6Al-4V Ø45mm)',
          level: 2,
          lineAssignment: 'RM1',
          quantityPerParent: 1.05,
          scrapFactorPercent: 5,
          unitOfMeasure: 'Bars',
          leadTimeDays: 4,
          unitCostInr: 3850,
          supplierOrShop: 'Mishra Dhatu Nigam (MIDHANI)',
          specification: 'AMS 4928 Heat Melt Certified',
        },
      ],
    },
    {
      partNumber: 'DT-SUB-SLEEVE-02',
      name: 'Actuator Valve Sleeve Housing (RM2 Machined)',
      level: 1,
      lineAssignment: 'RM2',
      quantityPerParent: 1,
      scrapFactorPercent: 4,
      unitOfMeasure: 'Pcs',
      leadTimeDays: 2,
      unitCostInr: 6400,
      supplierOrShop: 'CNC 5-Axis Milling Cell #2',
      specification: 'Bore Tolerance H7 (+0.012/-0mm)',
      children: [
        {
          partNumber: 'RAW-RM2-AL7075',
          name: 'Aerospace Aluminum Cast Preforms (Al 7075-T6)',
          level: 2,
          lineAssignment: 'RM2',
          quantityPerParent: 1.04,
          scrapFactorPercent: 4,
          unitOfMeasure: 'Castings',
          leadTimeDays: 5,
          unitCostInr: 4400,
          supplierOrShop: 'Bharat Forge Precision Castings',
          specification: 'QQ-A-250/12 Ultrasonic Inspected',
        },
      ],
    },
    {
      partNumber: 'DT-SUB-FLANGE-03',
      name: 'High-Strength Mounting Flange (RM3 Machined)',
      level: 1,
      lineAssignment: 'RM3',
      quantityPerParent: 1,
      scrapFactorPercent: 2,
      unitOfMeasure: 'Pcs',
      leadTimeDays: 2,
      unitCostInr: 4100,
      supplierOrShop: 'CNC Shaping & Broaching Cell #3',
      specification: 'Hardness 48-52 HRC Case Carburized',
      children: [
        {
          partNumber: 'RAW-RM3-STL4340',
          name: 'AISI 4340 Alloy Steel Plate Blanks',
          level: 2,
          lineAssignment: 'RM3',
          quantityPerParent: 1.03,
          scrapFactorPercent: 3,
          unitOfMeasure: 'Plates',
          leadTimeDays: 3,
          unitCostInr: 2350,
          supplierOrShop: 'Tata Steel Special Alloy Division',
          specification: 'AMS 6415 Hardened & Tempered',
        },
      ],
    },
    {
      partNumber: 'DT-KIT-FASTENERS-04',
      name: 'Aerospace Seal & Fastener Sub-Kit',
      level: 1,
      lineAssignment: 'MERGE',
      quantityPerParent: 1,
      scrapFactorPercent: 1,
      unitOfMeasure: 'Kits',
      leadTimeDays: 1,
      unitCostInr: 1650,
      supplierOrShop: 'Converge / 3-Way Joining Station',
      specification: 'Aerospace Hardware Flight Qualified',
      children: [
        {
          partNumber: 'COM-SEAL-VITON',
          name: 'Viton Fluoropolymer Hydraulic O-Rings (-40°C to +200°C)',
          level: 2,
          lineAssignment: 'MERGE',
          quantityPerParent: 4,
          scrapFactorPercent: 2,
          unitOfMeasure: 'Rings',
          leadTimeDays: 2,
          unitCostInr: 120,
          supplierOrShop: 'Parker Aerospace Seals India',
          specification: 'MIL-G-21569 Class 1',
        },
        {
          partNumber: 'COM-BOLT-TI-M6',
          name: 'Titanium M6×25mm 12-Point Socket Bolts',
          level: 2,
          lineAssignment: 'MERGE',
          quantityPerParent: 8,
          scrapFactorPercent: 2,
          unitOfMeasure: 'Bolts',
          leadTimeDays: 3,
          unitCostInr: 95,
          supplierOrShop: 'Sundram Fasteners Aerospace Div',
          specification: 'NAS 1351 High-Torque',
        },
        {
          partNumber: 'COM-RING-CIRCLIP',
          name: 'Stainless Steel Internal Retaining Circlips (Ø32mm)',
          level: 2,
          lineAssignment: 'MERGE',
          quantityPerParent: 2,
          scrapFactorPercent: 1,
          unitOfMeasure: 'Clips',
          leadTimeDays: 2,
          unitCostInr: 65,
          supplierOrShop: 'Precision Circlips Ltd',
          specification: 'DIN 472 Stainless Spring Steel',
        },
      ],
    },
  ],
};

// Default Work Orders configured for Indian Aerospace & Defence Contracts
export const DEFAULT_DIGITWIN_WORK_ORDERS: WorkOrderMRP[] = [
  {
    id: 'WO-2026-001',
    orderNumber: 'HAL/LCH-ACT/2026/041',
    customer: 'Hindustan Aeronautics Limited (HAL)',
    assemblyPartNumber: 'DT-ASSY-HYD-100',
    partDescription: 'Light Combat Helicopter (LCH) Swashplate Hydraulic Actuator',
    targetQuantity: 120,
    completedQuantity: 42,
    wipQuantity: 18,
    priority: 'CRITICAL',
    status: 'IN_PRODUCTION',
    unitTargetPriceInr: 38500,
    totalContractValueInr: 4620000,
    releasedDate: '2026-11-01',
    dueDate: '2026-11-10',
    assignedLine: 'Full Line RM1+RM2+RM3',
    isMaterialAllocated: true,
    notes: 'Defence Priority: High-altitude flight trials scheduled at Leh/Ladakh.',
  },
  {
    id: 'WO-2026-002',
    orderNumber: 'ISRO/GSLV-SRV/2026/118',
    customer: 'ISRO Liquid Propulsion Systems Centre (LPSC)',
    assemblyPartNumber: 'DT-ASSY-HYD-100',
    partDescription: 'GSLV Mk-III Gimbal Thrust Vector Control Servo Actuator',
    targetQuantity: 80,
    completedQuantity: 0,
    wipQuantity: 0,
    priority: 'HIGH',
    status: 'ALLOCATED',
    unitTargetPriceInr: 44200,
    totalContractValueInr: 3536000,
    releasedDate: '2026-11-04',
    dueDate: '2026-11-18',
    assignedLine: 'Full Line RM1+RM2+RM3',
    isMaterialAllocated: true,
    notes: 'Cryogenic Stage compatibility: 100% helium leak test mandatory.',
  },
  {
    id: 'WO-2026-003',
    orderNumber: 'TASL/A320-FLG/2026/089',
    customer: 'Tata Advanced Systems Limited (TASL)',
    assemblyPartNumber: 'DT-SUB-SPOOL-01',
    partDescription: 'Commercial Jet Flap Transmission Titanium Spool Pinion',
    targetQuantity: 150,
    completedQuantity: 0,
    wipQuantity: 0,
    priority: 'STANDARD',
    status: 'PLANNED',
    unitTargetPriceInr: 12500,
    totalContractValueInr: 1875000,
    releasedDate: '2026-11-08',
    dueDate: '2026-11-25',
    assignedLine: 'Line RM1 (CNC Lathe)',
    isMaterialAllocated: false,
    notes: 'Export standard packaging with vapor corrosion inhibitor (VCI).',
  },
  {
    id: 'WO-2026-004',
    orderNumber: 'DRDO/ADE-UAV/2026/005',
    customer: 'DRDO Aeronautical Development Establishment (ADE)',
    assemblyPartNumber: 'DT-ASSY-HYD-100',
    partDescription: 'Stealth UCAV Rudder Precision Linear Servo Ram',
    targetQuantity: 60,
    completedQuantity: 60,
    wipQuantity: 0,
    priority: 'HIGH',
    status: 'COMPLETED',
    unitTargetPriceInr: 42000,
    totalContractValueInr: 2520000,
    releasedDate: '2026-10-24',
    dueDate: '2026-11-02',
    assignedLine: 'Full Line RM1+RM2+RM3',
    isMaterialAllocated: true,
    notes: 'Lot fully accepted with zero dimensional non-conformances.',
  },
];

// Current Physical Stock and Safety Stock Data
export interface LivePhysicalInventoryStock {
  [partNumber: string]: {
    onHand: number;
    allocated: number;
    scheduledInflow: number;
    safetyStock: number;
  };
}

export const INITIAL_PHYSICAL_STOCK: LivePhysicalInventoryStock = {
  'DT-ASSY-HYD-100': { onHand: 54, allocated: 0, scheduledInflow: 0, safetyStock: 20 },
  'DT-SUB-SPOOL-01': { onHand: 24, allocated: 15, scheduledInflow: 10, safetyStock: 12 },
  'DT-SUB-SLEEVE-02': { onHand: 18, allocated: 12, scheduledInflow: 8, safetyStock: 10 },
  'DT-SUB-FLANGE-03': { onHand: 30, allocated: 18, scheduledInflow: 12, safetyStock: 15 },
  'DT-KIT-FASTENERS-04': { onHand: 85, allocated: 30, scheduledInflow: 50, safetyStock: 25 },
  'RAW-RM1-TI4V': { onHand: 280, allocated: 126, scheduledInflow: 120, safetyStock: 80 },
  'RAW-RM2-AL7075': { onHand: 195, allocated: 83, scheduledInflow: 120, safetyStock: 60 },
  'RAW-RM3-STL4340': { onHand: 140, allocated: 62, scheduledInflow: 120, safetyStock: 50 },
  'COM-SEAL-VITON': { onHand: 720, allocated: 320, scheduledInflow: 400, safetyStock: 200 },
  'COM-BOLT-TI-M6': { onHand: 1450, allocated: 640, scheduledInflow: 800, safetyStock: 400 },
  'COM-RING-CIRCLIP': { onHand: 510, allocated: 160, scheduledInflow: 200, safetyStock: 150 },
};

/**
 * Explodes the Bill of Materials for a given target production quantity
 * and computes Net Requirements, Shortages, and Planned PO Releases.
 */
export function calculateMRPRequirements(
  targetWorkOrderId: string,
  workOrders: WorkOrderMRP[],
  stockState: LivePhysicalInventoryStock
): {
  targetOrder: WorkOrderMRP | undefined;
  allocationItems: MRPAllocationItem[];
  totalProcurementCostInr: number;
  criticalShortageCount: number;
} {
  const targetOrder = workOrders.find((w) => w.id === targetWorkOrderId) || workOrders[0];
  const requiredQty = targetOrder ? Math.max(0, targetOrder.targetQuantity - targetOrder.completedQuantity) : 100;

  const resultItems: MRPAllocationItem[] = [];

  // Recursive BOM Traversal
  function traverse(node: BOMNode, multiplier: number, currentLevel: number) {
    const totalRequired = Math.ceil(multiplier * node.quantityPerParent * (1 + node.scrapFactorPercent / 100));
    const stockInfo = stockState[node.partNumber] || {
      onHand: 100,
      allocated: 0,
      scheduledInflow: 50,
      safetyStock: 20,
    };

    const atp = Math.max(0, stockInfo.onHand - stockInfo.allocated);
    const netReq = Math.max(0, totalRequired - (atp + stockInfo.scheduledInflow) + stockInfo.safetyStock);
    const plannedRelease = netReq > 0 ? Math.ceil(netReq / 10) * 10 : 0; // Lot size batching (multiple of 10)

    let action: MRPAllocationItem['actionRequired'] = 'NONE';
    if (netReq > 0) {
      action = node.level === 2 ? 'RELEASE_PO' : 'EXPEDITE_TRUCK';
    } else if (targetOrder?.status === 'IN_PRODUCTION') {
      action = 'IN_PRODUCTION';
    } else if (targetOrder?.isMaterialAllocated) {
      action = 'ALLOCATED';
    }

    // Today's date helper for lead-time release scheduling
    const today = new Date('2026-11-04');
    const releaseDate = new Date(today);
    releaseDate.setDate(releaseDate.getDate() + node.leadTimeDays);
    const releaseDateStr = releaseDate.toISOString().split('T')[0];

    resultItems.push({
      partNumber: node.partNumber,
      name: node.name,
      level: currentLevel,
      line: node.lineAssignment || 'SHOP',
      unitOfMeasure: node.unitOfMeasure,
      grossRequirement: totalRequired,
      onHandStock: stockInfo.onHand,
      allocatedStock: stockInfo.allocated,
      availableToPromise: atp,
      scheduledInflow: stockInfo.scheduledInflow,
      safetyStock: stockInfo.safetyStock,
      netRequirement: netReq,
      plannedOrderRelease: plannedRelease,
      actionRequired: action,
      unitCostInr: node.unitCostInr,
      totalCostInr: plannedRelease * node.unitCostInr,
      leadTimeDays: node.leadTimeDays,
      targetReleaseDate: releaseDateStr,
      supplier: node.supplierOrShop,
    });

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => traverse(child, totalRequired, currentLevel + 1));
    }
  }

  traverse(MASTER_AEROSPACE_BOM, requiredQty, 0);

  const totalProcurementCostInr = resultItems.reduce((acc, item) => acc + item.totalCostInr, 0);
  const criticalShortageCount = resultItems.filter((i) => i.netRequirement > 0).length;

  return {
    targetOrder,
    allocationItems: resultItems,
    totalProcurementCostInr,
    criticalShortageCount,
  };
}
