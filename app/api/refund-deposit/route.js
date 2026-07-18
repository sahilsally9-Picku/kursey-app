import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) return Response.json({ error: "Missing bookingId" }, { status: 400 });

    // get the booking + its shop
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (!booking.deposit_paid) return Response.json({ error: "No deposit on this booking" }, { status: 400 });
    if (booking.deposit_refunded) return Response.json({ error: "Already refunded" }, { status: 400 });
    if (!booking.stripe_payment_intent) return Response.json({ error: "No payment record found (older booking — refund manually in Stripe)" }, { status: 400 });

    const { data: shop } = await supabase.from("shops").select("stripe_account_id").eq("id", booking.shop_id).single();
    if (!shop || !shop.stripe_account_id) return Response.json({ error: "Shop has no Stripe account" }, { status: 400 });

    // create the refund ON the shop's connected account
    await stripe.refunds.create(
      { payment_intent: booking.stripe_payment_intent },
      { stripeAccount: shop.stripe_account_id }
    );

    // mark it refunded
    await supabase.from("bookings").update({ deposit_refunded: true }).eq("id", bookingId);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}