import {
  OrganisationRecord,
  OperatorProfile,
  UserAccount,
  ADMIN_EMAIL,
} from '../types/auth';
import { Employee, DEFAULT_EMPLOYEES } from '../types/employee';
import {
  syncTenantStateToFirestore,
  testFirestoreConnection,
  subscribeTenantSimulationState,
  subscribeParameterChangeRequests,
  subscribeAdminAuditLogs,
} from './firebaseClient';

export interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  operator?: OperatorProfile;
  organisation?: OrganisationRecord;
  error?: string;
  status?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserAccount;
}

export const apiClient = {
  /**
   * Fetches the list of strictly verified organizations
   */
  async getVerifiedOrganisations(): Promise<OrganisationRecord[]> {
    try {
      const res = await fetch('/api/orgs/verified');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      return data.organisations || [];
    } catch (e) {
      // Fallback to default verified org if server is bootstrapping
      return [
        {
          id: 'iiests-mech',
          name: 'Mechanical Engg. Dept., IIESTS',
          code: 'IIESTS-MECH',
          status: 'VERIFIED',
          verifiedBy: ADMIN_EMAIL,
          createdAt: '2026-11-01',
        },
      ];
    }
  },

  /**
   * Submits a new operator registration (pending admin approval)
   */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    badgeId: string;
    department: string;
    requestedOrganisation: string;
    role: string;
  }): Promise<RegisterResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Server connection failed' };
    }
  },

  /**
   * Attempts operator login (enforcing APPROVED status)
   */
  async login(identifier: string, passcode: string): Promise<LoginResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: passcode }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Authentication server unreachable' };
    }
  },

  /**
   * Submits a password reset application that requires System Administrator verification (Forgot Password workflow)
   */
  async resetPassword(identifier: string, newPassword: string, notes?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, newPassword, notes }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Password reset request failed' };
    }
  },

  /**
   * Admin: Retrieves pending password reset applications awaiting verification (Protected)
   */
  async getPendingPasswordResets(): Promise<any[]> {
    try {
      const res = await fetch('/api/admin/password-resets');
      if (!res.ok) return [];
      const data = await res.json();
      return data.pendingResets || [];
    } catch {
      return [];
    }
  },

  /**
   * Admin: Authorizes or declines a password reset application
   */
  async reviewPasswordReset(
    requestId: string,
    approved: boolean,
    adminEmail?: string,
    adminBadge?: string,
    adminPasscode?: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/admin/password-resets/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminBadge ? { 'x-admin-auth': adminBadge } : {}),
        },
        body: JSON.stringify({
          requestId,
          approved,
          adminEmail,
          adminBadge,
          adminPasscode,
          notes,
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to review password reset application.' };
    }
  },
  /**
   * Admin: Retrieves pending user signups awaiting verification (Protected)
   */
  async getPendingUsers(adminBadgeOrEmail?: string): Promise<UserAccount[]> {
    try {
      const headers: Record<string, string> = {};
      if (adminBadgeOrEmail) {
        headers['x-admin-auth'] = adminBadgeOrEmail;
      }
      const res = await fetch('/api/admin/pending-users', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.pendingUsers || [];
    } catch {
      return [];
    }
  },

  /**
   * Admin: Verifies (approves/rejects) a user registration and their organization
   */
  async verifyUser(
    userId: string,
    approved: boolean,
    rejectionReason?: string,
    adminEmail?: string,
    adminBadge?: string,
    adminPasscode?: string
  ): Promise<{ success: boolean; message: string; user?: UserAccount; newEmployee?: Employee }> {
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': adminBadge || adminEmail || ADMIN_EMAIL,
        },
        body: JSON.stringify({
          userId,
          approved,
          rejectionReason,
          adminEmail: adminEmail || ADMIN_EMAIL,
          adminBadge,
          adminPasscode,
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Verification update failed' };
    }
  },

  /**
   * Admin: Updates any applicant's details before or after approval
   */
  async updateApplicant(
    applicantId: string,
    updates: Partial<UserAccount>,
    adminEmail?: string,
    adminBadge?: string,
    adminPasscode?: string
  ): Promise<{ success: boolean; message: string; user?: UserAccount }> {
    try {
      const res = await fetch(`/api/admin/applicants/${applicantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': adminBadge || adminEmail || ADMIN_EMAIL,
        },
        body: JSON.stringify({
          updates,
          adminEmail: adminEmail || ADMIN_EMAIL,
          adminBadge,
          adminPasscode,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update applicant details' };
    }
  },

  /**
   * Retrieves active workforce employees from server
   */
  async getEmployees(): Promise<Employee[]> {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) return DEFAULT_EMPLOYEES;
      const data = await res.json();
      return data.employees || DEFAULT_EMPLOYEES;
    } catch {
      return DEFAULT_EMPLOYEES;
    }
  },

  /**
   * Admin: Updates an employee's details (wage, station, shift, role, certification)
   * or creates a new employee if empId is 'new' or not found.
   */
  async updateEmployee(
    empId: string,
    updates: Partial<Employee>,
    adminEmail?: string,
    adminBadge?: string,
    adminPasscode?: string
  ): Promise<{ success: boolean; message: string; employee?: Employee }> {
    try {
      const url = empId && empId !== 'new' ? `/api/admin/employees/${empId}` : '/api/admin/employees';
      const method = empId && empId !== 'new' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': adminBadge || adminEmail || ADMIN_EMAIL,
        },
        body: JSON.stringify({
          updates,
          employee: { ...updates, id: empId !== 'new' ? empId : undefined },
          adminEmail: adminEmail || ADMIN_EMAIL,
          adminBadge,
          adminPasscode,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update employee' };
    }
  },

  /**
   * Retrieves all parameter change proposals
   */
  async getChangeRequests(): Promise<any[]> {
    try {
      const res = await fetch('/api/change-requests');
      if (!res.ok) return [];
      const data = await res.json();
      return data.changeRequests || [];
    } catch {
      return [];
    }
  },

  /**
   * Submits a parameter change proposal (non-admin employee)
   */
  async submitChangeRequest(payload: any): Promise<{ success: boolean; changeRequest?: any; error?: string }> {
    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Submission failed' };
    }
  },

  /**
   * Admin approves or rejects a parameter change proposal
   */
  async reviewChangeRequest(
    requestId: string,
    approved: boolean,
    adminEmail?: string,
    adminBadge?: string,
    adminPasscode?: string,
    rejectionNote?: string
  ): Promise<{ success: boolean; request?: any; message: string }> {
    try {
      const res = await fetch('/api/admin/review-change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': adminBadge || adminEmail || ADMIN_EMAIL,
        },
        body: JSON.stringify({
          requestId,
          approved,
          adminEmail: adminEmail || ADMIN_EMAIL,
          adminBadge,
          adminPasscode,
          rejectionNote,
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Review failed' };
    }
  },

  /**
   * Retrieves administrative audit history
   */
  async getAdminAuditLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (!res.ok) return [];
      const data = await res.json();
      return data.auditLogs || [];
    } catch {
      return [];
    }
  },

  /**
   * Server-authoritative control of the Production Live Digital Twin.
   * Action can be: START, PAUSE, RESET, or ADVANCE_DAY.
   * Only designated system administrators may invoke this.
   */
  async controlProductionTwin(
    action: 'START' | 'PAUSE' | 'RESET' | 'ADVANCE_DAY',
    orgId: string = 'iiests-mech',
    adminEmail?: string,
    adminBadge?: string,
    options?: any
  ): Promise<{ success: boolean; state?: any; message?: string }> {
    try {
      const res = await fetch('/api/twin/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': adminBadge || adminEmail || ADMIN_EMAIL,
        },
        body: JSON.stringify({
          orgId,
          action,
          adminEmail: adminEmail || ADMIN_EMAIL,
          adminBadge,
          options,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to control digital twin' };
    }
  },

  /**
   * Retrieves the current dynamic Daily Shift Report for an organization
   */
  async getDailyShiftReport(orgId: string = 'iiests-mech'): Promise<any | null> {
    try {
      const res = await fetch(`/api/twin/daily-shift-report?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.report || null;
    } catch {
      return null;
    }
  },

  /**
   * Saves / updates the Daily Shift Report for an organization
   */
  async saveDailyShiftReport(orgId: string = 'iiests-mech', report: any): Promise<boolean> {
    try {
      const res = await fetch('/api/twin/daily-shift-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, report }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Retrieves real-time status of the Production Live Physical Asset
   */
  async getProductionLiveStatus(orgId: string = 'iiests-mech'): Promise<{
    isRunning: boolean;
    targetEnvironment: string;
    simulatedClock: string;
    simulatedSeconds: number;
    statusText: string;
    organisationId?: string;
    organisationName?: string;
    organisationCode?: string;
    activeOperator?: string;
  }> {
    try {
      const res = await fetch(`/api/twin/live-status?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) {
        return {
          isRunning: false,
          targetEnvironment: 'PRODUCTION',
          simulatedClock: '08:00 AM (Day 1)',
          simulatedSeconds: 8 * 3600,
          statusText: 'IDLE / STANDBY',
          organisationId: orgId,
          organisationName: 'Mechanical Engg. Dept., IIESTS',
          organisationCode: 'IIESTS-MECH',
        };
      }
      const data = await res.json();
      return {
        isRunning: Boolean(data.isRunning),
        targetEnvironment: data.targetEnvironment || 'PRODUCTION',
        simulatedClock: data.simulatedClock || '08:00 AM (Day 1)',
        simulatedSeconds: data.simulatedSeconds || 8 * 3600,
        statusText: data.statusText || 'IDLE',
        organisationId: data.organisationId || orgId,
        organisationName: data.organisationName || 'Mechanical Engg. Dept., IIESTS',
        organisationCode: data.organisationCode || 'IIESTS-MECH',
        activeOperator: data.activeOperator,
      };
    } catch {
      return {
        isRunning: false,
        targetEnvironment: 'PRODUCTION',
        simulatedClock: '08:00 AM (Day 1)',
        simulatedSeconds: 8 * 3600,
        statusText: 'IDLE / STANDBY',
        organisationId: orgId,
        organisationName: 'Mechanical Engg. Dept., IIESTS',
        organisationCode: 'IIESTS-MECH',
      };
    }
  },

  /**
   * Loads tenant digital twin state from per-organization database
   */
  async loadTenantState(orgId: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/twin/state/${encodeURIComponent(orgId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success || !data.data) return null;
      const raw = data.data;
      const stateObj = raw.state ? { ...raw.state } : { ...raw };
      if (raw._serverSavedTimestamp) stateObj._serverSavedTimestamp = raw._serverSavedTimestamp;
      if (raw.lastSavedTimestamp) stateObj.lastSavedTimestamp = raw.lastSavedTimestamp;
      if (raw.targetEnvironment) stateObj.targetEnvironment = raw.targetEnvironment;
      if (raw.isRunning !== undefined && stateObj.isRunning === undefined) stateObj.isRunning = raw.isRunning;
      return stateObj;
    } catch {
      return null;
    }
  },

  /**
   * Saves tenant digital twin progress to per-organization database and Cloud Firestore
   */
  async saveTenantState(orgId: string, state: any): Promise<boolean> {
    // 1. Concurrently sync directly to Firestore from the client
    syncTenantStateToFirestore(orgId, state).catch(() => {});

    // 2. Persist to Express server backend
    try {
      const res = await fetch(`/api/twin/state/${encodeURIComponent(orgId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Tests and validates connection to Cloud Firestore
   */
  async testFirebase(): Promise<{ connected: boolean; databaseId: string; projectId: string; error?: string }> {
    return testFirestoreConnection();
  },

  /**
   * Resets tenant digital twin to clean baseline
   */
  async resetTenantState(orgId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/twin/reset/${encodeURIComponent(orgId)}`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
