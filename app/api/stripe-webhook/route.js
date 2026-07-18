import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function markActiveBySubscription(subscriptionId) {
  if (!subscriptionId) return;
  // get the subscription to read its shop_id metadata
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const shopId = sub.metadata?.shop_id;
  if (shopId) {
    await supabase.from("shops").update({
      subscription_status: "active",
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
    }).eq("id", shopId);
  }
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  try {
    // subscription paid (first payment or renewal) → active
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      await markActiveBySubscription(invoice.subscription);
    }

    // also handle checkout completion directly (belt and suspenders)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const shopId = session.metadata?.shop_id || session.client_reference_id;
      if (shopId) {
        await supabase.from("shops").update({
          subscription_status: "active",
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }).eq("id", shopId);
      }
    }

    // payment failed → past_due
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from("shops").update({ subscription_status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription);
      }
    }

    // subscription cancelled → past_due
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await supabase.from("shops").update({ subscription_status: "past_due" })
        .eq("stripe_subscription_id", sub.id);
    }

    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}