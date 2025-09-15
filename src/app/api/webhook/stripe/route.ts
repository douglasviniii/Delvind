
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return 'Data inválida';
}

export async function POST(req: Request) {
  const stripeSecretKey = "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";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Usaremos apenas uma por enquanto para simplificar

  try {
    if (!stripeSecretKey) {
      throw new Error('A chave secreta da Stripe (STRIPE_SECRET_KEY) não está configurada no servidor.');
    }
    if (!webhookSecret) {
      throw new Error('O segredo do webhook (STRIPE_WEBHOOK_SECRET) não está configurado no servidor.');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20',
    });

    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
    }
    
    const adminApp = initializeAdminApp();
    const db = admin.firestore(adminApp);
    let event: Stripe.Event | undefined;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }


    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const financeRecordId = session.metadata?.financeRecordId;
        const source = session.metadata?.source;

        if (source === 'financeiro_delvind' && financeRecordId) {
            const financeRecordRef = db.collection('finance').doc(financeRecordId);
            const financeRecordSnap = await financeRecordRef.get();

            if (!financeRecordSnap.exists) {
                console.error(`Registro financeiro com ID ${financeRecordId} não encontrado.`);
                return NextResponse.json({ error: 'Finance record not found.' }, { status: 404 });
            }

            const financeData = financeRecordSnap.data()!;

            await financeRecordRef.update({
                status: 'Recebido',
                paymentGateway: 'stripe',
                stripeSessionId: session.id,
            });

            const newReceiptRef = db.collection('receipts').doc();
            const receiptData = {
                id: newReceiptRef.id,
                clientId: financeData.clientId,
                clientName: financeData.clientName,
                financeRecordId: financeRecordId,
                title: financeData.title,
                originalAmount: financeData.totalAmount,
                interestAmount: 0,
                totalAmount: session.amount_total! / 100,
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                originalBudgetId: financeData.originalBudgetId || null,
                viewedByClient: false,
            };
            await newReceiptRef.set(receiptData);

            const clientEmail = financeData.clientEmail || session.customer_details?.email;
            if (clientEmail) {
                const emailContent = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h1 style="color: #6d28d9;">Recibo de Pagamento - Delvind</h1>
                        <p>Olá, ${financeData.clientName},</p>
                        <p>Confirmamos o recebimento do seu pagamento referente a <strong>${financeData.title}</strong>.</p>
                        <hr>
                        <h3>Detalhes do Pagamento</h3>
                        <p><strong>Valor Total Pago:</strong> ${formatCurrency(receiptData.totalAmount)}</p>
                        <p><strong>Data do Pagamento:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                        <p><strong>ID do Recibo:</strong> ${receiptData.id.slice(0, 8).toUpperCase()}</p>
                        <hr>
                        <p>Seu recibo completo já está disponível no seu painel de cliente.</p>
                        <p>Agradecemos pela sua confiança!</p>
                        <p>Atenciosamente,<br>Equipe Delvind</p>
                    </div>
                `;
                await db.collection('mail').add({
                        to: clientEmail,
                        message: {
                            subject: `Seu Recibo de Pagamento - ${financeData.title}`,
                            html: emailContent,
                        },
                });
            }
        } else if (source === 'loja_delvind') {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const orderData = {
              customerDetails: session.customer_details,
              amountTotal: session.amount_total! / 100,
              products: lineItems.data.map(item => ({
                productId: item.price?.product,
                name: item.description,
                quantity: item.quantity,
                price: item.price?.unit_amount ? item.price.unit_amount / 100 : 0
              })),
              status: 'Pendente',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              shippingDetails: session.shipping_details,
              stripeSessionId: session.id,
            };
            await db.collection('orders').add(orderData);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error while processing webhook.' }, { status: 500 });
  }
}
