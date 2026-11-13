import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { UserAccount, OrganisationRecord, AdminAuditLog } from '../types/auth';
import { Employee } from '../types/employee';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: Firestore | null = null;

try {
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const app = !getApps().length
      ? initializeApp(config, 'backend-firestore-sync')
      : getApp('backend-firestore-sync');

    firestoreDb = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  }
} catch (err) {
  console.warn('[FirestoreSync] Initialization deferred or unavailable:', err);
}

/**
 * Fetches all registered users from Cloud Firestore
 */
export async function fetchCloudUsers(): Promise<UserAccount[]> {
  if (!firestoreDb) return [];
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    const list: UserAccount[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        ...data,
      } as UserAccount);
    });
    return list;
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed to fetch users from Cloud Firestore:', err.message);
    return [];
  }
}

/**
 * Fetches all active employees from Cloud Firestore
 */
export async function fetchCloudEmployees(): Promise<Employee[]> {
  if (!firestoreDb) return [];
  try {
    const snap = await getDocs(collection(firestoreDb, 'employees'));
    const list: Employee[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        ...data,
      } as Employee);
    });
    return list;
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed to fetch employees from Cloud Firestore:', err.message);
    return [];
  }
}

/**
 * Saves a user document to Cloud Firestore
 */
export async function syncUserToCloud(user: UserAccount): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const { password, ...safeUser } = user;
    const docRef = doc(firestoreDb, 'users', user.id);
    await setDoc(
      docRef,
      {
        ...safeUser,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync user ${user.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves multiple users to Cloud Firestore in parallel
 */
export async function syncAllUsersToCloud(users: UserAccount[]): Promise<void> {
  if (!firestoreDb) return;
  try {
    await Promise.all(users.map((u) => syncUserToCloud(u)));
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed bulk user sync to Cloud:', err.message);
  }
}

/**
 * Saves an employee document to Cloud Firestore
 */
export async function syncEmployeeToCloud(employee: Employee): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'employees', employee.id);
    await setDoc(docRef, { ...employee, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync employee ${employee.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves multiple employees to Cloud Firestore
 */
export async function syncAllEmployeesToCloud(employees: Employee[]): Promise<void> {
  if (!firestoreDb) return;
  try {
    await Promise.all(employees.map((e) => syncEmployeeToCloud(e)));
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed bulk employee sync to Cloud:', err.message);
  }
}

/**
 * Saves an organisation record to Cloud Firestore
 */
export async function syncOrgToCloud(org: OrganisationRecord): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'organisations', org.id);
    await setDoc(docRef, { ...org, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync org ${org.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves all organisations to Cloud Firestore
 */
export async function syncAllOrgsToCloud(orgs: OrganisationRecord[]): Promise<void> {
  if (!firestoreDb) return;
  try {
    await Promise.all(orgs.map((o) => syncOrgToCloud(o)));
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed bulk org sync to Cloud:', err.message);
  }
}

/**
 * Recursively strips undefined values from an object so Firestore setDoc does not reject with:
 * "Unsupported field value: undefined"
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Saves an audit log entry to Cloud Firestore
 */
export async function syncAuditLogToCloud(log: AdminAuditLog): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'audit_logs', log.id);
    const cleanedLog = sanitizeForFirestore(log);
    await setDoc(docRef, cleanedLog, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync audit log ${log.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves a change request to Cloud Firestore
 */
export async function syncChangeRequestToCloud(req: any): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'parameter_change_requests', req.id);
    const cleaned = sanitizeForFirestore({ ...req, updatedAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync change request ${req.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves a password reset application to Cloud Firestore
 */
export async function syncPasswordResetToCloud(req: any): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const docRef = doc(firestoreDb, 'password_resets', req.id);
    const cleaned = sanitizeForFirestore({ ...req, updatedAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync password reset ${req.id} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves simulation state to Cloud Firestore (PRODUCTION ONLY)
 */
export async function syncSimulationStateToCloud(orgId: string, state: any): Promise<boolean> {
  if (!firestoreDb) return false;
  if (state?.targetEnvironment && state.targetEnvironment !== 'PRODUCTION') return false;
  try {
    const docRef = doc(firestoreDb, 'tenants', orgId, 'simulation_state', 'current');
    const cleaned = sanitizeForFirestore({ ...state, updatedAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync simulation state for ${orgId} to Cloud:`, err.message);
    return false;
  }
}

/**
 * Saves Daily Shift Summary Report to Cloud Firestore (PRODUCTION ONLY)
 */
export async function syncDailyShiftReportToCloud(orgId: string, report: any): Promise<boolean> {
  if (!firestoreDb || !report) return false;
  if (report.sourceEnvironment && report.sourceEnvironment !== 'PRODUCTION') return false;
  try {
    const docRef = doc(firestoreDb, 'tenants', orgId, 'daily_shift_reports', 'latest');
    const cleaned = sanitizeForFirestore({
      ...report,
      orgId,
      sourceEnvironment: 'PRODUCTION',
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleaned, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] Failed to sync daily shift report for ${orgId} to Cloud:`, err.message);
    return false;
  }
}

export { firestoreDb, sanitizeForFirestore };

