import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    // subscription checkout completed → mark shop active
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

    // subscription cancelled or unpaid → mark past_due
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await supabase.from("shops").update({ subscription_status: "past_due" })
        .eq("stripe_subscription_id", sub.id);
    }

    // payment failed on renewal → mark past_due
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from("shops").update({ subscription_status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription);
      }
    }

    // renewal succeeded → keep active
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from("shops").update({ subscription_status: "active" })
          .eq("stripe_subscription_id", invoice.subscription);
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}