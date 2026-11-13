import { Station } from '../types/factory';
import { PlantEnergyAnalytics, StationEnergyProfile } from '../types/energy';

// Indian Standard Electricity Tariff for Heavy Industrial (HT-1) Consumers
export const INDIA_HT_INDUSTRIAL_TARIFF_INR_PER_KWH = 8.50; // ₹8.50 / kWh
// Central Electricity Authority (CEA) of India Baseline Grid Emission Factor
export const INDIA_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.82; // 0.82 kg CO2/kWh

/**
 * Calculates instantaneous power draw, spindle dynamics, and cooling load for a station
 */
export function calculateStationEnergyProfile(
  station: Station,
  isShiftOpen: boolean = true,
  isLunchBreak: boolean = false,
  simulatedSecondsOfDay: number = 8 * 3600
): StationEnergyProfile {
  if (!station || !station.type) {
    return {
      stationId: station?.id || 'unknown',
      stationName: station?.name || 'Unknown',
      currentPowerKw: 0.1,
      standbyPowerKw: 0.1,
      activePowerKw: 0.0,
      spindleRpm: 0,
      chillerPowerKw: 0.0,
      coolantPumpKw: 0.0,
      powerFactor: 0.85,
      todayEnergyKwh: 0,
    };
  }

  const isCnc = station.type.includes('cnc');
  const isConveyor = station.type.includes('transporter');
  const isAssembly = station.type === 'final_assembly';
  const isPackaging = station.type === 'packaging';
  const isQc = station.type === 'quality_control';
  const isUnloading = station.type === 'truck_unloading';
  const isInventory = station.type === 'inventory_fifo';

  // 1. Shift Closed / Factory Off
  if (!isShiftOpen || station.status === 'SHIFT_CLOSED') {
    const keepAliveChiller = isInventory ? 1.8 : 0.2; // minimal HVAC preservation
    return {
      stationId: station.id,
      stationName: station.name,
      currentPowerKw: Number(keepAliveChiller.toFixed(2)),
      standbyPowerKw: 0.1,
      activePowerKw: 0.0,
      spindleRpm: 0,
      chillerPowerKw: keepAliveChiller,
      coolantPumpKw: 0.0,
      powerFactor: 0.85,
      todayEnergyKwh: 0,
    };
  }

  // 2. Lunch Break or Station Manually Stopped
  if (isLunchBreak || station.isManuallyStopped) {
    const standbyBase = isCnc ? 2.5 : isInventory ? 3.2 : 0.5;
    return {
      stationId: station.id,
      stationName: station.name,
      currentPowerKw: Number(standbyBase.toFixed(2)),
      standbyPowerKw: standbyBase,
      activePowerKw: 0.0,
      spindleRpm: 0,
      chillerPowerKw: isCnc ? 1.5 : isInventory ? 3.0 : 0.0,
      coolantPumpKw: 0.0,
      powerFactor: 0.88,
      todayEnergyKwh: 0,
    };
  }

  // 3. Active / Idle Status
  const isWorking = station.status === 'BUSY' || station.currentProcessingEntityId !== null;

  let spindleRpm = 0;
  let coolantPumpKw = 0;
  let chillerPowerKw = 0;
  let activePowerKw = 0;
  let standbyPowerKw = 1.0;
  let powerFactor = 0.95;

  if (isCnc) {
    standbyPowerKw = 3.2; // CNC controller, servodrive standby, hydraulic chuck clamp
    if (isWorking) {
      if (station.type === 'cnc_lathe') {
        spindleRpm = 2400 + Math.floor(Math.sin(simulatedSecondsOfDay / 4) * 150);
        coolantPumpKw = 4.2; // 30 bar through-tool coolant
        chillerPowerKw = 3.8; // spindle oil chiller
        activePowerKw = 16.5 + (station.sensors.motorCurrent / 18.0) * 4.5;
      } else if (station.type === 'cnc_milling') {
        spindleRpm = 5400 + Math.floor(Math.cos(simulatedSecondsOfDay / 3) * 250);
        coolantPumpKw = 5.5; // 70 bar high-pressure flood coolant
        chillerPowerKw = 4.5; // active refrigeration compressor
        activePowerKw = 21.0 + (station.sensors.motorCurrent / 16.0) * 5.0;
      } else {
        // cnc_shaping
        spindleRpm = 1450 + Math.floor(Math.sin(simulatedSecondsOfDay / 5) * 80);
        coolantPumpKw = 3.5;
        chillerPowerKw = 3.2;
        activePowerKw = 14.0 + (station.sensors.motorCurrent / 15.0) * 3.5;
      }
      powerFactor = 0.96;
    } else {
      spindleRpm = 0;
      coolantPumpKw = 0.5; // low pressure recirculation
      chillerPowerKw = 2.0; // standby chiller loop
      activePowerKw = 0;
      powerFactor = 0.89;
    }
  } else if (isConveyor) {
    standbyPowerKw = 0.4;
    if (isWorking) {
      const beltLoad = station.currentlyProcessingCount * 0.8;
      activePowerKw = 2.8 + beltLoad + (station.sensors.motorCurrent / 12.0) * 0.9;
      powerFactor = 0.92;
    } else {
      activePowerKw = 0;
      powerFactor = 0.86;
    }
  } else if (isAssembly) {
    standbyPowerKw = 1.8; // robotic controller & vision sensor standby
    if (isWorking) {
      activePowerKw = 8.5; // 6-axis articulated arm + pneumatic torque driver
      chillerPowerKw = 1.2;
      powerFactor = 0.94;
    }
  } else if (isPackaging) {
    standbyPowerKw = 1.5;
    if (isWorking) {
      activePowerKw = 9.2; // Nichrome heat sealer element + shrink film tunnel
      powerFactor = 0.97; // predominantly resistive heater load
    }
  } else if (isQc) {
    standbyPowerKw = 0.8;
    if (isWorking) {
      activePowerKw = 2.4; // CMM laser micrometer + granite bed vibration isolator
      chillerPowerKw = 0.6; // temperature stabilization
      powerFactor = 0.95;
    }
  } else if (isUnloading) {
    standbyPowerKw = 0.5;
    if (isWorking) {
      activePowerKw = 7.5; // electric cable hoist / hydraulic lift pump
      powerFactor = 0.91;
    }
  } else if (isInventory) {
    standbyPowerKw = 4.2; // climate-controlled humidity & temp HVAC compressor
    activePowerKw = isWorking ? 1.5 : 0;
    chillerPowerKw = 3.5;
    powerFactor = 0.93;
  }

  const totalKw = standbyPowerKw + activePowerKw + coolantPumpKw + chillerPowerKw;

  return {
    stationId: station.id,
    stationName: station.name,
    currentPowerKw: Number(totalKw.toFixed(2)),
    standbyPowerKw: Number(standbyPowerKw.toFixed(2)),
    activePowerKw: Number(activePowerKw.toFixed(2)),
    spindleRpm,
    chillerPowerKw: Number(chillerPowerKw.toFixed(2)),
    coolantPumpKw: Number(coolantPumpKw.toFixed(2)),
    powerFactor,
    todayEnergyKwh: 0,
  };
}

/**
 * Computes consolidated plant energy analytics, Indian tariff costs, and carbon offset
 */
export function calculatePlantEnergyAnalytics(
  stations: Record<string, Station>,
  param2: boolean | { isShiftOpen?: boolean; lunchBreakEnabled?: boolean; lunchBreakStartHour?: number; lunchBreakDurationMinutes?: number; simulatedSecondsOfDay?: number; completedCount?: number; energyConsumedTodayKwh?: number } = true,
  param3: boolean = false,
  param4: number = 8 * 3600,
  param5: number = 0
): PlantEnergyAnalytics {
  let isShiftOpen = true;
  let isLunchBreak = false;
  let simulatedSecondsOfDay = 8 * 3600;
  let completedTodayCount = 0;
  let accumulatedKwhFromState: number | undefined = undefined;

  if (typeof param2 === 'object' && param2 !== null) {
    const cfg = param2;
    isShiftOpen = cfg.isShiftOpen ?? true;
    simulatedSecondsOfDay = cfg.simulatedSecondsOfDay ?? 8 * 3600;
    completedTodayCount = cfg.completedCount ?? 0;
    accumulatedKwhFromState = cfg.energyConsumedTodayKwh;
    const curHour = (simulatedSecondsOfDay / 3600) % 24;
    const lunchStart = cfg.lunchBreakStartHour ?? 13.0;
    const lunchDur = (cfg.lunchBreakDurationMinutes ?? 60) / 60;
    isLunchBreak = (cfg.lunchBreakEnabled ?? true) && curHour >= lunchStart && curHour < lunchStart + lunchDur;
  } else {
    isShiftOpen = typeof param2 === 'boolean' ? param2 : true;
    isLunchBreak = param3;
    simulatedSecondsOfDay = param4;
    completedTodayCount = param5;
  }

  const stationProfiles: Record<string, StationEnergyProfile> = {};

  let totalInstantKw = 0;
  let baseLoadKw = 0;
  let machiningPowerKw = 0;
  let transporterPowerKw = 0;
  let assemblyPackagingKw = 0;
  let coolingHvacPowerKw = 0;

  const validStations = stations && typeof stations === 'object' ? Object.values(stations) : [];

  for (const st of validStations) {
    if (!st || st.isQueue || st.type === 'sink_dispatch' || st.type === 'truck_source') continue;
    
    const profile = calculateStationEnergyProfile(st, isShiftOpen, isLunchBreak, simulatedSecondsOfDay);
    stationProfiles[st.id] = profile;

    totalInstantKw += profile.currentPowerKw;
    baseLoadKw += profile.standbyPowerKw;
    coolingHvacPowerKw += profile.chillerPowerKw + profile.coolantPumpKw;

    if (st.type.includes('cnc')) {
      machiningPowerKw += profile.activePowerKw;
    } else if (st.type.includes('transporter')) {
      transporterPowerKw += profile.activePowerKw;
    } else if (st.type === 'final_assembly' || st.type === 'packaging') {
      assemblyPackagingKw += profile.activePowerKw;
    }
  }

  // Plant general infrastructure base load (factory LED high-bays, compressor house, office IT)
  const factoryFacilitiesBaseKw = isShiftOpen ? 18.5 : 4.5;
  totalInstantKw += factoryFacilitiesBaseKw;
  baseLoadKw += factoryFacilitiesBaseKw;

  // Solar generation simulation: 120 kWp Rooftop Solar PV installation (Bifacial Monocrystalline)
  // Generating curve between 8:00 AM (hour 8) and 5:00 PM (hour 17), peaking at 12:30 PM (hour 12.5)
  const currentHour = (simulatedSecondsOfDay / 3600) % 24;
  let solarGenerationKw = 0;
  if (currentHour >= 8.0 && currentHour <= 17.0) {
    const sunAngle = Math.sin(((currentHour - 8.0) / 9.0) * Math.PI);
    solarGenerationKw = Math.max(0, Number((115.0 * sunAngle).toFixed(1)));
  }

  // Calculate cumulative energy consumed today (kWh) from shift start (8:00 AM)
  const shiftHoursElapsed = Math.max(0, Math.min(8.0, currentHour - 8.0));
  
  // Dynamically compute cumulative energy from live integrated state or realistic load integration
  let todayTotalKwh: number;
  if (accumulatedKwhFromState !== undefined && accumulatedKwhFromState > 0) {
    todayTotalKwh = Number(accumulatedKwhFromState.toFixed(1));
  } else {
    // Dynamic physical estimation: active machinery draw + baseline over elapsed operating hours
    const activeLoadRatio = isShiftOpen ? (isLunchBreak ? 0.35 : 0.78) : 0.18;
    const dynamicHourlyLoadKw = baseLoadKw + (totalInstantKw - baseLoadKw) * activeLoadRatio;
    todayTotalKwh = Number((dynamicHourlyLoadKw * Math.max(0.1, shiftHoursElapsed)).toFixed(1));
  }
  const peakDemandKw = Number(Math.max(totalInstantKw, totalInstantKw * 1.05).toFixed(1));

  // Cumulative solar generation today (kWh)
  const solarHours = Math.max(0, Math.min(9.0, currentHour - 8.0));
  const avgSolarKw = solarGenerationKw > 0 ? solarGenerationKw * 0.65 : 0;
  const solarGenerationTodayKwh = Number((avgSolarKw * solarHours).toFixed(1));

  // Solar clean energy offset percentage
  const netGridKwh = Math.max(0, todayTotalKwh - solarGenerationTodayKwh);
  const solarOffsetPercentage = todayTotalKwh > 0 ? Math.min(65, Math.round((solarGenerationTodayKwh / todayTotalKwh) * 100)) : 0;

  // Financial Energy Cost in Indian Rupees (₹)
  const tariffPerKwhInr = INDIA_HT_INDUSTRIAL_TARIFF_INR_PER_KWH;
  const todayEnergyCostInr = Math.round(netGridKwh * tariffPerKwhInr);
  // Projected 26 working days monthly electricity bill (in ₹ Lakhs)
  const projectedMonthlyBillInr = Math.round(todayEnergyCostInr * 26);

  // Carbon Emissions using Indian Central Electricity Authority (CEA) standard
  const gridEmissionFactorKgPerKwh = INDIA_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH;
  const carbonEmissionsTodayKg = Math.round(netGridKwh * gridEmissionFactorKgPerKwh);

  // Specific Energy Consumption (SEC): kWh per finished aerospace part
  const specificEnergyKwhPerUnit = completedTodayCount > 0
    ? Number((todayTotalKwh / completedTodayCount).toFixed(2))
    : Number((todayTotalKwh / Math.max(1, shiftHoursElapsed * 15)).toFixed(2));

  // Construct Hourly Profile from 8 AM to current hour
  const hourlyProfile = [];
  const startH = 8;
  const endH = Math.max(8, Math.min(16, Math.ceil(currentHour)));
  for (let h = startH; h <= endH; h++) {
    const label = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    const hSun = h >= 8 && h <= 17 ? Math.sin(((h - 8) / 9) * Math.PI) * 115 : 0;
    const isLunch = h === 13;
    const hLoad = isLunch ? 38.0 : 85.0 + Math.sin(h * 1.7) * 12.0;
    hourlyProfile.push({
      hourLabel: label,
      gridKw: Math.max(5, Math.round(hLoad - hSun)),
      solarKw: Math.round(hSun),
      totalKw: Math.round(hLoad),
    });
  }

  return {
    totalInstantPowerKw: Number(totalInstantKw.toFixed(1)),
    baseLoadKw: Number(baseLoadKw.toFixed(1)),
    machiningPowerKw: Number(machiningPowerKw.toFixed(1)),
    transporterPowerKw: Number(transporterPowerKw.toFixed(1)),
    assemblyPackagingKw: Number(assemblyPackagingKw.toFixed(1)),
    coolingHvacPowerKw: Number(coolingHvacPowerKw.toFixed(1)),
    todayTotalKwh,
    peakDemandKw,
    powerFactor: 0.96,
    tariffPerKwhInr,
    todayEnergyCostInr,
    projectedMonthlyBillInr,
    gridEmissionFactorKgPerKwh,
    carbonEmissionsTodayKg,
    solarGenerationKw,
    solarGenerationTodayKwh,
    solarOffsetPercentage,
    specificEnergyKwhPerUnit,
    stationProfiles,
    hourlyProfile,
  };
}
