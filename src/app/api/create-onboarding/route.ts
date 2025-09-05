
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const { lead } = await req.json();

    if (!lead || !lead.id || !lead.name || !lead.email) {
        return NextResponse.json({ error: 'Dados do lead insuficientes.' }, { status: 400 });
    }
    
    const onboardingCollection = collection(db, 'onboarding');
    const newOnboardingDocRef = doc(onboardingCollection);

    await setDoc(newOnboardingDocRef, {
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        status: 'Pendente',
        createdAt: serverTimestamp(),
    });
    
    const leadRef = doc(db, 'leads', lead.id);
    await updateDoc(leadRef, { onboardingLinkId: newOnboardingDocRef.id });

    return NextResponse.json({ success: true, onboardingId: newOnboardingDocRef.id }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating onboarding link:', error);
    return NextResponse.json({ error: error.message || 'Ocorreu um erro desconhecido.' }, { status: 500 });
  }
}
