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
    if (!shop.deposits_enabled) return Response.json({ error: "Deposits not enabled" }, { status: 400 });
    if (!shop.stripe_account_id) return Response.json({ error: "Shop has no Stripe account" }, { status: 400 });

    const amount = (shop.deposit_amount || 10) * 100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
    }, {
      stripeAccount: shop.stripe_account_id,
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      accountId: shop.stripe_account_id,
      amount: shop.deposit_amount || 10,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}