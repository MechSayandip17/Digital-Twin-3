export interface StationEnergyProfile {
  stationId: string;
  stationName: string;
  currentPowerKw: number;
  standbyPowerKw: number;
  activePowerKw: number;
  spindleRpm: number;
  chillerPowerKw: number;
  coolantPumpKw: number;
  powerFactor: number;
  todayEnergyKwh: number;
}

export interface PlantEnergyAnalytics {
  totalInstantPowerKw: number;
  baseLoadKw: number;
  machiningPowerKw: number;
  transporterPowerKw: number;
  assemblyPackagingKw: number;
  coolingHvacPowerKw: number;
  
  todayTotalKwh: number;
  peakDemandKw: number;
  powerFactor: number;
  
  // Indian Tariff & Standards
  tariffPerKwhInr: number; // e.g. ₹8.50 / kWh
  todayEnergyCostInr: number;
  projectedMonthlyBillInr: number;
  
  // Sustainability & Carbon Footprint (CEA India Grid emission factor ~0.82 kg CO2 / kWh)
  gridEmissionFactorKgPerKwh: number;
  carbonEmissionsTodayKg: number;
  solarGenerationKw: number;
  solarGenerationTodayKwh: number;
  solarOffsetPercentage: number;
  
  // Specific Energy Consumption (SEC)
  specificEnergyKwhPerUnit: number;
  
  // Subsystem Station Breakdown
  stationProfiles: Record<string, StationEnergyProfile>;
  
  // Hourly Demand Trend (8:00 AM to current hour)
  hourlyProfile: {
    hourLabel: string;
    gridKw: number;
    solarKw: number;
    totalKw: number;
  }[];
}
