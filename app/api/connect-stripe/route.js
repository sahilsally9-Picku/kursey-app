import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// server-side supabase with the SERVICE key (bypasses RLS safely, server-only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const { shopId, origin } = await request.json();
    if (!shopId) return Response.json({ error: "Missing shopId" }, { status: 400 });

    const { data: shop } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    let accountId = shop.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { shop_id: shopId, shop_name: shop.name },
      });
      accountId = account.id;
      const { error: updErr } = await supabase.from("shops").update({ stripe_account_id: accountId }).eq("id", shopId);
      if (updErr) return Response.json({ error: "Save failed: " + updErr.message }, { status: 500 });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,
      return_url: `${origin}/settings?stripe=done`,
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}