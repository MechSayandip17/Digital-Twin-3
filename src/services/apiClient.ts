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
   * Admin: Retrieves pending user signups awaiting verification
   */
  async getPendingUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/admin/pending-users');
      if (!res.ok) throw new Error('Forbidden');
      const data = await res.json();
      return data.pendingUsers || [];
    } catch {
      return [];
    }
  },

  /**
   * Admin: Verifies (approves/rejects) a user registration and their organization
   */
  async verifyUser(userId: string, approved: boolean, rejectionReason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          approved,
          rejectionReason,
          adminEmail: ADMIN_EMAIL,
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Verification update failed' };
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
