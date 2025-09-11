
import { NextResponse } from 'next/server';
import { getAdminApp } from '../../../lib/firebase-admin';
import { auth, firestore } from 'firebase-admin';

// Inicializa o app admin para esta rota
getAdminApp();

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
    let errorMessage = 'Ocorreu um erro desconhecido no servidor. Verifique o console do servidor para mais detalhes.';
    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-exists':
                errorMessage = 'Este e-mail já está em uso por outra conta.';
                break;
            case 'auth/invalid-password':
                errorMessage = 'A senha é inválida. Deve ter pelo menos 6 caracteres.';
                break;
            default:
                 errorMessage = `Erro do Firebase: ${error.message} (código: ${error.code})`;
        }
    }
    
    return NextResponse.json({ 
        error: errorMessage, 
        code: error.code 
    }, { status: 500 });
  }
}
