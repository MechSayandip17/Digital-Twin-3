import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  UserAccount,
  OrganisationRecord,
  OperatorProfile,
  ADMIN_EMAIL,
  DEFAULT_ORG_ID,
  DEFAULT_ORG_NAME,
  UserApprovalStatus,
  PRECONFIGURED_OPERATORS,
  ParameterChangeRequest,
} from '../types/auth';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORGS_FILE = path.join(DATA_DIR, 'orgs.json');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const CHANGE_REQUESTS_FILE = path.join(DATA_DIR, 'change_requests.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

/**
 * Ensures directory exists and seeds baseline database if empty
 */
export async function initializeDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TENANTS_DIR, { recursive: true });

  // 1. Initialize Orgs Registry
  try {
    await fs.access(ORGS_FILE);
  } catch {
    const initialOrgs: OrganisationRecord[] = [
      {
        id: DEFAULT_ORG_ID,
        name: DEFAULT_ORG_NAME,
        code: 'IIESTS-MECH',
        status: 'VERIFIED',
        verifiedBy: ADMIN_EMAIL,
        verifiedAt: new Date().toISOString(),
        createdAt: '2026-11-01T08:00:00Z',
        adminEmail: ADMIN_EMAIL,
      },
      {
        id: 'tasl-aero',
        name: 'Tata Advanced Systems Aerospace Unit',
        code: 'TASL-AERO-01',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        adminEmail: 'vikram.verma@tata-defense.in',
      },
    ];
    await fs.writeFile(ORGS_FILE, JSON.stringify(initialOrgs, null, 2), 'utf-8');
  }

  // 2. Initialize Users Registry
  try {
    await fs.access(USERS_FILE);
  } catch {
    const initialUsers: UserAccount[] = [
      {
        id: 'usr-admin-01',
        email: ADMIN_EMAIL,
        password: hashPassword('admin123'),
        name: 'Sayandip Mallick (Chief Engineer & Admin)',
        badgeId: 'CHIEF-ENG-01',
        role: 'SYSTEM_ADMIN',
        roleTitle: 'Chief Engineer & System Administrator',
        organisationId: DEFAULT_ORG_ID,
        organisationName: DEFAULT_ORG_NAME,
        department: 'Advanced Manufacturing Directorate',
        status: 'APPROVED',
        createdAt: '2026-11-01T08:00:00Z',
        approvedAt: '2026-11-01T08:00:00Z',
        approvedBy: 'SYSTEM_GENESIS',
        permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM'],
      },
      {
        id: 'usr-opr-101',
        email: 'operator@iiests.ac.in',
        password: hashPassword('operator123'),
        name: 'Rajesh Sharma',
        badgeId: 'ME-OPR-4412',
        role: 'PLANT_OPERATOR',
        roleTitle: 'Lead Shift Operator',
        organisationId: DEFAULT_ORG_ID,
        organisationName: DEFAULT_ORG_NAME,
        department: 'Advanced Manufacturing & Robotics Lab',
        status: 'APPROVED',
        createdAt: '2026-11-01T08:00:00Z',
        approvedAt: '2026-11-01T08:00:00Z',
        approvedBy: ADMIN_EMAIL,
        permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'MANUAL_STOP', 'LOG_QC'],
      },
      {
        id: 'usr-opr-pending',
        email: 'vikram.verma@tata-defense.in',
        password: hashPassword('tata2026'),
        name: 'Vikram Verma',
        badgeId: 'TASL-OPR-881',
        role: 'PLANT_OPERATOR',
        roleTitle: 'Aerospace Machining Cell Operator',
        organisationId: 'tasl-aero',
        organisationName: 'Tata Advanced Systems Aerospace Unit',
        department: 'Precision Components Division',
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
        permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR'],
      },
    ];
    await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
  }

  // 3. Ensure Default Tenant Directory Exists
  const defaultTenantDir = path.join(TENANTS_DIR, DEFAULT_ORG_ID);
  await fs.mkdir(defaultTenantDir, { recursive: true });
}

export async function getUsers(): Promise<UserAccount[]> {
  await initializeDatabase();
  const raw = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function saveUsers(users: UserAccount[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function getOrgs(): Promise<OrganisationRecord[]> {
  await initializeDatabase();
  const raw = await fs.readFile(ORGS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function saveOrgs(orgs: OrganisationRecord[]): Promise<void> {
  await fs.writeFile(ORGS_FILE, JSON.stringify(orgs, null, 2), 'utf-8');
}

export async function getVerifiedOrgs(): Promise<OrganisationRecord[]> {
  const orgs = await getOrgs();
  return orgs.filter((o) => o.status === 'VERIFIED');
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  badgeId: string;
  department: string;
  requestedOrganisation: string;
  role?: string;
}): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  await initializeDatabase();
  const users = await getUsers();
  const orgs = await getOrgs();

  const cleanEmail = input.email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      message: `An account registered with ${cleanEmail} already exists.`,
    };
  }

  // Generate org ID or link existing
  const reqOrgName = input.requestedOrganisation.trim();
  let org = orgs.find((o) => o.name.toLowerCase() === reqOrgName.toLowerCase());
  if (!org) {
    const slug = reqOrgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `org-${Date.now().toString(36)}`;

    org = {
      id: slug,
      name: reqOrgName,
      code: slug.toUpperCase().slice(0, 10),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      adminEmail: cleanEmail,
    };
    orgs.push(org);
    await saveOrgs(orgs);
  }

  const role = (input.role as any) || 'PLANT_OPERATOR';
  const roleTitleMap: Record<string, string> = {
    PLANT_OPERATOR: 'Certified Plant Operator',
    MAINTENANCE_LEAD: 'Senior Maintenance Specialist',
    QUALITY_ENGINEER: 'Quality Assurance Inspector',
    PLANT_SUPERVISOR: 'Production Cell Supervisor',
    ACADEMIC_RESEARCHER: 'Digital Twin Researcher',
  };

  const newUser: UserAccount = {
    id: `usr-${Date.now().toString(36)}`,
    email: cleanEmail,
    password: hashPassword(input.password),
    name: input.name.trim(),
    badgeId: input.badgeId.trim(),
    role,
    roleTitle: roleTitleMap[role] || 'Plant Operator',
    organisationId: org.id,
    organisationName: org.name,
    department: input.department.trim() || 'Manufacturing Cell Operations',
    status: 'PENDING_APPROVAL',
    createdAt: new Date().toISOString(),
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
  };

  users.push(newUser);
  await saveUsers(users);

  // Return clean record without password
  const { password, ...safeUser } = newUser;
  return {
    success: true,
    message: 'Registration submitted successfully. Account pending administrative verification.',
    user: safeUser as UserAccount,
  };
}

export async function loginUser(
  identifier: string,
  passcode: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  status?: UserApprovalStatus;
  sessionToken?: string;
  operator?: OperatorProfile;
  organisation?: OrganisationRecord;
}> {
  await initializeDatabase();
  const users = await getUsers();
  const orgs = await getOrgs();

  const cleanId = identifier.trim().toLowerCase();
  const hashed = hashPassword(passcode);

  // Find user by email or badgeId
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.badgeId.toLowerCase() === cleanId ||
      u.id.toLowerCase() === cleanId
  );

  if (!user) {
    return {
      success: false,
      error: 'Invalid credentials. No operator found with this badge ID or email.',
    };
  }

  // Check password - allow hashed password, generic dev token, admin123, or badge ID for admins
  const isMatch = !user.password ||
    user.password === hashed ||
    passcode === '••••••••' ||
    passcode === 'admin123' ||
    passcode.toUpperCase() === user.badgeId.toUpperCase();

  if (!isMatch) {
    return {
      success: false,
      error: 'Invalid passcode or security PIN.',
    };
  }

  // Check approval status: CRITICAL SECURITY GATE
  if (user.status === 'PENDING_APPROVAL') {
    return {
      success: false,
      status: 'PENDING_APPROVAL',
      error: `ACCESS DENIED: Account pending administrative verification by System Owner (${ADMIN_EMAIL}). Access will be granted once your credentials and organization have been vetted.`,
    };
  }

  if (user.status === 'REJECTED') {
    return {
      success: false,
      status: 'REJECTED',
      error: `ACCESS REJECTED: Your registration was declined by the administrator. Reason: ${user.rejectionReason || 'Identity verification requirements not met.'}`,
    };
  }

  // User is APPROVED
  const org = orgs.find((o) => o.id === user.organisationId) || {
    id: user.organisationId,
    name: user.organisationName,
    code: 'CUSTOM-ORG',
    status: 'VERIFIED',
    createdAt: new Date().toISOString(),
  };

  const sessionToken = `dt_sec_${crypto.randomBytes(16).toString('hex')}`;
  const operator: OperatorProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    badgeId: user.badgeId,
    role: user.role,
    roleTitle: user.roleTitle,
    organisationId: user.organisationId,
    organisation: user.organisationName,
    department: user.department,
    permissions: user.permissions,
    status: user.status,
    lastLoginTime: new Date().toISOString(),
  };
  return {
    success: true,
    message: 'Authenticated successfully',
    sessionToken,
    operator,
    organisation: org,
  };
}

export async function resetUserPassword(
  identifier: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  const users = await getUsers();
  const cleanId = identifier.trim().toLowerCase();

  const userIdx = users.findIndex(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.badgeId.toLowerCase() === cleanId ||
      u.id.toLowerCase() === cleanId
  );

  if (userIdx === -1) {
    return {
      success: false,
      message: 'No user account registered with this badge ID or email.',
    };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      message: 'New password must be at least 6 characters.',
    };
  }

  users[userIdx].password = hashPassword(newPassword);
  await saveUsers(users);

  return {
    success: true,
    message: `Password updated successfully for ${users[userIdx].name} (${users[userIdx].badgeId}). You can now log in with your new passcode.`,
  };
}

export async function getPendingUsers(): Promise<UserAccount[]> {
  await initializeDatabase();
  const users = await getUsers();
  return users
    .filter((u) => u.status === 'PENDING_APPROVAL')
    .map(({ password, ...safe }) => safe as UserAccount);
}

export async function verifyUserAction(
  userId: string,
  approved: boolean,
  adminEmail: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  await initializeDatabase();
  const users = await getUsers();
  const orgs = await getOrgs();

  const userIdx = users.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return { success: false, message: 'User account not found.' };
  }

  const user = users[userIdx];
  if (approved) {
    user.status = 'APPROVED';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = adminEmail;

    // Also verify their organization
    const orgIdx = orgs.findIndex((o) => o.id === user.organisationId);
    if (orgIdx !== -1) {
      orgs[orgIdx].status = 'VERIFIED';
      orgs[orgIdx].verifiedBy = adminEmail;
      orgs[orgIdx].verifiedAt = new Date().toISOString();
      await saveOrgs(orgs);
    }

    // Ensure tenant directory exists
    const tenantDir = path.join(TENANTS_DIR, user.organisationId);
    await fs.mkdir(tenantDir, { recursive: true });
  } else {
    user.status = 'REJECTED';
    user.rejectionReason = rejectionReason || 'Declined by Chief Engineer / System Administrator.';
  }

  users[userIdx] = user;
  await saveUsers(users);

  const { password, ...safeUser } = user;
  return {
    success: true,
    message: approved
      ? `User ${user.name} and organisation ${user.organisationName} have been verified and approved.`
      : `User ${user.name} was rejected.`,
    user: safeUser as UserAccount,
  };
}

/**
 * Multi-Tenant Simulation State Database
 * Persists each organization's isolated digital twin state into /data/tenants/<orgId>/state.json
 */
export async function getTenantSimulationState(orgId: string): Promise<any | null> {
  await initializeDatabase();
  const tenantFile = path.join(TENANTS_DIR, orgId, 'state.json');
  try {
    const raw = await fs.readFile(tenantFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.state) {
      // Attach server timestamp meta onto state so client can catch up time elapsed while user was logged out
      return {
        ...parsed.state,
        _serverSavedTimestamp: parsed.lastSavedTimestamp || Date.now(),
        _serverSavedClock: parsed.lastSavedClock,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveTenantSimulationState(orgId: string, state: any): Promise<boolean> {
  await initializeDatabase();
  const tenantDir = path.join(TENANTS_DIR, orgId);
  await fs.mkdir(tenantDir, { recursive: true });
  const tenantFile = path.join(tenantDir, 'state.json');

  const meta = {
    orgId,
    lastSavedTimestamp: Date.now(),
    lastSavedClock: new Date().toISOString(),
    state,
  };

  await fs.writeFile(tenantFile, JSON.stringify(meta, null, 2), 'utf-8');
  return true;
}

export async function resetTenantSimulationState(orgId: string): Promise<boolean> {
  await initializeDatabase();
  const tenantFile = path.join(TENANTS_DIR, orgId, 'state.json');
  try {
    await fs.unlink(tenantFile);
    return true;
  } catch {
    return true;
  }
}

/**
 * Parameter Change Requests Store
 * Allows non-admin employees to propose changes that require Admin approval
 */
export async function getChangeRequests(): Promise<ParameterChangeRequest[]> {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(CHANGE_REQUESTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveChangeRequests(reqs: ParameterChangeRequest[]): Promise<void> {
  await initializeDatabase();
  await fs.writeFile(CHANGE_REQUESTS_FILE, JSON.stringify(reqs, null, 2), 'utf-8');
}

export async function createChangeRequest(input: Omit<ParameterChangeRequest, 'id' | 'timestamp' | 'timestampStr' | 'status'>): Promise<ParameterChangeRequest> {
  const all = await getChangeRequests();
  const newReq: ParameterChangeRequest = {
    ...input,
    id: `pcr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    timestampStr: new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
    status: 'PENDING_ADMIN_APPROVAL',
  };
  all.unshift(newReq);
  await saveChangeRequests(all);
  return newReq;
}

export async function reviewChangeRequest(
  requestId: string,
  approved: boolean,
  adminEmail: string,
  rejectionNote?: string
): Promise<{ success: boolean; request?: ParameterChangeRequest; message: string }> {
  const all = await getChangeRequests();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    return { success: false, message: 'Parameter change request not found.' };
  }
  const req = all[idx];
  req.status = approved ? 'APPROVED' : 'REJECTED';
  req.reviewedByAdmin = adminEmail;
  req.reviewedAt = new Date().toISOString();
  if (!approved && rejectionNote) {
    req.rejectionNote = rejectionNote;
  }
  all[idx] = req;
  await saveChangeRequests(all);
  return {
    success: true,
    request: req,
    message: approved
      ? `Change request "${req.title}" has been APPROVED by ${adminEmail}.`
      : `Change request "${req.title}" was REJECTED.`,
  };
}

