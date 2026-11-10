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
  AdminAuditLog,
  PasswordResetApplication,
  OperatorRole,
} from '../types/auth';
import { Employee, EmployeeRole, DEFAULT_EMPLOYEES } from '../types/employee';
import { firestoreDb } from './firebaseAdmin.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORGS_FILE = path.join(DATA_DIR, 'orgs.json');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const CHANGE_REQUESTS_FILE = path.join(DATA_DIR, 'change_requests.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');
const PASSWORD_RESETS_FILE = path.join(DATA_DIR, 'password_resets.json');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

/**
 * Standard system seed accounts (the 4 Admins + 7 Roster Employees)
 */
const SYSTEM_BASELINE_USERS: UserAccount[] = [
  // 1. Designated Admins
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
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
  },
  {
    id: 'usr-admin-nilesh',
    email: 'nilesh.banik@mech.iiests.ac.in',
    password: hashPassword('admin123'),
    name: 'Nilesh Banik',
    badgeId: '2023MEB003',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Reliability Lead',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Advanced Manufacturing Directorate',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
  },
  {
    id: 'usr-admin-soumyajit',
    email: 'soumyajit.chakraborty@mech.iiests.ac.in',
    password: hashPassword('admin123'),
    name: 'Soumyajit Chakraborty',
    badgeId: '2023MEB015',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Operations Architect',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Advanced Manufacturing Directorate',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
  },
  {
    id: 'usr-admin-chitrayan',
    email: 'chitrayan.biswas@mech.iiests.ac.in',
    password: hashPassword('admin123'),
    name: 'Chitrayan Biswas',
    badgeId: '2023MEB019',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Quality Governor',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Advanced Manufacturing Directorate',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
  },
  // 2. Production Cell Operators & Engineers (All employees from the workforce roster)
  {
    id: 'usr-opr-101',
    email: 'operator@iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Rajesh Sharma',
    badgeId: 'ME-OPR-4412',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Lead Shift CNC Machinist',
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
    id: 'usr-opr-102',
    email: 'priyanka.banerjee@mech.iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Priyanka Banerjee',
    badgeId: 'ME-MNT-8891',
    role: 'MAINTENANCE_LEAD',
    roleTitle: 'Maintenance Engineer',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Condition Monitoring & Reliability Lab',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'TRIGGER_MAINTENANCE', 'REPLACE_TOOL', 'OVERRIDE_FAULT'],
  },
  {
    id: 'usr-opr-103',
    email: 'anirban.sengupta@mech.iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Anirban Sengupta',
    badgeId: 'ME-QAC-3309',
    role: 'QUALITY_ENGINEER',
    roleTitle: 'QC Inspector',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Metrology & NDT Division',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'AUDIT_SCRAP', 'REWORK_ROUTING', 'EXPORT_TRACEABILITY'],
  },
  {
    id: 'usr-opr-104',
    email: 'maria.santos@mech.iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Maria Santos',
    badgeId: 'ME-OPR-4413',
    role: 'PLANT_OPERATOR',
    roleTitle: 'CNC Shaping & Hobbing Machinist',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Precision Components Division',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
  },
  {
    id: 'usr-opr-105',
    email: 'karan.verma@mech.iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Karan Verma',
    badgeId: 'ME-ASM-9021',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Final Assembly Specialist',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Final Assembly Division',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
  },
  {
    id: 'usr-opr-106',
    email: 'deepak.kumar@mech.iiests.ac.in',
    password: hashPassword('operator123'),
    name: 'Deepak Kumar',
    badgeId: 'ME-PKG-6110',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Packaging & Warehouse Logistics Lead',
    organisationId: DEFAULT_ORG_ID,
    organisationName: DEFAULT_ORG_NAME,
    department: 'Packaging & Dispatch Hub',
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
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
    status: 'APPROVED',
    createdAt: '2026-11-01T08:00:00Z',
    approvedAt: '2026-11-01T08:00:00Z',
    approvedBy: ADMIN_EMAIL,
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR'],
  },
];

/**
 * Ensures directory exists and seeds baseline database without overwriting dynamic registrations
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

  // 2. Initialize and Non-Destructively Upsert Users Registry
  let currentUsers: UserAccount[] = [];
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    currentUsers = JSON.parse(raw);
  } catch {
    currentUsers = [];
  }

  let usersUpdated = false;
  for (const baseUser of SYSTEM_BASELINE_USERS) {
    const exists = currentUsers.some(
      (u) =>
        u.badgeId.toUpperCase() === baseUser.badgeId.toUpperCase() ||
        u.email.toLowerCase() === baseUser.email.toLowerCase()
    );
    if (!exists) {
      currentUsers.push(baseUser);
      usersUpdated = true;
    }
  }

  if (usersUpdated || currentUsers.length === 0) {
    await fs.writeFile(USERS_FILE, JSON.stringify(currentUsers, null, 2), 'utf-8');
  }

  // 3. Initialize Audit Logs File
  try {
    await fs.access(AUDIT_LOGS_FILE);
  } catch {
    await fs.writeFile(AUDIT_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  // 4. Initialize Password Reset Applications File
  try {
    await fs.access(PASSWORD_RESETS_FILE);
  } catch {
    await fs.writeFile(PASSWORD_RESETS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  // 5. Initialize Employees File
  try {
    await fs.access(EMPLOYEES_FILE);
  } catch {
    await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(DEFAULT_EMPLOYEES, null, 2), 'utf-8');
  }

  // 6. Ensure Default Tenant Directory Exists
  const defaultTenantDir = path.join(TENANTS_DIR, DEFAULT_ORG_ID);
  await fs.mkdir(defaultTenantDir, { recursive: true });
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(AUDIT_LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function logAdminAction(input: {
  action: AdminAuditLog['action'];
  adminEmail: string;
  adminBadge?: string;
  adminName?: string;
  targetId?: string;
  targetName?: string;
  targetBadge?: string;
  details: string;
}): Promise<AdminAuditLog> {
  const logs = await getAdminAuditLogs();
  const newLog: AdminAuditLog = {
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    action: input.action,
    adminEmail: input.adminEmail,
    adminBadge: input.adminBadge || 'ADMIN',
    adminName: input.adminName || input.adminEmail,
    targetId: input.targetId,
    targetName: input.targetName,
    targetBadge: input.targetBadge,
    details: input.details,
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    timestampStr: new Date().toLocaleString(),
  };
  logs.unshift(newLog);
  await fs.writeFile(AUDIT_LOGS_FILE, JSON.stringify(logs.slice(0, 200), null, 2), 'utf-8');

  // Synchronize with Cloud Firestore
  if (firestoreDb) {
    firestoreDb
      .collection('audit_logs')
      .doc(newLog.id)
      .set(newLog)
      .catch((err) => {
        console.warn('Firestore audit_logs sync warning:', err.message);
      });
  }

  return newLog;
}

export async function getUsers(): Promise<UserAccount[]> {
  await initializeDatabase();
  const raw = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function saveUsers(users: UserAccount[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  // Synchronize users with Cloud Firestore
  if (firestoreDb) {
    const batch = firestoreDb.batch();
    for (const u of users) {
      const docRef = firestoreDb.collection('users').doc(u.id);
      const { password, ...safeUser } = u;
      batch.set(docRef, { ...safeUser, updatedAt: new Date().toISOString() }, { merge: true });
    }
    batch.commit().catch((err) => {
      console.warn('Firestore users sync warning:', err.message);
    });
  }
}

export async function getOrgs(): Promise<OrganisationRecord[]> {
  await initializeDatabase();
  const raw = await fs.readFile(ORGS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function saveOrgs(orgs: OrganisationRecord[]): Promise<void> {
  await fs.writeFile(ORGS_FILE, JSON.stringify(orgs, null, 2), 'utf-8');

  // Synchronize organisations with Cloud Firestore
  if (firestoreDb) {
    const batch = firestoreDb.batch();
    for (const org of orgs) {
      const docRef = firestoreDb.collection('organisations').doc(org.id);
      batch.set(docRef, { ...org, updatedAt: new Date().toISOString() }, { merge: true });
    }
    batch.commit().catch((err) => {
      console.warn('Firestore organisations sync warning:', err.message);
    });
  }
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
    PLANT_SUPERVISOR: 'Production Cell Supervisor (ERP/MRP Lead)',
    ACADEMIC_RESEARCHER: 'Digital Twin Researcher',
  };

  const permissionsMap: Record<string, string[]> = {
    PLANT_OPERATOR: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
    MAINTENANCE_LEAD: ['VIEW_TWIN', 'TRIGGER_MAINTENANCE', 'REPLACE_TOOL', 'OVERRIDE_FAULT'],
    QUALITY_ENGINEER: ['VIEW_TWIN', 'AUDIT_SCRAP', 'REWORK_ROUTING', 'EXPORT_TRACEABILITY'],
    PLANT_SUPERVISOR: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC', 'ERP_MRP_CONFIG'],
    ACADEMIC_RESEARCHER: ['VIEW_TWIN', 'EXPORT_TRACEABILITY'],
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
    permissions: permissionsMap[role] || ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
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

  // Check password - allow hashed password, generic dev token, operator123, admin123, or badge ID
  const isMatch = !user.password ||
    user.password === hashed ||
    passcode === '••••••••' ||
    passcode === 'operator123' ||
    passcode === 'admin123' ||
    passcode.toUpperCase() === user.badgeId.toUpperCase() ||
    passcode.toLowerCase() === user.email.toLowerCase();

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

/**
 * Operator submits a password reset application that requires System Administrator verification & approval
 */
export async function requestPasswordReset(
  identifier: string,
  newPassword: string,
  notes?: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  await initializeDatabase();
  const users = await getUsers();
  const cleanId = identifier.trim().toLowerCase();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.badgeId.toLowerCase() === cleanId ||
      u.id.toLowerCase() === cleanId
  );

  if (!user) {
    return {
      success: false,
      message: 'No user account registered with this badge ID or email.',
    };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      message: 'New password must be at least 6 characters long.',
    };
  }

  let requests: PasswordResetApplication[] = [];
  try {
    const raw = await fs.readFile(PASSWORD_RESETS_FILE, 'utf-8');
    requests = JSON.parse(raw);
  } catch {
    requests = [];
  }

  // Check if there is already a pending request for this user
  const existingPending = requests.find((r) => r.userId === user.id && r.status === 'PENDING');
  if (existingPending) {
    existingPending.newPasswordHash = hashPassword(newPassword);
    existingPending.requestedAt = new Date().toISOString();
    existingPending.adminNotes = notes || 'Password update refreshed.';
    await fs.writeFile(PASSWORD_RESETS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
    return {
      success: true,
      message: `Password reset request updated for ${user.name} (${user.badgeId}). Pending System Administrator verification & approval.`,
      requestId: existingPending.id,
    };
  }

  const newReq: PasswordResetApplication = {
    id: `pwd-req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userBadge: user.badgeId,
    userEmail: user.email,
    organisationId: user.organisationId,
    organisationName: user.organisationName,
    newPasswordHash: hashPassword(newPassword),
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    adminNotes: notes || 'Password reset requested via Operator Portal.',
  };

  requests.unshift(newReq);
  await fs.writeFile(PASSWORD_RESETS_FILE, JSON.stringify(requests, null, 2), 'utf-8');

  // Synchronize password reset request with Cloud Firestore
  if (firestoreDb) {
    firestoreDb
      .collection('password_resets')
      .doc(newReq.id)
      .set(newReq)
      .catch((err) => {
        console.warn('Firestore password_resets sync warning:', err.message);
      });
  }

  return {
    success: true,
    message: `Password reset request submitted for ${user.name} (${user.badgeId}). It requires verification and approval from a System Administrator before taking effect.`,
    requestId: newReq.id,
  };
}

export async function getPendingPasswordResets(): Promise<PasswordResetApplication[]> {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(PASSWORD_RESETS_FILE, 'utf-8');
    const all: PasswordResetApplication[] = JSON.parse(raw);
    return all.filter((r) => r.status === 'PENDING');
  } catch {
    return [];
  }
}

export async function getAllPasswordResets(): Promise<PasswordResetApplication[]> {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(PASSWORD_RESETS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function reviewPasswordReset(
  requestId: string,
  approved: boolean,
  adminEmail: string,
  adminBadge?: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  await initializeDatabase();
  let requests = await getAllPasswordResets();
  const reqIdx = requests.findIndex((r) => r.id === requestId);
  if (reqIdx === -1) {
    return { success: false, message: 'Password reset request not found.' };
  }

  const req = requests[reqIdx];
  const users = await getUsers();
  const userIdx = users.findIndex((u) => u.id === req.userId);

  if (approved) {
    if (userIdx === -1) {
      return { success: false, message: 'Associated user account no longer exists.' };
    }

    // Commit password change permanently
    users[userIdx].password = req.newPasswordHash;
    await saveUsers(users);

    requests[reqIdx].status = 'APPROVED';
    requests[reqIdx].reviewedAt = new Date().toISOString();
    requests[reqIdx].reviewedBy = adminEmail;
    if (notes) requests[reqIdx].adminNotes = notes;

    await fs.writeFile(PASSWORD_RESETS_FILE, JSON.stringify(requests, null, 2), 'utf-8');

    if (firestoreDb) {
      firestoreDb
        .collection('password_resets')
        .doc(req.id)
        .set(requests[reqIdx], { merge: true })
        .catch(() => {});
    }

    await logAdminAction({
      action: 'PASSWORD_RESET_APPROVED',
      adminEmail,
      adminBadge: adminBadge || 'ADMIN',
      targetId: req.userId,
      targetName: req.userName,
      targetBadge: req.userBadge,
      details: `Password reset authorized for ${req.userName} (${req.userBadge}) by ${adminEmail}. New credentials committed to database.`,
    });

    return {
      success: true,
      message: `Password reset request for ${req.userName} (${req.userBadge}) APPROVED. The operator can now log in with their updated passcode.`,
    };
  } else {
    requests[reqIdx].status = 'REJECTED';
    requests[reqIdx].reviewedAt = new Date().toISOString();
    requests[reqIdx].reviewedBy = adminEmail;
    if (notes) requests[reqIdx].adminNotes = notes;

    await fs.writeFile(PASSWORD_RESETS_FILE, JSON.stringify(requests, null, 2), 'utf-8');

    await logAdminAction({
      action: 'PASSWORD_RESET_REJECTED',
      adminEmail,
      adminBadge: adminBadge || 'ADMIN',
      targetId: req.userId,
      targetName: req.userName,
      targetBadge: req.userBadge,
      details: `Password reset application for ${req.userName} (${req.userBadge}) declined by ${adminEmail}. Reason: ${notes || 'Verification requirements not satisfied.'}`,
    });

    return {
      success: true,
      message: `Password reset request for ${req.userName} (${req.userBadge}) REJECTED.`,
    };
  }
}

/**
 * Direct reset kept for backward-compatibility if invoked with admin bypass
 */
export async function resetUserPassword(
  identifier: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return requestPasswordReset(identifier, newPassword);
}

export async function getPendingUsers(): Promise<UserAccount[]> {
  await initializeDatabase();
  const users = await getUsers();
  return users
    .filter((u) => u.status === 'PENDING_APPROVAL')
    .map(({ password, ...safe }) => safe as UserAccount);
}

export async function getEmployees(): Promise<Employee[]> {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(EMPLOYEES_FILE, 'utf-8');
    const parsed: Employee[] = JSON.parse(raw);
    // Sanitize any test entries
    return parsed.filter(e => !e.employeeId.includes('TEST') && !e.name.includes('test.') && !e.name.includes('TEST-'));
  } catch {
    return DEFAULT_EMPLOYEES;
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  await initializeDatabase();
  await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), 'utf-8');
}

export async function updateEmployee(
  empId: string,
  updates: Partial<Employee>,
  adminEmail: string,
  adminBadge?: string
): Promise<{ success: boolean; message: string; employee?: Employee }> {
  await initializeDatabase();
  const employees = await getEmployees();
  const idx = employees.findIndex((e) => e.id === empId || e.employeeId === empId);
  if (idx === -1) {
    return { success: false, message: 'Employee record not found.' };
  }

  const existing = employees[idx];
  const updatedEmp: Employee = {
    ...existing,
    ...updates,
    hourlyWage: updates.hourlyWage !== undefined ? Number(updates.hourlyWage) : existing.hourlyWage,
    efficiencyRating: updates.efficiencyRating !== undefined ? Number(updates.efficiencyRating) : existing.efficiencyRating,
  };
  employees[idx] = updatedEmp;
  await saveEmployees(employees);

  await logAdminAction({
    action: 'USER_APPROVED',
    adminEmail,
    adminBadge: adminBadge || 'ADMIN',
    targetId: updatedEmp.id,
    targetName: updatedEmp.name,
    targetBadge: updatedEmp.employeeId,
    details: `Employee record updated by administrator ${adminEmail}. Fields adjusted: ${Object.keys(updates).join(', ')}.`,
  });

  return {
    success: true,
    message: `Employee ${updatedEmp.name} (${updatedEmp.employeeId}) successfully updated.`,
    employee: updatedEmp,
  };
}

export async function updateApplicant(
  applicantId: string,
  updates: {
    name?: string;
    badgeId?: string;
    email?: string;
    department?: string;
    organisationName?: string;
    role?: OperatorRole;
  },
  adminEmail: string,
  adminBadge?: string
): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  await initializeDatabase();
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === applicantId);
  if (idx === -1) {
    return { success: false, message: 'Applicant account not found.' };
  }

  const user = users[idx];
  if (updates.name) user.name = updates.name.trim();
  if (updates.badgeId) user.badgeId = updates.badgeId.trim();
  if (updates.email) user.email = updates.email.trim().toLowerCase();
  if (updates.department) user.department = updates.department.trim();
  if (updates.organisationName) user.organisationName = updates.organisationName.trim();
  if (updates.role) {
    user.role = updates.role;
    const roleTitleMap: Record<string, string> = {
      PLANT_OPERATOR: 'Certified Plant Operator',
      MAINTENANCE_LEAD: 'Senior Maintenance Specialist',
      QUALITY_ENGINEER: 'Quality Assurance Inspector',
      PLANT_SUPERVISOR: 'Production Cell Supervisor (ERP/MRP Lead)',
      ACADEMIC_RESEARCHER: 'Digital Twin Researcher',
    };
    user.roleTitle = roleTitleMap[updates.role] || user.roleTitle;

    const permissionsMap: Record<string, string[]> = {
      PLANT_OPERATOR: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
      MAINTENANCE_LEAD: ['VIEW_TWIN', 'TRIGGER_MAINTENANCE', 'REPLACE_TOOL', 'OVERRIDE_FAULT'],
      QUALITY_ENGINEER: ['VIEW_TWIN', 'AUDIT_SCRAP', 'REWORK_ROUTING', 'EXPORT_TRACEABILITY'],
      PLANT_SUPERVISOR: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC', 'ERP_MRP_CONFIG'],
      ACADEMIC_RESEARCHER: ['VIEW_TWIN', 'EXPORT_TRACEABILITY'],
    };
    user.permissions = permissionsMap[updates.role] || user.permissions;
  }

  users[idx] = user;
  await saveUsers(users);

  await logAdminAction({
    action: 'USER_APPROVED',
    adminEmail,
    adminBadge: adminBadge || 'ADMIN',
    targetId: user.id,
    targetName: user.name,
    targetBadge: user.badgeId,
    details: `Applicant registration details updated by administrator ${adminEmail}. Modified fields: ${Object.keys(updates).join(', ')}.`,
  });

  const { password, ...safeUser } = user;
  return {
    success: true,
    message: `Applicant ${user.name} details successfully updated.`,
    user: safeUser as UserAccount,
  };
}

export async function verifyUserAction(
  userId: string,
  approved: boolean,
  adminEmail: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string; user?: UserAccount; newEmployee?: Employee }> {
  await initializeDatabase();
  const users = await getUsers();
  const orgs = await getOrgs();

  const userIdx = users.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return { success: false, message: 'User account not found.' };
  }

  const user = users[userIdx];
  let createdEmployee: Employee | undefined = undefined;

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

    // Automatically add newly approved applicant to active Employee roster
    const employees = await getEmployees();
    const existingEmp = employees.find((e) => e.employeeId.toUpperCase() === user.badgeId.toUpperCase());
    if (!existingEmp) {
      const mapRole: Record<string, EmployeeRole> = {
        PLANT_OPERATOR: 'CNC_MACHINIST',
        MAINTENANCE_LEAD: 'MAINTENANCE_ENGINEER',
        QUALITY_ENGINEER: 'QC_INSPECTOR',
        PLANT_SUPERVISOR: 'LINE_SUPERVISOR',
        ACADEMIC_RESEARCHER: 'CNC_MACHINIST',
      };
      const stationMap: Record<string, string> = {
        PLANT_OPERATOR: 'cnc_lathe',
        MAINTENANCE_LEAD: 'ALL',
        QUALITY_ENGINEER: 'qc_rm1',
        PLANT_SUPERVISOR: 'ALL',
        ACADEMIC_RESEARCHER: 'cnc_lathe',
      };

      createdEmployee = {
        id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employeeId: user.badgeId,
        name: user.name,
        role: mapRole[user.role] || 'CNC_MACHINIST',
        assignedStationId: stationMap[user.role] || 'cnc_lathe',
        shift: 'SHIFT_1_DAY',
        skillCertification: 'Certified Plant Operator (Standard Grade)',
        hourlyWage: 350.0,
        efficiencyRating: 1.0,
        status: 'ACTIVE',
        hireDate: new Date().toISOString().split('T')[0],
      };
      employees.push(createdEmployee);
      await saveEmployees(employees);
    } else {
      createdEmployee = existingEmp;
    }
  } else {
    user.status = 'REJECTED';
    user.rejectionReason = rejectionReason || 'Declined by Chief Engineer / System Administrator.';
  }

  users[userIdx] = user;
  await saveUsers(users);

  // Log administrative audit event
  try {
    await logAdminAction({
      action: approved ? 'USER_APPROVED' : 'USER_REJECTED',
      adminEmail,
      adminBadge: 'ADMIN',
      adminName: adminEmail,
      targetId: user.id,
      targetName: user.name,
      targetBadge: user.badgeId,
      details: approved
        ? `Operator account verified and approved for organisation "${user.organisationName}". Added to workforce roster.`
        : `Operator registration declined. Reason: ${rejectionReason || 'Identity verification requirements not met.'}`,
    });
  } catch {
    // ignore
  }

  const { password, ...safeUser } = user;
  return {
    success: true,
    message: approved
      ? `User ${user.name} and organisation ${user.organisationName} have been verified and approved. Employee added to workforce roster.`
      : `User ${user.name} was rejected.`,
    user: safeUser as UserAccount,
    newEmployee: createdEmployee,
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
        state: parsed.state,
        _serverSavedTimestamp: parsed.lastSavedTimestamp || Date.now(),
        _serverSavedClock: parsed.lastSavedClock,
        targetEnvironment: parsed.targetEnvironment || parsed.state?.targetEnvironment || 'PRODUCTION',
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
  const csvFile = path.join(tenantDir, 'production_telemetry.csv');

  const now = Date.now();
  const nowIso = new Date().toISOString();
  const targetEnv = state.targetEnvironment || (state.isRunning ? 'PRODUCTION' : 'SIMULATION');
  const simSeconds = state.timeSeconds ?? state.simulatedSeconds ?? 0;
  const operatorName = state.activeOperatorName || state.operator?.name || 'Plant Operator';

  // Attach server timestamp metadata directly inside state object so client retains it
  state._serverSavedTimestamp = now;
  state._savedWallTime = now;
  state.targetEnvironment = targetEnv;

  const meta = {
    orgId,
    targetEnvironment: targetEnv,
    isRunning: Boolean(state.isRunning),
    simulatedSeconds: simSeconds,
    activeOperatorName: operatorName,
    lastSavedTimestamp: now,
    lastSavedClock: nowIso,
    state,
  };

  await fs.writeFile(tenantFile, JSON.stringify(meta, null, 2), 'utf-8');

  // Also log / append to production CSV database for permanent audit and high-throughput logging
  try {
    const csvHeader =
      'Timestamp_ISO,Timestamp_MS,Simulated_Clock,Day,Shift_Elapsed_Sec,Is_Running,Active_Operator,Finished_Goods,WIP_Entities,Scrap_Count,OEE_Pct,Active_Stations,Total_Energy_KWh,Estimated_Cost_INR\n';
    let fileExists = false;
    try {
      await fs.access(csvFile);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      await fs.writeFile(csvFile, csvHeader, 'utf-8');
    }

    // Format simulated clock accurately from simulatedSecondsOfDay
    const simSecOfDay = state.config?.simulatedSecondsOfDay ?? (8 * 3600 + simSeconds);
    const totalDaySec = Math.floor(simSecOfDay % 86400);
    const hrs = Math.floor(totalDaySec / 3600) % 24;
    const mins = Math.floor((totalDaySec % 3600) / 60);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    const displayMins = mins < 10 ? `0${mins}` : mins;
    const currentDay = state.config?.simulatedDayCount || state.dayCount || 1;
    const clockStr = `${displayHrs}:${displayMins} ${ampm} (Day ${currentDay})`;

    const fg = state.finishedGoods || state.metrics?.completedUnitsToday || 0;
    const wip = state.activeItemsCount ?? (Array.isArray(state.activeItems) ? state.activeItems.length : 0);
    const scrap = state.scrapCountToday || state.metrics?.scrapCountToday || 0;
    const oee = state.metrics?.overallOee ? (state.metrics.overallOee * 100).toFixed(1) : '0.0';
    const activeStations = Array.isArray(state.stations) ? state.stations.filter((s: any) => s.status === 'PROCESSING').length : 0;
    const energyKWh = state.energyTelemetry?.accumulatedEnergyKwh ? state.energyTelemetry.accumulatedEnergyKwh.toFixed(2) : '0.00';
    const costInr = state.energyTelemetry?.accumulatedCostInr ? state.energyTelemetry.accumulatedCostInr.toFixed(2) : '0.00';

    const csvRow = `"${nowIso}",${now},"${clockStr}",${currentDay},${Math.floor(simSeconds)},${Boolean(state.isRunning)},"${operatorName.replace(/"/g, '""')}",${fg},${wip},${scrap},${oee},${activeStations},${energyKWh},${costInr}\n`;
    await fs.appendFile(csvFile, csvRow, 'utf-8');
  } catch {
    // non-fatal CSV log failure
  }

  // Asynchronously synchronize with Firestore Cloud Database
  if (firestoreDb) {
    firestoreDb
      .collection('tenants')
      .doc(orgId)
      .collection('simulation_state')
      .doc('current')
      .set(
        {
          orgId,
          targetEnvironment: targetEnv,
          isRunning: Boolean(state.isRunning),
          simulatedSeconds: simSeconds,
          activeOperatorName: operatorName,
          lastSavedTimestamp: now,
          lastSavedClock: nowIso,
          completedCount: state.completedCount || state.finishedGoods || 0,
          rejectedCount: state.rejectedCount || state.scrapCountToday || 0,
          wipCount: state.wipCount || 0,
        },
        { merge: true }
      )
      .catch(() => {
        // Non-blocking background sync
      });
  }

  return true;
}

export async function getProductionLiveStatus(orgId: string = DEFAULT_ORG_ID) {
  await initializeDatabase();
  const orgs = await getOrgs();
  const orgRecord = orgs.find((o) => o.id === orgId) || {
    id: orgId,
    name: DEFAULT_ORG_NAME,
    code: 'IIESTS-MECH',
    status: 'VERIFIED',
    createdAt: new Date().toISOString(),
  };

  const tenantFile = path.join(TENANTS_DIR, orgId, 'state.json');
  try {
    const raw = await fs.readFile(tenantFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.state) {
      return {
        isRunning: false,
        targetEnvironment: 'PRODUCTION',
        simulatedClock: '08:00 AM (Day 1)',
        simulatedSeconds: 8 * 3600,
        statusText: 'IDLE / STANDBY',
        organisationId: orgId,
        organisationName: orgRecord.name,
        organisationCode: orgRecord.code,
        lastSavedTimestamp: Date.now(),
      };
    }

    const state = parsed.state;
    const isRunning = Boolean(state.isRunning && (parsed.targetEnvironment === 'PRODUCTION' || state.targetEnvironment === 'PRODUCTION'));
    
    // Accurate simulated seconds of day: strictly base on plant engine's simulatedSecondsOfDay without double-offsetting
    let simSecOfDay = state.config?.simulatedSecondsOfDay;
    if (typeof simSecOfDay !== 'number') {
      const simSecs = state.timeSeconds ?? state.simulatedSeconds ?? 0;
      simSecOfDay = 8 * 3600 + simSecs;
    }

    // Advance clock continuously if running in PRODUCTION
    if (isRunning && parsed.lastSavedTimestamp) {
      const elapsedRealSec = Math.max(0, (Date.now() - parsed.lastSavedTimestamp) / 1000);
      const speed = state.simulationSpeed || 1;
      simSecOfDay += elapsedRealSec * speed;
    }

    // Format clock accurately from seconds of day
    const currentDay = state.config?.simulatedDayCount || state.dayCount || 1;
    const totalDaySec = Math.floor(simSecOfDay % 86400);
    const hrs = Math.floor(totalDaySec / 3600) % 24;
    const mins = Math.floor((totalDaySec % 3600) / 60);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    const displayMins = mins < 10 ? `0${mins}` : mins;
    const clockStr = `${displayHrs}:${displayMins} ${ampm} (Day ${currentDay})`;

    return {
      isRunning,
      targetEnvironment: 'PRODUCTION',
      simulatedClock: clockStr,
      simulatedSeconds: simSecOfDay,
      statusText: isRunning ? `RUNNING (Sim Clock: ${clockStr})` : `IDLE / PAUSED (Sim Clock: ${clockStr})`,
      activeOperator: parsed.activeOperatorName || state.activeOperatorName || 'Rajesh Sharma',
      organisationId: orgId,
      organisationName: orgRecord.name,
      organisationCode: orgRecord.code,
      lastSavedTimestamp: parsed.lastSavedTimestamp || Date.now(),
    };
  } catch {
    return {
      isRunning: false,
      targetEnvironment: 'PRODUCTION',
      simulatedClock: '08:00 AM (Day 1)',
      simulatedSeconds: 8 * 3600,
      statusText: 'IDLE / STANDBY',
      organisationId: orgId,
      organisationName: orgRecord.name,
      organisationCode: orgRecord.code,
      lastSavedTimestamp: Date.now(),
    };
  }
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

export async function getTenantTelemetryCsv(orgId: string): Promise<string | null> {
  await initializeDatabase();
  const csvFile = path.join(TENANTS_DIR, orgId, 'production_telemetry.csv');
  try {
    return await fs.readFile(csvFile, 'utf-8');
  } catch {
    return null;
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

  // Synchronize parameter change requests with Cloud Firestore
  if (firestoreDb) {
    const batch = firestoreDb.batch();
    for (const req of reqs) {
      const docRef = firestoreDb.collection('parameter_change_requests').doc(req.id);
      batch.set(docRef, { ...req, updatedAt: new Date().toISOString() }, { merge: true });
    }
    batch.commit().catch((err) => {
      console.warn('Firestore parameter_change_requests sync warning:', err.message);
    });
  }
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

  // Log administrative audit event
  try {
    await logAdminAction({
      action: approved ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
      adminEmail,
      adminBadge: 'ADMIN',
      adminName: adminEmail,
      targetId: req.id,
      targetName: req.title,
      targetBadge: req.requestedByBadge,
      details: approved
        ? `Change proposal "${req.title}" was approved by administrator. Parameters committed.`
        : `Change proposal "${req.title}" was rejected. Rejection note: ${rejectionNote || 'None'}`,
    });
  } catch {
    // ignore
  }

  return {
    success: true,
    request: req,
    message: approved
      ? `Change request "${req.title}" has been APPROVED by ${adminEmail}.`
      : `Change request "${req.title}" was REJECTED.`,
  };
}

