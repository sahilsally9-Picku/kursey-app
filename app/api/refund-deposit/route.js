import Stripe from "stripe";
import { admin, requireShopOwner } from "../../../lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) return Response.json({ error: "Missing bookingId" }, { status: 400 });

    const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).single();
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    // only the shop that owns this booking may refund it
    const gate = await requireShopOwner(request, booking.shop_id);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });
    const shop = gate.shop;

    if (!booking.deposit_paid) return Response.json({ error: "No deposit on this booking" }, { status: 400 });
    if (booking.deposit_refunded) return Response.json({ error: "Already refunded" }, { status: 400 });
    if (!booking.stripe_payment_intent) {
      return Response.json({ error: "No payment record found (older booking — refund manually in Stripe)" }, { status: 400 });
    }
    if (!shop.stripe_account_id) return Response.json({ error: "Shop has no Stripe account" }, { status: 400 });

    await stripe.refunds.create(
      { payment_intent: booking.stripe_payment_intent },
      { stripeAccount: shop.stripe_account_id }
    );

    await admin.from("bookings").update({ deposit_refunded: true }).eq("id", bookingId);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}