
import { NextResponse } from 'next/server';
import { auth, firestore } from 'firebase-admin';
import { initializeAdminApp } from '../../../lib/firebase-admin';

// Garante que o app admin seja inicializado
initializeAdminApp();

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Cria o usuário na autenticação do Firebase
    const userRecord = await auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Salva os dados do usuário na coleção 'users' do Firestore
    await firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator', // Define a função como colaborador
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
