import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;

try {
  if (!getApps().length) {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    adminApp = getApps()[0];
  }

  // Use the provisioned database ID if configured, or default database
  const dbId = firebaseConfig.firestoreDatabaseId;
  firestoreDb = dbId ? getFirestore(adminApp, dbId) : getFirestore(adminApp);
} catch (err) {
  console.warn('Firebase Admin initialization deferred or running in hybrid local mode:', err);
}

export { adminApp, firestoreDb };
