
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { orderId, userId, userName, userEmail, message } = await req.json();

    if (!orderId || !userId || !message) {
      return NextResponse.json({ error: 'Dados insuficientes.' }, { status: 400 });
    }

    await addDoc(collection(db, 'supportRequests'), {
      orderId,
      userId,
      userName,
      userEmail,
      message,
      status: 'Pendente',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Solicitação de suporte criada com sucesso.' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating support request:', error);
    return NextResponse.json({ error: error.message || 'Ocorreu um erro desconhecido.' }, { status: 500 });
  }
}
