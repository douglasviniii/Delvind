
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const { cartItems, shippingCost } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'O carrinho está vazio.' }, { status: 400 });
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map((item: any) => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: item.name,
          images: [item.imageUrl],
        },
        unit_amount: Math.round((item.promoPrice || item.price) * 100), // Preço em centavos
      },
      quantity: item.quantity,
    }));
    
    const requiresShipping = cartItems.some((item: any) => item.requiresShipping);

    if (requiresShipping && shippingCost > 0) {
        line_items.push({
            price_data: {
                currency: 'brl',
                product_data: {
                    name: 'Custo de Envio',
                },
                unit_amount: Math.round(shippingCost * 100),
            },
            quantity: 1,
        });
    }


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/loja/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/loja/cart`,
      ...(requiresShipping && {
        shipping_address_collection: {
            allowed_countries: ['BR'],
        },
      })
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
