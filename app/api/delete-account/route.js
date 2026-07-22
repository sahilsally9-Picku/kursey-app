import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing user" }, { status: 400 });

    // find this owner's shop
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .single();

    if (shop) {
      const sid = shop.id;
      // remove child data first (in case cascade isn't set on every table)
      await supabaseAdmin.from("bookings").delete().eq("shop_id", sid);
      await supabaseAdmin.from("reviews").delete().eq("shop_id", sid);
      await supabaseAdmin.from("customer_profiles").delete().eq("shop_id", sid);
      await supabaseAdmin.from("marketing_optouts").delete().eq("shop_id", sid);
      await supabaseAdmin.from("services").delete().eq("shop_id", sid);
      await supabaseAdmin.from("staff").delete().eq("shop_id", sid);
      await supabaseAdmin.from("shops").delete().eq("id", sid);
    }

    // finally, delete the auth login itself
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) return NextResponse.json({ error: "Data removed, but couldn't delete login: " + authErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}