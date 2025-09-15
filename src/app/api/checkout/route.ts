
import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = "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";
    if (!stripeSecretKey) {
      throw new Error('A variável de ambiente STRIPE_SECRET_KEY não está definida no servidor.');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20',
    });

    const { cartItems, shippingCost, financeRecordId, amount, title, customerEmail } = await req.json();

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadata: { [key: string]: string } = {};
    let mode: 'payment' | 'subscription' = 'payment';

    if (cartItems) { // Modo Loja
        if (cartItems.length === 0) {
            return NextResponse.json({ error: 'O carrinho está vazio.' }, { status: 400 });
        }
        metadata.source = 'loja_delvind';
        
        const subscriptionItem = cartItems.find((item: any) => item.isSubscription);

        if (subscriptionItem) {
            mode = 'subscription';
            if (!subscriptionItem.subscriptionPrice) {
                 return NextResponse.json({ error: 'Produto de assinatura sem preço definido.' }, { status: 400 });
            }
            line_items.push({
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: subscriptionItem.name,
                        images: [subscriptionItem.imageUrl],
                    },
                    unit_amount: Math.round(subscriptionItem.subscriptionPrice * 100),
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            });
             // Add other one-time products
            cartItems.filter((item: any) => !item.isSubscription).forEach((item: any) => {
                line_items.push({
                    price_data: {
                        currency: 'brl',
                        product_data: {
                        name: item.name,
                        images: [item.imageUrl],
                        },
                        unit_amount: Math.round((item.promoPrice || item.price) * 100),
                    },
                    quantity: item.quantity,
                });
            });

        } else {
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
        }

        const requiresShipping = cartItems.some((item: any) => item.requiresShipping);
        const allItemsHaveFreeShipping = cartItems.filter((i: any) => i.requiresShipping).every((i: any) => i.freeShipping);

        if (requiresShipping && !allItemsHaveFreeShipping && shippingCost > 0) {
            line_items.push({
                price_data: {
                    currency: 'brl',
                    product_data: { name: 'Custo de Envio' },
                    unit_amount: Math.round(shippingCost * 100),
                },
                quantity: 1,
            });
        }
        // Associate items with metadata for the webhook
        metadata.cartItems = JSON.stringify(cartItems.map((item: any) => ({id: item.id, name: item.name, isSubscription: !!item.isSubscription})));

    } else if (financeRecordId) { // Modo Financeiro (iniciado pelo cliente)
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

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card', 'boleto'],
        line_items,
        mode,
        success_url,
        cancel_url,
        metadata,
        customer_email: customerEmail,
    };
    
    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: 'any',
            },
            boleto: {
              expires_after_days: 7,
            },
          },
          payment_method_types: ['card', 'boleto'],
          save_default_payment_method: 'on_subscription',
        },
        trial_period_days: 0,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, sessionUrl: session.url });
  } catch (err: any) {
    console.error('Stripe Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
