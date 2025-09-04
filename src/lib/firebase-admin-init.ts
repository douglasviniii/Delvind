import admin from 'firebase-admin';

function getAdminApp() {
  if (admin.apps.length > 0) {
    return {
      auth: admin.auth(),
      db: admin.firestore(),
      storage: admin.storage(),
    };
  }

  // When deployed to App Hosting, the SDK automatically discovers the credentials.
  // No need to pass them in initializeApp().
  const app = admin.initializeApp();

  return {
    auth: admin.auth(app),
    db: admin.firestore(app),
    storage: admin.storage(app),
  };
}

export { getAdminApp };
