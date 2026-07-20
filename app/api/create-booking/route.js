import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const b = await req.json();
    if (!b.shop_id) return NextResponse.json({ error: "Missing shop" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        shop_id: b.shop_id,
        service: b.service,
        price: b.price,
        barber: b.barber,
        day: b.day,
        slot: b.slot,
        booking_date: b.booking_date,
        start_min: b.start_min,
        duration_min: b.duration_min,
        customer_name: b.customer_name,
        phone: b.phone,
        email: b.email,
        wants_offers: b.wants_offers,
        customer_user_id: b.customer_user_id || null,
        deposit_paid: b.deposit_paid || false,
        deposit_amount: b.deposit_amount || 0,
        stripe_payment_intent: b.stripe_payment_intent || null,
        status: b.status || "confirmed",
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}