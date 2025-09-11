
import { NextResponse } from 'next/server';
// Importa as instâncias já inicializadas do adminAuth e adminDb
import { adminAuth, adminDb } from '@/lib/firebase-admin-init';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Etapa 1: Criar o usuário no Firebase Authentication usando a instância importada
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Etapa 2: Salvar informações adicionais no Firestore usando a instância importada
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      role: 'collaborator', // Atribuir a função de colaborador
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, name }, { status: 201 });

  } catch (error: any) {
    console.error('[API Create Collaborator Error]:', error);
    
    // Retorna a mensagem de erro específica do Firebase para diagnóstico
    const errorMessage = error.message || 'Ocorreu um erro desconhecido no servidor.';
    const errorCode = error.code || 'unknown';
    
    return NextResponse.json({ 
        error: errorMessage, 
        code: errorCode 
    }, { status: 500 });
  }
}
