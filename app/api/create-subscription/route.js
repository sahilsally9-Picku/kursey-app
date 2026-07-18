import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PLAN_PRICES = {
  solo: "price_1TudCZ1F2GYIHOz9CC4Nljqc",
  shop: "price_1TudEN1F2GYIHOz9hnExp1RH",
  studio: "price_1TudFo1F2GYIHOz9eo8lpDla",
};

export async function POST(request) {
  try {
    const { shopId, origin, plan } = await request.json();
    if (!shopId) return Response.json({ error: "Missing shopId" }, { status: 400 });

    const chosenPlan = PLAN_PRICES[plan] ? plan : "shop";
    const priceId = PLAN_PRICES[chosenPlan];

    const { data: shop } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: shopId,
      metadata: { shop_id: shopId, plan: chosenPlan },
      subscription_data: { metadata: { shop_id: shopId, plan: chosenPlan } },
      success_url: `${origin}/dashboard?sub=success`,
      cancel_url: `${origin}/plan?sub=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}