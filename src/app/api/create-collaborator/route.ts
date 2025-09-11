import { NextResponse } from 'next/server';
import { auth, db } from '../../../lib/firebase-admin';


export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { email, password, name } = await req.json();

    // Cria usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Salva usuário no Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator',
    });

    return NextResponse.json({ success: true, name }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating new user:', error);
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
    } else if (error.code === 'auth/invalid-credential' || error.code?.includes('credential')) {
        errorMessage = 'Erro de credencial no servidor. Verifique a configuração do Firebase Admin.';
    }
    return NextResponse.json({ error: errorMessage, code: error.code }, { status: 500 });
  }
}
