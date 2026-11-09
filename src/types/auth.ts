export type TwinEnvironment = 'PRODUCTION' | 'SIMULATION' | 'HISTORICAL';

export type OperatorRole = 
  | 'PLANT_OPERATOR'
  | 'MAINTENANCE_LEAD'
  | 'QUALITY_ENGINEER'
  | 'PLANT_SUPERVISOR'
  | 'ACADEMIC_RESEARCHER'
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

export const PRECONFIGURED_OPERATORS: OperatorProfile[] = [
  {
    id: 'op-admin',
    email: 'sayandipmallickclassf@gmail.com',
    name: 'Chief Engineer & System Admin',
    badgeId: 'CHIEF-ENG-01',
    role: 'SYSTEM_ADMIN',
    roleTitle: 'Chief Engineer & Digital Twin Architect',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing & Digital Twin Directorate',
    permissions: ['ALL_PERMISSIONS', 'ADMIN_VERIFY', 'ERP_MRP_CONFIG', 'FINANCIAL_ADMIN', 'RESET_SIM'],
    status: 'APPROVED',
  },
  {
    id: 'op-101',
    email: 'operator@iiests.ac.in',
    name: 'Rajesh Sharma',
    badgeId: 'ME-OPR-4412',
    role: 'PLANT_OPERATOR',
    roleTitle: 'Lead Shift Operator',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Advanced Manufacturing & Robotics Lab',
    permissions: ['VIEW_TWIN', 'CONTROL_CONVEYOR', 'MANUAL_STOP', 'LOG_QC'],
    status: 'APPROVED',
  },
  {
    id: 'op-102',
    email: 'priyanka.maint@iiests.ac.in',
    name: 'Priyanka Banerjee',
    badgeId: 'ME-MNT-8891',
    role: 'MAINTENANCE_LEAD',
    roleTitle: 'Senior Maintenance Specialist',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Condition Monitoring & Reliability Lab',
    permissions: ['VIEW_TWIN', 'TRIGGER_MAINTENANCE', 'REPLACE_TOOL', 'OVERRIDE_FAULT'],
    status: 'APPROVED',
  },
  {
    id: 'op-103',
    email: 'anirban.qa@iiests.ac.in',
    name: 'Anirban Sengupta',
    badgeId: 'ME-QAC-3309',
    role: 'QUALITY_ENGINEER',
    roleTitle: 'Quality Assurance Inspector',
    organisationId: 'iiests-mech',
    organisation: 'Mechanical Engg. Dept., IIESTS',
    department: 'Metrology & NDT Division',
    permissions: ['VIEW_TWIN', 'AUDIT_SCRAP', 'REWORK_ROUTING', 'EXPORT_TRACEABILITY'],
    status: 'APPROVED',
  },
];
