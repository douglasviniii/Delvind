
import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const adminApp = initializeAdminApp();
    const adminAuth = admin.auth(adminApp);
    const adminDb = admin.firestore(adminApp);
    
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator',
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, name }, { status: 201 });

  } catch (error: any) {
    console.error('[API Create Collaborator Error]:', error);
    
    const errorMessage = error.message || 'Ocorreu um erro desconhecido no servidor.';
    const errorCode = error.code || 'unknown';
    
    return NextResponse.json({ 
        error: `[${errorCode}] ${errorMessage}`
    }, { status: 500 });
  }
}
