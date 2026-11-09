import {
  OrganisationRecord,
  OperatorProfile,
  UserAccount,
  ADMIN_EMAIL,
} from '../types/auth';

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
  ): Promise<{ success: boolean; message: string }> {
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
   * Loads tenant digital twin state from per-organization database
   */
  async loadTenantState(orgId: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/twin/state/${encodeURIComponent(orgId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.state || null;
    } catch {
      return null;
    }
  },

  /**
   * Saves tenant digital twin progress to per-organization database
   */
  async saveTenantState(orgId: string, state: any): Promise<boolean> {
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
