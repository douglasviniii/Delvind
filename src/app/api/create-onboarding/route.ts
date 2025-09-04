
import { NextResponse } from 'next/server';
import { getAdminApp } from '../../../lib/firebase-admin-init';

const { db } = getAdminApp();

export async function POST(req: Request) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    try {
        const { leadId, name, email } = await req.json();

        if (!leadId || !name || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const onboardingCollection = db.collection('onboarding');
        const newOnboardingDocRef = onboardingCollection.doc();
        
        await newOnboardingDocRef.set({
            leadId: leadId,
            name: name,
            email: email,
            status: 'Pendente',
            createdAt: new Date(),
        });
        
        const leadRef = db.collection('leads').doc(leadId);
        await leadRef.update({ onboardingLinkId: newOnboardingDocRef.id });

        return NextResponse.json({ success: true, onboardingId: newOnboardingDocRef.id }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating onboarding document:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
