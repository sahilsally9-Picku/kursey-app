import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    // simplest possible Stripe call: fetch account info
    const account = await stripe.accounts.retrieve();
    return Response.json({
      ok: true,
      message: "Server can reach Stripe!",
      account_id: account.id,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}