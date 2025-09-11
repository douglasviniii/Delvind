import { NextResponse } from 'next/server';
import { getAdminApp } from '../../../lib/firebase-admin';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { auth, db } = getAdminApp();
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator',
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, name }, { status: 201 });
  } catch (error: any) {
    console.error('[API Create Collaborator Error]:', error);
    
    // Retorna a mensagem de erro específica do Firebase para o cliente
    return NextResponse.json({ 
        error: error.message || 'Ocorreu um erro desconhecido no servidor.', 
        code: error.code 
    }, { status: 500 });
  }
}
