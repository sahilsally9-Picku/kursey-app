import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function activateShop({ shopId, customerId, subscriptionId }) {
  // try to find the shop by any identifier we have
  let shop = null;

  if (shopId) {
    const r = await supabase.from("shops").select("id").eq("id", shopId).single();
    shop = r.data;
  }
  if (!shop && subscriptionId) {
    const r = await supabase.from("shops").select("id").eq("stripe_subscription_id", subscriptionId).single();
    shop = r.data;
  }
  if (!shop && customerId) {
    const r = await supabase.from("shops").select("id").eq("stripe_customer_id", customerId).single();
    shop = r.data;
  }

  if (shop) {
    await supabase.from("shops").update({
      subscription_status: "active",
      stripe_customer_id: customerId || undefined,
      stripe_subscription_id: subscriptionId || undefined,
    }).eq("id", shop.id);
    return true;
  }
  return false;
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: `Signature failed: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const ok = await activateShop({
        shopId: s.metadata?.shop_id || s.client_reference_id,
        customerId: s.customer,
        subscriptionId: s.subscription,
      });
      return Response.json({ received: true, activated: ok, via: "checkout" });
    }

    if (event.type === "invoice.paid") {
      const inv = event.data.object;
      let shopId = null;
      // try to read shop_id from the subscription's metadata
      if (inv.subscription) {
        try { const sub = await stripe.subscriptions.retrieve(inv.subscription); shopId = sub.metadata?.shop_id; } catch (e) {}
      }
      const ok = await activateShop({
        shopId,
        customerId: inv.customer,
        subscriptionId: inv.subscription,
      });
      return Response.json({ received: true, activated: ok, via: "invoice.paid" });
    }

    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object;
      if (inv.subscription) {
        await supabase.from("shops").update({ subscription_status: "past_due" }).eq("stripe_subscription_id", inv.subscription);
      }
      return Response.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await supabase.from("shops").update({ subscription_status: "past_due" }).eq("stripe_subscription_id", sub.id);
      return Response.json({ received: true });
    }

    return Response.json({ received: true, ignored: event.type });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}