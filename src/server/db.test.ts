import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeDatabase,
  getVerifiedOrgs,
  registerUser,
  loginUser,
  getPendingUsers,
  verifyUserAction,
  saveTenantSimulationState,
  getTenantSimulationState,
} from './db.js';
import { ADMIN_EMAIL } from '../types/auth.js';

test('Database initializes default verified organisation and admin account', async () => {
  await initializeDatabase();
  const orgs = await getVerifiedOrgs();
  assert.ok(orgs.length >= 1, 'Should have at least 1 verified organisation');
  const defaultOrg = orgs.find(o => o.id === 'iiests-mech');
  assert.ok(defaultOrg, 'Default IIESTS organisation must be verified');
  assert.equal(defaultOrg?.status, 'VERIFIED');
});

test('Approved operator can log in with valid credentials', async () => {
  const result = await loginUser('ME-OPR-4412', 'operator123');
  assert.ok(result.success, 'Approved operator should log in successfully');
  assert.ok(result.sessionToken, 'Session token should be returned');
  assert.equal(result.operator?.badgeId, 'ME-OPR-4412');
  assert.equal(result.operator?.status, 'APPROVED');
});

test('Pending user login is strictly rejected with PENDING_APPROVAL status and admin notice', async () => {
  const result = await loginUser('TASL-OPR-881', 'tata2026');
  assert.equal(result.success, false, 'Pending user must NOT be allowed to log in');
  assert.equal(result.status, 'PENDING_APPROVAL');
  assert.ok(result.error?.includes('pending administrative verification'), 'Error must specify pending verification');
  assert.ok(result.error?.includes(ADMIN_EMAIL), 'Error must reference admin email');
});

test('Registration creates user with PENDING_APPROVAL status and registers pending organisation', async () => {
  const uniqueBadge = `TEST-OPR-${Date.now().toString().slice(-4)}`;
  const uniqueEmail = `test.${Date.now()}@aerospace-unit.in`;

  const regResult = await registerUser({
    name: 'Suresh Kumar',
    email: uniqueEmail,
    password: 'password123',
    badgeId: uniqueBadge,
    department: 'Hydraulic Actuators Unit',
    requestedOrganisation: 'HAL Aerospace Actuator Division',
    role: 'PLANT_OPERATOR',
  });

  assert.ok(regResult.success, 'Registration should succeed');
  assert.equal(regResult.user?.status, 'PENDING_APPROVAL');
  assert.equal(regResult.user?.badgeId, uniqueBadge);

  // Attempt login before approval -> must fail
  const loginBefore = await loginUser(uniqueBadge, 'password123');
  assert.equal(loginBefore.success, false);
  assert.equal(loginBefore.status, 'PENDING_APPROVAL');

  // Admin approves user
  const verifyResult = await verifyUserAction(regResult.user!.id, true, ADMIN_EMAIL);
  assert.ok(verifyResult.success);
  assert.equal(verifyResult.user?.status, 'APPROVED');

  // Attempt login after approval -> must succeed
  const loginAfter = await loginUser(uniqueBadge, 'password123');
  assert.ok(loginAfter.success);
  assert.equal(loginAfter.operator?.status, 'APPROVED');
  assert.equal(loginAfter.operator?.organisation, 'HAL Aerospace Actuator Division');
});

test('Multi-tenant simulation state persists isolated progress per organisation', async () => {
  const orgId = 'test-org-tenant-01';
  const sampleState = {
    timeSeconds: 4200,
    completedCount: 28,
    activeFaults: 0,
    oee: { overallOEE: 92.4 },
  };

  await saveTenantSimulationState(orgId, sampleState);
  const loaded = await getTenantSimulationState(orgId);
  assert.ok(loaded, 'State must be retrieved');
  assert.equal(loaded.state.completedCount, 28);
  assert.equal(loaded.state.oee.overallOEE, 92.4);
});
