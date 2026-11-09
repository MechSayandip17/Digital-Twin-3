import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTER_AEROSPACE_BOM,
  DEFAULT_DIGITWIN_WORK_ORDERS,
  INITIAL_PHYSICAL_STOCK,
  calculateMRPRequirements,
} from './mrpEngine';

test('MASTER_AEROSPACE_BOM contains Level 0, Level 1, and Level 2 hierarchy', () => {
  assert.equal(MASTER_AEROSPACE_BOM.level, 0);
  assert.equal(MASTER_AEROSPACE_BOM.partNumber, 'DT-ASSY-HYD-100');
  assert.ok(MASTER_AEROSPACE_BOM.children && MASTER_AEROSPACE_BOM.children.length === 4);

  // Check Level 1 children
  const spool = MASTER_AEROSPACE_BOM.children.find(c => c.partNumber === 'DT-SUB-SPOOL-01');
  assert.ok(spool);
  assert.equal(spool.level, 1);
  assert.equal(spool.lineAssignment, 'RM1');

  // Check Level 2 raw material under spool
  assert.ok(spool.children && spool.children.length === 1);
  const rawTi = spool.children[0];
  assert.equal(rawTi.level, 2);
  assert.equal(rawTi.partNumber, 'RAW-RM1-TI4V');
  assert.equal(rawTi.quantityPerParent, 1.05);
});

test('calculateMRPRequirements correctly explodes demand and calculates net requirements', () => {
  const result = calculateMRPRequirements(
    'WO-2026-001',
    DEFAULT_DIGITWIN_WORK_ORDERS,
    INITIAL_PHYSICAL_STOCK
  );

  assert.ok(result.targetOrder);
  assert.equal(result.targetOrder.id, 'WO-2026-001');
  assert.ok(result.allocationItems.length > 0);

  // Verify that all 3 levels (0, 1, 2) are present in the exploded manifest
  const levels = new Set(result.allocationItems.map(i => i.level));
  assert.ok(levels.has(0));
  assert.ok(levels.has(1));
  assert.ok(levels.has(2));

  // Verify Net Requirements logic: NetReq = Math.max(0, GrossReq - Available - Inflow + SafetyStock)
  for (const item of result.allocationItems) {
    const expectedAtp = Math.max(0, item.onHandStock - item.allocatedStock);
    assert.equal(item.availableToPromise, expectedAtp);

    const expectedNet = Math.max(
      0,
      item.grossRequirement - (item.availableToPromise + item.scheduledInflow) + item.safetyStock
    );
    assert.equal(item.netRequirement, expectedNet);
  }
});
