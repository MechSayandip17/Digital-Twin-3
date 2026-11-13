export type TwinEnvironment = 'PRODUCTION' | 'SIMULATION' | 'HISTORICAL';

export type OperatorRole = 
  | 'PLANT_OPERATOR'
  | 'MAINTENANCE_LEAD'
  | 'QUALITY_ENGINEER'
  | 'PLANT_SUPERVISOR'
  | 'ACADEMIC_RESEARCHER'
  | 'ERP_MRP_CONTROLLER'
  | 'MRP_ERP_LEAD'
  | 'SYSTEM_ADMIN';

export type UserApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  name: string;
  badgeId: string;
  role: OperatorRole;
  roleTitle: string;
  organisationId: string;
  organisationName: string;
  department: string;
  status: UserApprovalStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  permissions: string[];
}

export interface OrganisationRecord {
  id: string;
  name: string;
  code: string;
  status: 'VERIFIED' | 'PENDING';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  adminEmail?: string;
}

export interface OperatorProfile {
  id: string;
  email?: string;
  name: string;
  badgeId: string;
  role: OperatorRole;
  roleTitle: string;
  organisationId: string;
  organisation: string;
  department: string;
  avatarUrl?: string;
  permissions: string[];
  status?: UserApprovalStatus;
  lastLoginTime?: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  operator: OperatorProfile;
  environment: TwinEnvironment;
  sessionToken: string;
  loginTimestamp: number;
}

export const ADMIN_EMAIL = 'sayandipmallickclassf@gmail.com';
export const DEFAULT_ORG_ID = 'iiests-mech';
export const DEFAULT_ORG_NAME = 'Mechanical Engg. Dept., IIESTS';

export interface AdminRecord {
  id: string;
  name: string;
  rollNumber: string;
  badgeId: string;
  email: string;
  roleTitle: string;
  canEditAnything: true;
}

export const DESIGNATED_ADMINS: AdminRecord[] = [
  {
    id: 'admin-me',
    name: 'Sayandip Mallick (Chief Admin)',
    rollNumber: '2023MEB017',
    badgeId: 'CHIEF-ENG-01',
    email: 'sayandipmallickclassf@gmail.com',
    roleTitle: 'Chief Engineer & Lead System Administrator',
    canEditAnything: true,
  },
  {
    id: 'admin-nilesh',
    name: 'Nilesh Banik',
    rollNumber: '2023MEB003',
    badgeId: '2023MEB003',
    email: 'nilesh.banik@mech.iiests.ac.in',
    roleTitle: 'System Administrator & Reliability Lead',
    canEditAnything: true,
  },
  {
    id: 'admin-soumyajit',
    name: 'Soumyajit Chakraborty',
    rollNumber: '2023MEB015',
    badgeId: '2023MEB015',
    email: 'soumyajit.chakraborty@mech.iiests.ac.in',
    roleTitle: 'System Administrator & Operations Architect',
    canEditAnything: true,
  },
  {
    id: 'admin-chitrayan',
    name: 'Chitrayan Biswas',
    rollNumber: '2023MEB019',
    badgeId: '2023MEB019',
    email: 'chitrayan.biswas@mech.iiests.ac.in',
    roleTitle: 'System Administrator & Quality Governor',
    canEditAnything: true,
  },
];

export interface ParameterChangeRequest {
  id: string;
  requestedByUserId?: string;
  requestedByName: string;
  requestedByRole?: string;
  requestedByBadge: string;
  requesterName?: string;
  requesterBadge?: string;
  requesterEmail?: string;
  organisationId: string;
  organisationName?: string;
  timestamp?: number;
  timestampStr?: string;
  createdAt?: string;
  title?: string;
  category?: 'SHIFT_LOGISTICS' | 'CYCLE_TIMES' | 'QC_TOLERANCES' | 'STATION_CONFIG' | 'UNLOADING_MODE' | 'CONVEYOR_DISPATCH';
  description?: string;
  reason?: string;
  status: 'PENDING_ADMIN_APPROVAL' | 'APPROVED' | 'REJECTED';
  proposedChanges?: Record<string, any>;
  proposedConfigChanges?: Record<string, any>;
  proposedStationChanges?: { stationId: string; changes: Record<string, any> };
  reviewedByAdmin?: string;
  reviewedAt?: string;
  rejectionNote?: string;
}

export interface PasswordResetApplication {
  id: string;
  userId: string;
  userName: string;
  userBadge: string;
  userEmail: string;
  organisationId: string;
  organisationName: string;
  newPasswordHash: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface AdminAuditLog {
  id: string;
  action:
    | 'USER_APPROVED'
    | 'USER_REJECTED'
    | 'PROPOSAL_APPROVED'
    | 'PROPOSAL_REJECTED'
    | 'PASSWORD_RESET_APPROVED'
    | 'PASSWORD_RESET_REJECTED'
    | 'SIMULATION_RESET'
    | 'SIMULATION_STOPPED'
    | 'SIMULATION_START'
    | 'SIMULATION_PAUSE'
    | 'ADVANCE_DAY'
    | 'EMPLOYEE_UPDATED'
    | 'PARAMETER_MODIFIED'
    | 'USER_REGISTERED';

  adminEmail: string;
  adminBadge: string;
  adminName: string;
  targetId?: string;
  targetName?: string;
  targetBadge?: string;
  details: string;
  timestamp: number;
  timestampIso: string;
  timestampStr: string;
}

export const PRECONFIGURED_OPERATORS: OperatorProfile[] = [
  // 1. The 4 Designated System Administrators (Full edit/change/approve authority)
  {
    id: 'admin-me',
    email: 'sayandipmallickclassf@gmail.com',
    name: 'Sayandip Mallick (Chief Admin)',
    badgeId: 'CHIEF-ENG-01',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'Chief Engineer & Lead System Administrator',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing Directorate',
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
    status: 'APPROVED',
  },
  {
    id: 'admin-nilesh',
    email: 'nilesh.banik@mech.iiests.ac.in',
    name: 'Nilesh Banik',
    badgeId: '2023MEB003',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Reliability Lead',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing Directorate',
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
    status: 'APPROVED',
  },
  {
    id: 'admin-soumyajit',
    email: 'soumyajit.chakraborty@mech.iiests.ac.in',
    name: 'Soumyajit Chakraborty',
    badgeId: '2023MEB015',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Operations Architect',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing Directorate',
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
    status: 'APPROVED',
  },
  {
    id: 'admin-chitrayan',
    email: 'chitrayan.biswas@mech.iiests.ac.in',
    name: 'Chitrayan Biswas',
    badgeId: '2023MEB019',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'System Administrator & Quality Governor',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing Directorate',
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM', 'STOP_SIMULATION', 'APPROVE_PARAMETER_CHANGES'],
    status: 'APPROVED',
  },
  // 2. Production Cell Operators & Engineers (From Employee Roster)
  {
    id: 'op-101',
    email: 'operator@iiests.ac.in',
    name: 'Rajesh Sharma',
    badgeId: 'ME-OPR-4412',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Lead Shift CNC Machinist',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing & Robotics Lab',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'MANUAL_STOP', 'LOG_QC'],
    status: 'APPROVED',
  },
  {
    id: 'op-102',
    email: 'priyanka.banerjee@mech.iiests.ac.in',
    name: 'Priyanka Banerjee',
    badgeId: 'ME-MNT-8891',
    role: 'MAINTENANCE_LEAD',
    roleTitle: 'Maintenance Engineer',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Condition Monitoring & Reliability Lab',
    permissions: ['VIEW_TWIN', 'TRIGGER_MAINTENANCE', 'REPLACE_TOOL', 'OVERRIDE_FAULT'],
    status: 'APPROVED',
  },
  {
    id: 'op-103',
    email: 'anirban.sengupta@mech.iiests.ac.in',
    name: 'Anirban Sengupta',
    badgeId: 'ME-QAC-3309',
    role: 'QUALITY_ENGINEER',
    roleTitle: 'QC Inspector',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Metrology & NDT Division',
    permissions: ['VIEW_TWIN', 'AUDIT_SCRAP', 'REWORK_ROUTING', 'EXPORT_TRACEABILITY'],
    status: 'APPROVED',
  },
  {
    id: 'op-104',
    email: 'vikram.verma@tata-defense.in',
    name: 'Vikram Verma',
    badgeId: 'TASL-OPR-881',
    role: 'PLANT_OPERATOR',
    roleTitle: 'CNC Machinist (5-Axis Milling)',
    organisationId: 'tasl-aero',
    organisation: 'Tata Advanced Systems Aerospace Unit',
    department: 'Precision Components Division',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
    status: 'APPROVED',
  },
  {
    id: 'op-105',
    email: 'maria.santos@mech.iiests.ac.in',
    name: 'Maria Santos',
    badgeId: 'ME-OPR-4413',
    role: 'PLANT_OPERATOR',
    roleTitle: 'CNC Shaping & Hobbing Machinist',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Precision Components Division',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
    status: 'APPROVED',
  },
  {
    id: 'op-106',
    email: 'karan.verma@mech.iiests.ac.in',
    name: 'Karan Verma',
    badgeId: 'ME-ASM-9021',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Final Assembly Specialist',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Final Assembly Division',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
    status: 'APPROVED',
  },
  {
    id: 'op-107',
    email: 'deepak.kumar@mech.iiests.ac.in',
    name: 'Deepak Kumar',
    badgeId: 'ME-PKG-6110',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Packaging & Warehouse Logistics Lead',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Packaging & Dispatch Hub',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'LOG_QC'],
    status: 'APPROVED',
  },
];
