
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature!, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price.product'],
      });

      const lineItems = sessionWithLineItems.line_items?.data || [];
      
      const orderData = {
        stripeSessionId: session.id,
        amountTotal: session.amount_total! / 100, // Convert from cents
        customerDetails: session.customer_details,
        shippingDetails: session.shipping_details,
        paymentStatus: session.payment_status,
        status: 'Pendente', // Initial order status
        createdAt: new Date(),
        products: lineItems.map(item => {
            const product = item.price?.product as Stripe.Product;
            return {
                productId: product.id,
                name: product.name,
                images: product.images,
                quantity: item.quantity,
                price: item.price?.unit_amount! / 100,
            }
        })
      };

      // Save order to Firestore
      await db.collection('orders').add(orderData);

    } catch (error) {
        console.error('Error handling checkout session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

    