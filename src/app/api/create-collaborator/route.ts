
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
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: email, password, name.' },
        { status: 400 },
      );
    }

    // Inicializa o Admin SDK de forma segura
    const adminApp = initializeAdminApp();
    const adminAuth = admin.auth(adminApp);
    const adminDb = admin.firestore(adminApp);

    // Cria o usuário no Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Salva os dados do usuário na coleção 'users' do Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator', // Define a função como 'collaborator'
    });

    return NextResponse.json(
      { success: true, uid: userRecord.uid, name },
      { status: 201 },
    );

  } catch (error: any) {
    // Log detalhado do erro no servidor para depuração
    console.error('[API Create Collaborator Error]:', error);

    // Retorna a mensagem de erro específica do Firebase para o cliente
    const errorMessage = error.message || 'Ocorreu um erro desconhecido no servidor.';
    const errorCode = error.code || 'unknown-error';
    
    // Constrói uma mensagem mais amigável para erros comuns
    let friendlyMessage = `[${errorCode}] ${errorMessage}`;
    if (errorCode === 'auth/email-already-exists') {
        friendlyMessage = 'Este e-mail já está em uso por outra conta.';
    } else if (errorCode === 'auth/invalid-password') {
        friendlyMessage = 'A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.';
    } else if (errorCode === 'auth/invalid-credential') {
        friendlyMessage = 'As credenciais de administrador do servidor são inválidas. Verifique a configuração do Firebase.';
    } else if (errorCode === 'PERMISSION_DENIED') {
        friendlyMessage = 'Permissão negada pelo Firestore. Verifique suas regras de segurança.';
    }

    return NextResponse.json(
      { 
        error: friendlyMessage
      }, 
      { status: 500 }
    );
  }
}
