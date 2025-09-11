
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  const adminApp = initializeAdminApp();
  const db = admin.firestore(adminApp);

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
      const orderRef = await db.collection('orders').add(orderData);
      
      // Update product stock
      const batch = db.batch();
      for (const item of orderData.products) {
          // Stripe product IDs might not match Firestore product IDs if you're not syncing them.
          // This assumes the Stripe Product was created with a specific metadata field or the name is unique enough.
          // For now, we will assume we need to query by name to find the correct product in Firestore to update stock.
          if (item.name) {
            const productsRef = db.collection('store_products');
            const q = productsRef.where('name', '==', item.name).limit(1);
            const productSnapshot = await q.get();

            if (!productSnapshot.empty) {
                const productDoc = productSnapshot.docs[0];
                const productData = productDoc.data();
                if (productData.stock !== undefined && productData.stock !== null) {
                    batch.update(productDoc.ref, {
                        stock: admin.firestore.FieldValue.increment(-(item.quantity || 0))
                    });
                }
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
