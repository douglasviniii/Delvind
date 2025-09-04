
import { NextResponse } from 'next/server';
import { getAdminApp } from '../../../lib/firebase-admin-init';

const { db } = getAdminApp();

export async function POST(req: Request) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    try {
        const { leadId, newStatus } = await req.json();

        if (!leadId || !newStatus) {
            return NextResponse.json({ error: 'Missing leadId or newStatus' }, { status: 400 });
        }

        const leadRef = db.collection('leads').doc(leadId);
        await leadRef.update({ status: newStatus });

        return NextResponse.json({ success: true, message: `Lead ${leadId} updated to ${newStatus}` }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating lead status:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
