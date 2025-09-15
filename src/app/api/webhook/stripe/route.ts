
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
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_PROD,
  ].filter((secret): secret is string => !!secret);

  if (!stripeSecretKey) {
    console.error('Stripe secret key is not set in environment variables.');
    return NextResponse.json({ error: 'A chave secreta da Stripe (STRIPE_SECRET_KEY) não está configurada no servidor.' }, { status: 500 });
  }
  if (webhookSecrets.length === 0) {
    console.error('Nenhum segredo de webhook configurado nas variáveis de ambiente.');
    return NextResponse.json({ error: 'Nenhum segredo de webhook (STRIPE_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET_PROD) configurado no servidor.' }, { status: 500 });
  }

  try {
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

    for (const secret of webhookSecrets) {
        try {
        event = stripe.webhooks.constructEvent(payload, signature, secret);
        break;
        } catch (err: any) {
            // Se um segredo falhar, o loop continua para tentar o próximo.
            console.log(`Falha ao verificar webhook com um dos segredos.`);
        }
    }

    if (!event) {
        console.error('A verificação da assinatura do webhook falhou para todos os segredos fornecidos.');
        return NextResponse.json({ error: 'A verificação da assinatura do webhook falhou.' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // O ID do registro financeiro DEVE ser passado no metadata da sessão de checkout
        const financeRecordId = session.metadata?.financeRecordId;
        
        if (!financeRecordId) {
            console.error('Metadata `financeRecordId` não encontrado na sessão de checkout.');
            // Se for de outra fonte (ex: loja), ignorar por enquanto
            if (session.metadata?.source !== 'loja_delvind') {
               return NextResponse.json({ error: 'Finance record ID is missing.' }, { status: 400 });
            }
        }

        if (financeRecordId) {
            const financeRecordRef = db.collection('finance').doc(financeRecordId);
            const financeRecordSnap = await financeRecordRef.get();

            if (!financeRecordSnap.exists) {
                console.error(`Registro financeiro com ID ${financeRecordId} não encontrado.`);
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

            // 3. Envia o e-mail de notificação
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
  } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error while processing webhook.' }, { status: 500 });
  }
}
