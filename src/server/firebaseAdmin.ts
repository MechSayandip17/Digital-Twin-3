import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;

try {
  if (!getApps().length) {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });
  } else {
    adminApp = getApps()[0];
  }

  // Use the provisioned database ID
  const dbId = firebaseConfig.firestoreDatabaseId;
  firestoreDb = dbId ? getFirestore(adminApp, dbId) : getFirestore(adminApp);
} catch (err) {
  console.warn('Firebase Admin initialization deferred or running in hybrid local mode:', err);
}

export { adminApp, firestoreDb };
