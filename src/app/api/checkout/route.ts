
import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('Stripe secret key is not set in environment variables.');
    return NextResponse.json({ error: 'A chave secreta da Stripe não está configurada no servidor. Adicione STRIPE_SECRET_KEY às suas variáveis de ambiente.' }, { status: 500 });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20',
    });

    const { cartItems, shippingCost, financeRecordId, amount, title, customerEmail } = await req.json();

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadata: { [key: string]: string } = {};

    if (cartItems) { // Modo Loja
        if (cartItems.length === 0) {
            return NextResponse.json({ error: 'O carrinho está vazio.' }, { status: 400 });
        }
        metadata.source = 'loja_delvind';

        line_items = cartItems.map((item: any) => ({
            price_data: {
                currency: 'brl',
                product_data: {
                name: item.name,
                images: [item.imageUrl],
                },
                unit_amount: Math.round((item.promoPrice || item.price) * 100),
            },
            quantity: item.quantity,
        }));
        
        const requiresShipping = cartItems.some((item: any) => item.requiresShipping);
        if (requiresShipping && shippingCost > 0) {
            line_items.push({
                price_data: {
                    currency: 'brl',
                    product_data: { name: 'Custo de Envio' },
                    unit_amount: Math.round(shippingCost * 100),
                },
                quantity: 1,
            });
        }
    } else if (financeRecordId) { // Modo Financeiro
        if (!amount || !title || !customerEmail) {
            return NextResponse.json({ error: 'Dados da fatura incompletos.' }, { status: 400 });
        }
        metadata.financeRecordId = financeRecordId;
        metadata.source = 'financeiro_delvind';
        
        line_items.push({
            price_data: {
                currency: 'brl',
                product_data: {
                    name: title,
                },
                unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
        });
    } else {
        return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const success_url = cartItems ? `${origin}/loja/success?session_id={CHECKOUT_SESSION_ID}` : `${origin}/dashboard/payments?payment_status=success`;
    const cancel_url = cartItems ? `${origin}/loja/cart` : `${origin}/dashboard/payments`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      line_items,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata,
      customer_email: customerEmail,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
