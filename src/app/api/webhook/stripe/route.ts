
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Lista de segredos de webhook a partir de variáveis de ambiente
const webhookSecrets = [
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.STRIPE_WEBHOOK_SECRET_PROD,
].filter((secret): secret is string => !!secret);

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
  }
  
  if (webhookSecrets.length === 0) {
      console.error('No webhook secrets configured in environment variables.');
      return NextResponse.json({ error: 'Webhook secret not configured on server.' }, { status: 500 });
  }

  const adminApp = initializeAdminApp();
  const db = admin.firestore(adminApp);
  let event: Stripe.Event | undefined;

  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
      break;
    } catch (err: any) {
      // Continua para o próximo segredo
    }
  }

  if (!event) {
    console.error('Webhook signature verification failed for all provided secrets.');
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // O ID do registro financeiro DEVE ser passado no metadata da sessão de checkout
    const financeRecordId = session.metadata?.financeRecordId;
    
    if (!financeRecordId) {
        console.error('Metadata `financeRecordId` not found in checkout session.');
        return NextResponse.json({ error: 'Finance record ID is missing.' }, { status: 400 });
    }

    try {
        const financeRecordRef = db.collection('finance').doc(financeRecordId);
        const financeRecordSnap = await financeRecordRef.get();

        if (!financeRecordSnap.exists) {
            console.error(`Finance record with ID ${financeRecordId} not found.`);
            return NextResponse.json({ error: 'Finance record not found.' }, { status: 404 });
        }

        const financeData = financeRecordSnap.data()!;

        // 1. Atualiza o status do registro financeiro para "Recebido"
        await financeRecordRef.update({
            status: 'Recebido',
            paymentGateway: 'stripe',
            stripeSessionId: session.id,
        });

        // 2. Cria um recibo na coleção 'receipts'
        const newReceiptRef = db.collection('receipts').doc();
        const receiptData = {
            id: newReceiptRef.id,
            clientId: financeData.clientId,
            clientName: financeData.clientName,
            financeRecordId: financeRecordId,
            title: financeData.title,
            originalAmount: financeData.totalAmount,
            interestAmount: 0, // Lógica de juros pode ser adicionada aqui se o Stripe informar
            totalAmount: session.amount_total! / 100, // Valor total pago em reais
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            originalBudgetId: financeData.originalBudgetId || null,
            viewedByClient: false,
        };
        await newReceiptRef.set(receiptData);
      
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error while processing webhook.' }, { status: 500 });
    }
  }

  // Lógica para quando um pedido da loja é finalizado
  if (event.type === 'checkout.session.completed' && event.data.object.metadata?.source === 'loja_delvind') {
     const session = event.data.object as Stripe.Checkout.Session;
     try {
         // Código para criar o pedido na coleção 'orders'
     } catch (error) {
         //...
     }
  }

  return NextResponse.json({ received: true });
}
