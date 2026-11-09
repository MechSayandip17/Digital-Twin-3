import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPlantState, advanceToNextDay } from './plantEngine.js';
import { calculatePlantEnergyAnalytics, calculateStationEnergyProfile } from './energyEngine.js';
import { generateShiftSummaryReport, formatIndianCurrency, formatIndianNumber } from '../utils/shiftSummaryReport.js';

test('calculatePlantEnergyAnalytics calculates real-time power draw based on active machine state, spindle RPM, and cooling', () => {
  const plantState = createInitialPlantState(undefined, false);
  const analytics = calculatePlantEnergyAnalytics(plantState.stations, plantState.config);

  assert.ok(analytics.totalInstantPowerKw > 0, 'Total power draw should be greater than 0');
  assert.ok(analytics.coolingHvacPowerKw > 0, 'Cooling total should be greater than 0');
  assert.equal(analytics.tariffPerKwhInr, 8.5, 'Tariff should be Indian industrial standard ₹8.50/kWh');
  assert.ok(analytics.todayTotalKwh >= 0, 'Today total kWh should be calculated');
  assert.ok(analytics.solarGenerationKw >= 0, 'Solar generation should be modeled');

  // Verify CNC lathe station profile has spindle RPM and cooling load
  const lathe = plantState.stations['cnc_lathe'];
  assert.ok(lathe, 'CNC lathe should exist');
  const profile = calculateStationEnergyProfile(lathe, true);
  assert.ok(profile.spindleRpm >= 0, 'Spindle RPM should be modeled');
  assert.ok(profile.coolantPumpKw >= 0, 'Coolant pump load should be calculated');
  assert.ok(profile.currentPowerKw >= profile.standbyPowerKw, 'Active power draw must exceed standby power');
});

test('generateShiftSummaryReport produces complete daily shift report with energy, maintenance, and RUL reduction', () => {
  const plantState = createInitialPlantState(undefined, false);
  const analytics = calculatePlantEnergyAnalytics(plantState.stations, plantState.config);
  const report = generateShiftSummaryReport(plantState, analytics);

  assert.equal(report.dayNumber, plantState.config.simulatedDayCount);
  assert.equal(report.shiftDateStr, plantState.config.simulatedDate);
  assert.ok(report.totalEnergyConsumedKwh >= 0);
  assert.ok(report.totalEnergyCostInr >= 0);
  assert.ok(report.totalFleetRulReductionHours >= 0);
  assert.ok(Array.isArray(report.equipmentSummaries));
  assert.ok(report.equipmentSummaries.length > 0);
});

test('Indian currency and number formatters produce standard INR formatting (Lakhs and Crores)', () => {
  assert.ok(formatIndianCurrency(1500).includes('1,500'));
  assert.ok(formatIndianCurrency(150000).includes('1,50,000'));
  assert.equal(formatIndianNumber(150000), '₹1.50 Lakh');
  assert.equal(formatIndianNumber(25000000), '₹2.50 Cr');
});

test('Arrears calculation does not double count when advancing to next day after shift close', () => {
  let state = createInitialPlantState(undefined, false);
  
  // Set shift closed for day 1
  state.config.isShiftOpen = false;
  state.config.shiftClosedForDayCount = 1;
  state.config.arrearsUnits = 154; // Arrears set at shift close

  // Advance to next day
  const nextDay = advanceToNextDay(state);
  
  // Arrears should remain 154, NOT jump to 231 (154 + 77)
  assert.equal(nextDay.config.arrearsUnits, 154, 'Arrears should not double-count on new day transition');
  assert.equal(nextDay.config.simulatedDayCount, 2, 'Simulated day should advance to 2');
});
