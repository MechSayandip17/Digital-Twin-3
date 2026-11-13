import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ParameterChangeRequest, AdminAuditLog } from '../types/auth';

export const FIREBASE_ENABLED = true;

/**
 * Standard OperationType enum required by the Firebase Integration Skill
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Standard FirestoreErrorInfo interface required by the Firebase Integration Skill
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// 1. Initialize Client Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore with the provisioned named database instance
// CRITICAL: Passing firestoreDatabaseId is mandatory for named databases
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// 3. Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

/**
 * Standard error handler conforming strictly to the Firebase Integration Skill
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Connection validator: tests connection to Firestore on initialization
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  databaseId: string;
  projectId: string;
  storageBucket: string;
  error?: string;
}> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      connected: true,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || '',
    };
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firestore offline or connectivity check deferred:', err.message);
      return {
        connected: false,
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket || '',
        error: 'Client offline or network unreachable',
      };
    }
    // A permission error or not-found document confirms the server is reachable and responsive
    return {
      connected: true,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || '',
    };
  }
}

/**
 * Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMsg = error?.message || '';

    // Benign user cancellation: popup closed by user or cancelled request
    if (
      errCode === 'auth/popup-closed-by-user' ||
      errCode === 'auth/cancelled-popup-request' ||
      errCode === 'auth/popup-blocked' ||
      errMsg.includes('popup-closed-by-user') ||
      errMsg.includes('cancelled-popup-request')
    ) {
      // Intentional user dismissal: exit cleanly without logging error
      return null;
    }

    console.warn('Firebase Google Sign-In notice:', errMsg);
    return null;
  }
}

/**
 * Firebase Sign-Out
 */
export async function logOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.warn('Firebase Sign-Out notice:', error?.message);
  }
}

/**
 * Real-time listener for tenant digital twin simulation state
 */
export function subscribeTenantSimulationState(
  orgId: string,
  onData: (state: any) => void,
  onError?: (err: Error) => void
): () => void {
  const docPath = `tenants/${orgId}/simulation_state/current`;
  try {
    const docRef = doc(db, 'tenants', orgId, 'simulation_state', 'current');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.data());
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, docPath);
        } catch (wrapped) {
          if (onError && wrapped instanceof Error) onError(wrapped);
        }
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * Recursively strips undefined values so Firestore setDoc never rejects with unsupported undefined values
 */
function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestorePayload) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeFirestorePayload(v);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Asynchronously syncs tenant digital twin state to Firestore Cloud (PRODUCTION ONLY)
 */
export async function syncTenantStateToFirestore(orgId: string, state: any): Promise<boolean> {
  if (state?.targetEnvironment && state.targetEnvironment !== 'PRODUCTION') {
    return false;
  }
  const docPath = `tenants/${orgId}/simulation_state/current`;
  try {
    const docRef = doc(db, 'tenants', orgId, 'simulation_state', 'current');
    await setDoc(
      docRef,
      {
        orgId,
        targetEnvironment: 'PRODUCTION',
        isRunning: Boolean(state.isRunning),
        simulatedSeconds: state.timeSeconds ?? state.simulatedSeconds ?? 0,
        activeOperatorName: state.activeOperatorName || 'Plant Operator',
        lastSavedTimestamp: Date.now(),
        lastSavedClock: new Date().toISOString(),
        completedCount: state.completedCount || state.finishedGoods || 0,
        rejectedCount: state.rejectedCount || state.scrapCountToday || 0,
        activeStationsCount:
          state.stations && typeof state.stations === 'object'
            ? Object.values(state.stations).filter((s: any) => s?.status === 'PROCESSING').length
            : 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('Direct Firestore client sync deferred, server proxy active:', error);
    return false;
  }
}

/**
 * Real-time Firestore listener for Daily Shift Summary Report
 */
export function subscribeDailyShiftReport(
  orgId: string,
  onData: (report: any) => void,
  onError?: (err: Error) => void
): () => void {
  const safeOrgId = orgId || 'iiests-mech';
  const docPath = `tenants/${safeOrgId}/daily_shift_reports/latest`;
  try {
    const docRef = doc(db, 'tenants', safeOrgId, 'daily_shift_reports', 'latest');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.data());
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, docPath);
        } catch (wrapped) {
          if (onError && wrapped instanceof Error) onError(wrapped);
        }
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * Syncs Daily Shift Summary Report to Firestore Cloud (PRODUCTION ONLY)
 */
export async function syncDailyShiftReportToFirestore(orgId: string, report: any): Promise<boolean> {
  if (!report || (report.sourceEnvironment && report.sourceEnvironment !== 'PRODUCTION')) {
    return false;
  }
  const safeOrgId = orgId || 'iiests-mech';
  try {
    const docRef = doc(db, 'tenants', safeOrgId, 'daily_shift_reports', 'latest');
    const sanitized = sanitizeFirestorePayload({
      ...report,
      orgId: safeOrgId,
      sourceEnvironment: 'PRODUCTION',
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.warn('Direct Firestore shift report sync deferred, server proxy active:', error);
    return false;
  }
}

/**
 * Real-time listener for Parameter Change Requests
 */
export function subscribeParameterChangeRequests(
  onData: (requests: ParameterChangeRequest[]) => void,
  onError?: (err: Error) => void
): () => void {
  const collPath = 'parameter_change_requests';
  try {
    const colRef = collection(db, collPath);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: ParameterChangeRequest[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ParameterChangeRequest);
        });
        onData(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, collPath);
        } catch (wrapped) {
          if (onError && wrapped instanceof Error) onError(wrapped);
        }
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

/**
 * Real-time listener for Admin Audit Logs
 */
export function subscribeAdminAuditLogs(
  onData: (logs: AdminAuditLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  const collPath = 'audit_logs';
  try {
    const colRef = collection(db, collPath);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: AdminAuditLog[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AdminAuditLog);
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onData(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, collPath);
        } catch (wrapped) {
          if (onError && wrapped instanceof Error) onError(wrapped);
        }
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}
