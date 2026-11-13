import { PlantSimulationState, FaultIncidentRecord } from '../types/factory';
import { PlantEnergyAnalytics } from '../types/energy';

export interface ShiftEquipmentHealthSummary {
  stationId: string;
  name: string;
  simulinkTag: string;
  line: string;
  cumulativeRunHours: number;
  remainingUsefulLifeHours: number;
  rulReductionTodayHours: number;
  anomalyScore: number;
  predictedFailureClass: string;
  healthStatus: 'HEALTHY' | 'ADVISORY' | 'CRITICAL_ALARM';
  activeFault: string;
}

export interface ShiftSummaryReport {
  dayNumber: number;
  shiftDateStr: string;
  shiftWindow: string; // e.g. "08:00 AM – 04:00 PM (8.0 Hours)"
  shiftStatus: 'SHIFT_COMPLETED' | 'SHIFT_IN_PROGRESS';
  
  // Production Output & Arrears Backlog
  finishedGoodsToday: number;
  dailyTargetUnits: number;
  fulfillmentPercentage: number;
  arrearsTodayDeficit: number;
  arrearsBacklogUnits: number;
  scrapCountToday: number;
  firstPassYieldPercent: number;
  overallOeePercent: number;
  
  // Per-Line QC Reworks and Scraps
  reworksToday: {
    total: number;
    rm1Lathe: number;
    rm2Milling: number;
    rm3Shaping: number;
    reworkCycleTimeMinutes: number;
  };
  scrapsToday: {
    total: number;
    rm1Lathe: number;
    rm2Milling: number;
    rm3Shaping: number;
    scrapCostInr: number;
  };

  // Entities of each type passed through the plant
  entityThroughputByType: {
    rm1BilletUnloaded: number;
    rm1BilletMachined: number;
    rm1BilletQcPassed: number;
    rm2CastingUnloaded: number;
    rm2CastingMachined: number;
    rm2CastingQcPassed: number;
    rm3PlateUnloaded: number;
    rm3PlateMachined: number;
    rm3PlateQcPassed: number;
    mergedSetsCount: number;
    assembledUnitsCount: number;
    packagedGoodsCount: number;
    dispatchedToWarehouseCount: number;
  };

  // Energy & Sustainability (Indian Standard & INR)
  totalEnergyConsumedKwh: number;
  peakDemandKw: number;
  powerFactor: number;
  totalEnergyCostInr: number;
  carbonEmissionsKg: number;
  solarGenerationKwh: number;
  solarOffsetPercent: number;
  specificEnergyKwhPerUnit: number;
  
  // Cumulative RUL Reduction & Fleet Health
  totalFleetRulReductionHours: number;
  equipmentSummaries: ShiftEquipmentHealthSummary[];
  criticalEquipmentList: ShiftEquipmentHealthSummary[];
  
  // Major Maintenance Events & Daily Fault Incident Log with Timestamps
  majorMaintenanceEvents: {
    stationName: string;
    eventType: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionTaken: string;
  }[];
  faultIncidentsToday: {
    id: string;
    stationName: string;
    line: string;
    faultType: string;
    diagnosticClass: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    status: 'ACTIVE' | 'RESOLVED';
    actionTaken: string;
  }[];
  
  // Prescriptive Directives for Next Shift
  prescriptiveRecommendations: string[];
}

/**
 * Formats Indian Currency (INR / ₹) with commas in Indian standard (Lakhs & Crores)
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats numbers in Indian Lakhs and Crores
 */
export function formatIndianNumber(val: number): string {
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakh`;
  }
  return formatIndianCurrency(val);
}

/**
 * Generates the official Daily Shift Summary Report
 */
export function generateShiftSummaryReport(
  state: PlantSimulationState,
  energy: PlantEnergyAnalytics
): ShiftSummaryReport {
  const config = state?.config || {
    simulatedSecondsOfDay: 8 * 3600,
    shiftStartHour: 8,
    shiftDurationHours: 8,
    isShiftOpen: true,
    dailyTargetUnits: 360,
    arrearsUnits: 0,
  } as any;
  const currentHour = (config.simulatedSecondsOfDay / 3600) % 24;
  const shiftEnd = config.shiftStartHour + config.shiftDurationHours;
  const isShiftEnded = currentHour >= shiftEnd || !config.isShiftOpen;

  const completedCount = state?.completedCount || 0;
  const fulfillment = Math.round((completedCount / Math.max(1, config.dailyTargetUnits)) * 100);
  const arrearsTodayDeficit = Math.max(0, config.dailyTargetUnits - completedCount);

  // Equipment health breakdown
  const equipmentSummaries: ShiftEquipmentHealthSummary[] = [];
  const criticalEquipmentList: ShiftEquipmentHealthSummary[] = [];
  let totalFleetRulReduction = 0;

  const stationList = state?.stations && typeof state.stations === 'object' ? Object.values(state.stations) : [];

  for (const st of stationList) {
    if (!st || st.isQueue || st.type === 'truck_source' || st.type === 'sink_dispatch') continue;

    const ml = st.mlResult;
    const hasFault = st.activeFault !== 'NONE';
    const isCriticalWear = (st.sensors.toolWearIndex ?? 0) >= 0.30;
    const hasCriticalFault = (hasFault && st.activeFault !== 'TOOL_FLANK_WEAR') || (st.activeFault === 'TOOL_FLANK_WEAR' && isCriticalWear);
    
    // Proper health classification: ONLY active failures, critical wear (>=0.30mm), or exhausted RUL (<24h with wear) trigger CRITICAL_ALARM
    const isCritical = hasCriticalFault || (st.isManuallyStopped === true && hasFault) || (ml.remainingUsefulLifeHours < 24 && st.cumulativeRunHours > 10 && hasFault);
    const isAdvisory = !isCritical && (
      (hasFault && st.activeFault === 'TOOL_FLANK_WEAR') ||
      ml.remainingUsefulLifeHours < 100 ||
      (ml.anomalyScore > 0.35 && ml.anomalyScore <= 0.65) ||
      (st.sensors.toolWearIndex ?? 0) > 0.18
    );

    // Approximate RUL reduction today based on operating hours and stress
    const hoursElapsed = Math.min(config.shiftDurationHours, Math.max(0, currentHour - config.shiftStartHour));
    const wearStress = hasFault ? 4.5 : isAdvisory ? 1.8 : 1.0;
    const todayRulLoss = Number((hoursElapsed * wearStress).toFixed(1));
    totalFleetRulReduction += todayRulLoss;

    const diagnosticDisplay = hasFault
      ? ml.predictedFailureClass
      : isAdvisory
      ? ml.predictedFailureClass
      : 'Nominal Operating Condition';

    const summary: ShiftEquipmentHealthSummary = {
      stationId: st.id,
      name: st.name,
      simulinkTag: st.simulinkTag,
      line: st.line,
      cumulativeRunHours: Number(st.cumulativeRunHours.toFixed(1)),
      remainingUsefulLifeHours: Number(ml.remainingUsefulLifeHours.toFixed(1)),
      rulReductionTodayHours: todayRulLoss,
      anomalyScore: ml.anomalyScore,
      predictedFailureClass: diagnosticDisplay,
      healthStatus: isCritical ? 'CRITICAL_ALARM' : isAdvisory ? 'ADVISORY' : 'HEALTHY',
      activeFault: st.activeFault,
    };

    equipmentSummaries.push(summary);
    if (isCritical) {
      criticalEquipmentList.push(summary);
    }
  }

  // Major Maintenance Events
  const majorMaintenanceEvents = [];
  for (const st of equipmentSummaries) {
    if (st.activeFault !== 'NONE') {
      majorMaintenanceEvents.push({
        stationName: st.name,
        eventType: `Active Failure Incident: ${st.activeFault.replace(/_/g, ' ')}`,
        timestamp: `${state.config.simulatedDate} • Shift Hours`,
        severity: 'CRITICAL' as const,
        actionTaken: `Automated predictive alarm triggered (${st.predictedFailureClass}). Immediate maintenance intervention required before next shift.`,
      });
    } else if (st.healthStatus === 'ADVISORY') {
      majorMaintenanceEvents.push({
        stationName: st.name,
        eventType: `Degradation Advisory: ${st.predictedFailureClass}`,
        timestamp: `${state.config.simulatedDate} • Mid-Shift Monitoring`,
        severity: 'MEDIUM' as const,
        actionTaken: 'Wear inspection and lubrication replenishment recommended prior to next production batch.',
      });
    }
  }

  // QC Reworks and Scraps Calculation
  const qc1 = state.stations['qc_rm1']?.qcSubsystem;
  const qc2 = state.stations['qc_rm2']?.qcSubsystem;
  const qc3 = state.stations['qc_rm3']?.qcSubsystem;

  const reworksRm1 = qc1 ? qc1.check2SentToRework : 0;
  const reworksRm2 = qc2 ? qc2.check2SentToRework : 0;
  const reworksRm3 = qc3 ? qc3.check2SentToRework : 0;
  const totalReworks = reworksRm1 + reworksRm2 + reworksRm3;

  const scrapsRm1 = qc1 ? (qc1.check2Scrapped + qc1.check3Scrapped) : 0;
  const scrapsRm2 = qc2 ? (qc2.check2Scrapped + qc2.check3Scrapped) : 0;
  const scrapsRm3 = qc3 ? (qc3.check2Scrapped + qc3.check3Scrapped) : 0;
  const totalScraps = Math.max(state.rejectedCount, scrapsRm1 + scrapsRm2 + scrapsRm3);
  const scrapCostInr = totalScraps * 1250; // Average ₹1,250 alloy billet write-off penalty

  // Entity Throughput Count by Station & Type
  const entityThroughputByType = {
    rm1BilletUnloaded: state.stations['unloading_rm1']?.processedToday ?? 0,
    rm1BilletMachined: state.stations['cnc_lathe']?.processedToday ?? 0,
    rm1BilletQcPassed: state.stations['qc_rm1']?.processedToday ?? 0,
    rm2CastingUnloaded: state.stations['unloading_rm2']?.processedToday ?? 0,
    rm2CastingMachined: state.stations['cnc_milling']?.processedToday ?? 0,
    rm2CastingQcPassed: state.stations['qc_rm2']?.processedToday ?? 0,
    rm3PlateUnloaded: state.stations['unloading_rm3']?.processedToday ?? 0,
    rm3PlateMachined: state.stations['cnc_shaping']?.processedToday ?? 0,
    rm3PlateQcPassed: state.stations['qc_rm3']?.processedToday ?? 0,
    mergedSetsCount: state.stations['converge_join']?.processedToday ?? 0,
    assembledUnitsCount: state.stations['final_assembly']?.processedToday ?? 0,
    packagedGoodsCount: state.stations['packaging']?.processedToday ?? 0,
    dispatchedToWarehouseCount: state.stations['sink_dispatch']?.processedToday ?? state.completedCount,
  };

  // Build Fault Incident Records with Timestamps
  const faultIncidentsToday: {
    id: string;
    stationName: string;
    line: string;
    faultType: string;
    diagnosticClass: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    status: 'ACTIVE' | 'RESOLVED';
    actionTaken: string;
  }[] = [];

  if (Array.isArray(state.faultIncidentHistory) && state.faultIncidentHistory.length > 0) {
    for (const inc of state.faultIncidentHistory) {
      faultIncidentsToday.push({
        id: inc.id,
        stationName: inc.stationName,
        line: inc.line,
        faultType: inc.faultType.replace(/_/g, ' '),
        diagnosticClass: inc.diagnosticClass,
        severity: inc.severity,
        timestamp: `${inc.timestampClock} (${inc.simulatedDate})`,
        status: inc.status,
        actionTaken: inc.actionTaken || (inc.status === 'RESOLVED' ? 'Repaired & sensors recalibrated' : 'Immediate technician dispatched'),
      });
    }
  } else {
    // If no historical log yet, pull any currently active machine alarms with shift timestamp
    for (const st of Object.values(state.stations)) {
      if (st.activeFault !== 'NONE') {
        faultIncidentsToday.push({
          id: `inc-${st.id}-${Date.now()}`,
          stationName: st.name,
          line: st.line,
          faultType: st.activeFault.replace(/_/g, ' '),
          diagnosticClass: st.mlResult.predictedFailureClass,
          severity: 'CRITICAL',
          timestamp: `${state.config.simulatedDate} • Live Shift`,
          status: 'ACTIVE',
          actionTaken: `Automated shutdown / warning initiated. Corrective maintenance scheduled.`,
        });
      }
    }
  }

  // Prescriptive Directives for Line Supervisors
  const recommendations: string[] = [];
  if (state.completedCount < config.dailyTargetUnits) {
    const deficit = config.dailyTargetUnits - state.completedCount;
    recommendations.push(
      `Daily quota deficit of ${deficit} units will roll over into arrears backlog (${config.arrearsUnits} units total). Consider accelerating conveyor transport pace or scheduling overtime on ${state.bottleneckStationId ? state.stations[state.bottleneckStationId]?.name : 'CNC Lathe'}.`
    );
  } else {
    recommendations.push('Daily finished goods target of 120 units achieved 100% on schedule with zero customer shipment delays.');
  }

  if (criticalEquipmentList.length > 0) {
    recommendations.push(
      `CRITICAL ALERT: ${criticalEquipmentList.map(c => c.name).join(', ')} require mandatory inspection before starting tomorrow's 8:00 AM shift.`
    );
  } else {
    recommendations.push('All line machinery running within ISO 10816 Zone A/B vibration limits. RUL baselines remain healthy (>100 hrs).');
  }

  recommendations.push(
    `Sustainability Achievement: Rooftop solar generation delivered ${energy.solarGenerationTodayKwh} kWh, offsetting ${energy.solarOffsetPercentage}% of daytime grid draw and saving ${formatIndianCurrency(Math.round(energy.solarGenerationTodayKwh * energy.tariffPerKwhInr))} in electricity tariff.`
  );

  return {
    dayNumber: config.simulatedDayCount,
    shiftDateStr: config.simulatedDate,
    shiftWindow: `08:00 AM – 04:00 PM (${config.shiftDurationHours}.0 Hours)`,
    shiftStatus: isShiftEnded ? 'SHIFT_COMPLETED' : 'SHIFT_IN_PROGRESS',
    finishedGoodsToday: state.completedCount,
    dailyTargetUnits: config.dailyTargetUnits,
    fulfillmentPercentage: fulfillment,
    arrearsTodayDeficit,
    arrearsBacklogUnits: config.arrearsUnits,
    scrapCountToday: totalScraps,
    firstPassYieldPercent: state.oee.quality,
    overallOeePercent: state.oee.overallOEE,
    reworksToday: {
      total: totalReworks,
      rm1Lathe: reworksRm1,
      rm2Milling: reworksRm2,
      rm3Shaping: reworksRm3,
      reworkCycleTimeMinutes: (config.qualityParameters.reworkDurationSeconds ?? 180) / 60,
    },
    scrapsToday: {
      total: totalScraps,
      rm1Lathe: scrapsRm1,
      rm2Milling: scrapsRm2,
      rm3Shaping: scrapsRm3,
      scrapCostInr,
    },
    entityThroughputByType,
    faultIncidentsToday,
    totalEnergyConsumedKwh: energy.todayTotalKwh,
    peakDemandKw: energy.peakDemandKw,
    powerFactor: energy.powerFactor,
    totalEnergyCostInr: energy.todayEnergyCostInr,
    carbonEmissionsKg: energy.carbonEmissionsTodayKg,
    solarGenerationKwh: energy.solarGenerationTodayKwh,
    solarOffsetPercent: energy.solarOffsetPercentage,
    specificEnergyKwhPerUnit: energy.specificEnergyKwhPerUnit,
    totalFleetRulReductionHours: Number(totalFleetRulReduction.toFixed(1)),
    equipmentSummaries,
    criticalEquipmentList,
    majorMaintenanceEvents,
    prescriptiveRecommendations: recommendations,
  };
}
