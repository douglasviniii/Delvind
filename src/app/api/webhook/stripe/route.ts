
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  const { db } = getAdminApp();

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        products: lineItems.map(item => {
            const product = item.price?.product as Stripe.Product;
            // Check if product is null and handle accordingly
            if (!product) {
                // This could be the shipping cost item, which has no product ID
                return {
                    productId: item.price?.id || 'shipping_cost',
                    name: item.description,
                    quantity: item.quantity,
                    price: item.price?.unit_amount! / 100,
                };
            }
            return {
                productId: product.id, 
                name: product.name,
                images: product.images,
                quantity: item.quantity,
                price: item.price?.unit_amount! / 100,
            }
        }).filter(p => p.productId !== 'shipping_cost') // Filter out shipping cost item
      };

      // Save order to Firestore
      await db.collection('orders').add(orderData);
      
      // Update product stock
      const batch = db.batch();
      for (const item of orderData.products) {
          if (item.productId) {
            const productRef = db.collection('store_products').doc(item.productId);
            const productDoc = await productRef.get();
            if (productDoc.exists()) {
              batch.update(productRef, {
                  stock: admin.firestore.FieldValue.increment(-(item.quantity || 0))
              });
            }
          }
      }
      await batch.commit();


    } catch (error) {
        console.error('Error handling checkout session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
