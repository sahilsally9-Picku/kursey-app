import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const { shopId } = await request.json();
    if (!shopId) return Response.json({ error: "Missing shopId" }, { status: 400 });

    const { data: shop } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    const sessions = await stripe.checkout.sessions.list({ limit: 10 });
    const mine = sessions.data.find(
      (s) => (s.client_reference_id === shopId || s.metadata?.shop_id === shopId) && s.payment_status === "paid"
    );

    if (!mine) {
      return Response.json({ active: false, reason: "no paid session found yet" });
    }

    const plan = mine.metadata?.plan || shop.plan || "shop";

    await supabase.from("shops").update({
      subscription_status: "active",
      plan: plan,
      stripe_customer_id: mine.customer,
      stripe_subscription_id: mine.subscription,
    }).eq("id", shopId);

    return Response.json({ active: true, plan });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}