
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Helper function to read secrets from Render's secret files or fallback to env vars
const readSecret = (secretName: string): string | undefined => {
  try {
    // Render mounts secrets at /etc/secrets/<filename>
    return fs.readFileSync(path.join('/etc/secrets', secretName), 'utf8').trim();
  } catch (err) {
    // For local development, fallback to process.env
    // This also handles cases where the secret file might not exist in other environments
    return process.env[secretName];
  }
};


export async function POST(req: Request) {
    const stripeSecretKey = readSecret('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = readSecret('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
        console.error('Stripe secret keys are not configured.');
        return NextResponse.json({ error: 'As chaves de configuração do servidor de pagamento não foram encontradas.' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret);
    } catch (err: any) {
        console.error(`❌ Erro na verificação do webhook: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    try {
        const adminApp = initializeAdminApp();
        const db = admin.firestore(adminApp);
        
        // Handle successful payment
        if (event.type === 'checkout.session.completed') {
            console.log('✅ Checkout session completed:', session.id);

            if (metadata?.source === 'loja_delvind') {
                // Handle store purchase
                 if (!session.customer_details?.email) {
                    throw new Error("E-mail do cliente não encontrado na sessão do Stripe.");
                }
                const cartItems = JSON.parse(metadata.cartItems || '[]');
                const newOrderRef = db.collection('orders').doc();
                
                await newOrderRef.set({
                    id: newOrderRef.id,
                    customerDetails: {
                        name: session.customer_details.name,
                        email: session.customer_details.email,
                    },
                    shippingDetails: session.shipping_details,
                    amountTotal: session.amount_total ? session.amount_total / 100 : 0,
                    currency: session.currency,
                    status: 'Pendente',
                    products: cartItems,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    stripeSessionId: session.id,
                });
                console.log(`📦 Novo pedido criado: ${newOrderRef.id}`);

            } else if (metadata?.source === 'financeiro_delvind' && metadata.financeRecordId) {
                // Handle invoice payment from dashboard
                const recordRef = db.collection('finance').doc(metadata.financeRecordId);
                await recordRef.update({
                    status: 'Pagamento Enviado',
                    stripeSessionId: session.id,
                });
                 console.log(`💰 Pagamento para fatura ${metadata.financeRecordId} recebido e marcado para análise.`);
            }
        }
        
         if (event.type === 'invoice.payment_succeeded' && session.billing_reason === 'subscription_cycle') {
            // Handle recurring subscription payment
            const customerEmail = session.customer_details?.email;
            if (customerEmail) {
                const usersRef = db.collection('users');
                const q = usersRef.where('email', '==', customerEmail).limit(1);
                const userSnapshot = await q.get();

                if (!userSnapshot.empty) {
                    const userId = userSnapshot.docs[0].id;
                    const newInvoiceRef = db.collection('finance').doc();
                    await newInvoiceRef.set({
                        id: newInvoiceRef.id,
                        clientId: userId,
                        clientName: session.customer_details?.name || 'Assinante',
                        title: `Pagamento de Assinatura - ${new Date().toLocaleString('pt-BR')}`,
                        totalAmount: session.amount_total ? session.amount_total / 100 : 0,
                        status: 'Pagamento Enviado',
                        entryType: 'subscription',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        stripeSessionId: session.id,
                    });
                     console.log(`갱️ Nova fatura de assinatura criada para o cliente ${userId}`);
                }
            }
        }

    } catch (error: any) {
        console.error('Erro ao processar webhook no Firestore:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao processar o evento.' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
