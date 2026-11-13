import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHourOfDay,
  formatHourOfDay24,
  getShiftTimingDetails,
  isShiftCurrentlyEnded,
} from './shiftTime';
import {
  canPersistToProductionStore,
  resolveEnvironmentStorageKey,
  isValidProductionSnapshot,
  pickNewestProductionState,
} from './environmentIsolation';
import {
  generateShiftSummaryReport,
  buildUnifiedShiftReportPayload,
} from './shiftSummaryReport';
import { buildAuditPdfRows } from './auditPdfExport';
import { createInitialPlantState } from '../simulation/plantEngine';
import { calculatePlantEnergyAnalytics } from '../simulation/energyEngine';

test('shiftTime formats 12-hour and 24-hour times dynamically without hardcoded 4:00 PM', () => {
  assert.equal(formatHourOfDay(8), '08:00 AM');
  assert.equal(formatHourOfDay(14), '02:00 PM');
  assert.equal(formatHourOfDay(18), '06:00 PM');
  assert.equal(formatHourOfDay(13.5), '01:30 PM');
  assert.equal(formatHourOfDay(26), '02:00 AM'); // Overnight wrap

  assert.equal(formatHourOfDay24(8), '08:00');
  assert.equal(formatHourOfDay24(18), '18:00');
  assert.equal(formatHourOfDay24(26), '02:00');
});

test('getShiftTimingDetails derives end times and labels from shiftStartHour + shiftDurationHours', () => {
  const stdShift = getShiftTimingDetails(8, 8);
  assert.equal(stdShift.shiftEndHour, 16);
  assert.equal(stdShift.shiftEndTimeStr, '04:00 PM');
  assert.equal(stdShift.shiftWindowLabel, '08:00 AM – 04:00 PM (8.0 Hours)');

  const extendedShift = getShiftTimingDetails(8, 10);
  assert.equal(extendedShift.shiftEndHour, 18);
  assert.equal(extendedShift.shiftStartTimeStr, '08:00 AM');
  assert.equal(extendedShift.shiftEndTimeStr, '06:00 PM');
  assert.equal(extendedShift.shiftWindowLabel, '08:00 AM – 06:00 PM (10.0 Hours)');
  assert.equal(extendedShift.shiftNameLabel, 'Shift 1: Day (08:00 AM – 06:00 PM)');

  const shiftedStart = getShiftTimingDetails(9, 6.5);
  assert.equal(shiftedStart.shiftStartTimeStr, '09:00 AM');
  assert.equal(shiftedStart.shiftEndTimeStr, '03:30 PM');
  assert.equal(shiftedStart.shiftWindowLabel, '09:00 AM – 03:30 PM (6.5 Hours)');
});

test('isShiftCurrentlyEnded evaluates dynamic shift end and explicit shift closure', () => {
  // 16:30 is active during a 10-hour shift starting at 8:00 AM (ends 18:00)
  assert.equal(isShiftCurrentlyEnded(16.5 * 3600, 8, 10, true), false);
  // 18:00 marks shift end for 10-hour shift starting at 8:00 AM
  assert.equal(isShiftCurrentlyEnded(18 * 3600, 8, 10, true), true);
  // Explicit shift close always marks ended
  assert.equal(isShiftCurrentlyEnded(10 * 3600, 8, 10, false), true);
});

test('environmentIsolation prevents SIMULATION and HISTORICAL from writing to PRODUCTION store', () => {
  assert.equal(canPersistToProductionStore('PRODUCTION', 'PRODUCTION'), true);
  assert.equal(canPersistToProductionStore('PRODUCTION', undefined), true);
  assert.equal(canPersistToProductionStore('SIMULATION', 'PRODUCTION'), false);
  assert.equal(canPersistToProductionStore('HISTORICAL', 'PRODUCTION'), false);
  assert.equal(canPersistToProductionStore('PRODUCTION', 'SIMULATION'), false);
  assert.equal(canPersistToProductionStore('SIMULATION', 'SIMULATION'), false);

  assert.equal(resolveEnvironmentStorageKey('PRODUCTION', 'iiests-mech'), 'aerotwin_tenant_state_iiests-mech');
  assert.equal(resolveEnvironmentStorageKey('SIMULATION', 'iiests-mech'), 'aerotwin_sandbox_simulation');
  assert.equal(resolveEnvironmentStorageKey('HISTORICAL', 'iiests-mech'), 'aerotwin_sandbox_historical');
});

test('pickNewestProductionState ignores SIMULATION/HISTORICAL snapshots and preserves fresher PRODUCTION timer', () => {
  const validProdOlder = {
    stations: { cnc_lathe: {} },
    config: { shiftDurationHours: 8 },
    targetEnvironment: 'PRODUCTION',
    timeSeconds: 1200,
    _serverSavedTimestamp: 1000,
  };
  const validProdNewer = {
    stations: { cnc_lathe: {} },
    config: { shiftDurationHours: 10 },
    targetEnvironment: 'PRODUCTION',
    timeSeconds: 3600,
    _savedWallTime: 2000,
  };
  const simPolluted = {
    stations: { cnc_lathe: {} },
    config: { shiftDurationHours: 8 },
    targetEnvironment: 'SIMULATION',
    timeSeconds: 0,
    _serverSavedTimestamp: 999999,
  };

  assert.equal(isValidProductionSnapshot(validProdOlder), true);
  assert.equal(isValidProductionSnapshot(simPolluted), false);

  // Even though simPolluted has a newer timestamp, pickNewestProductionState discards it
  const selected1 = pickNewestProductionState(validProdOlder, simPolluted);
  assert.equal(selected1?.timeSeconds, 1200);

  // Between valid local and remote PRODUCTION states, picks the freshest timestamp
  const selected2 = pickNewestProductionState(validProdNewer, validProdOlder);
  assert.equal(selected2?.timeSeconds, 3600);
});

test('generateShiftSummaryReport and buildUnifiedShiftReportPayload reflect custom real-time shift end', () => {
  const state = createInitialPlantState();
  state.config.shiftStartHour = 8;
  state.config.shiftDurationHours = 10;
  state.config.simulatedSecondsOfDay = 16 * 3600 + 30 * 60; // 4:30 PM -> still active for 10h shift
  state.config.isShiftOpen = true;
  state.completedCount = 42;
  (state as any).targetEnvironment = 'PRODUCTION';

  const energy = calculatePlantEnergyAnalytics(state.stations, {
    isShiftOpen: state.config.isShiftOpen,
    simulatedSecondsOfDay: state.config.simulatedSecondsOfDay,
  });
  const report = generateShiftSummaryReport(state, energy);

  assert.equal(report.shiftEndTimeStr, '06:00 PM');
  assert.equal(report.shiftWindow, '08:00 AM – 06:00 PM (10.0 Hours)');
  assert.equal(report.shiftStatus, 'SHIFT_IN_PROGRESS');
  assert.equal(report.finishedGoodsToday, 42);

  const unified = buildUnifiedShiftReportPayload(report, state);
  assert.equal(unified.shiftEndTimeStr, '06:00 PM');
  assert.equal(unified.finishedGoodsCount, 42);
  assert.equal(unified.operatingHours, 10);
  assert.equal(unified.sourceEnvironment, 'PRODUCTION');
});

test('buildAuditPdfRows formats audit records cleanly for PDF table generation', () => {
  const rows = buildAuditPdfRows([
    {
      id: 'log-123',
      timestamp: 1700000000000,
      timestampIso: '2023-11-14T10:00:00.000Z',
      timestampStr: '11/14/2023, 10:00:00 AM',
      action: 'ADVANCE_DAY',
      adminName: 'Sayandip Mallick',
      adminEmail: 'sayandipmallickclassf@gmail.com',
      adminBadge: 'CHIEF-ENG-01',
      targetName: 'Shift Day 4',
      details: 'Closed Day 3 shift and advanced to Day 4',
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'ADVANCE DAY');
  assert.equal(rows[0].adminActor, 'sayandipmallickclassf@gmail.com (CHIEF-ENG-01)');
  assert.equal(rows[0].target, 'Shift Day 4');
});
