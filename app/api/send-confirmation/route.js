import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: "Missing bookingId" }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // load the booking
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (!booking.email) return Response.json({ ok: true, skipped: "no email" });

    // load the shop for its name
    const { data: shop } = await supabase.from("shops").select("name,address,phone,slug").eq("id", booking.shop_id).single();
    const shopName = shop?.name || "the shop";

    const resend = new Resend(process.env.RESEND_API_KEY);
    const depositLine = booking.deposit_paid ? `<p style="margin:0 0 8px">Deposit paid: $${booking.deposit_amount}</p>` : "";
    const whereLine = shop?.address ? `<p style="margin:0 0 8px;color:#57534e">${shop.address}</p>` : "";
    const phoneLine = shop?.phone ? `<p style="margin:0 0 8px;color:#57534e">${shop.phone}</p>` : "";

    await resend.emails.send({
      from: `${shopName} <hello@kursey.com>`,
      to: booking.email,
      subject: `You're booked at ${shopName}!`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1917">
          <h1 style="font-size:22px;margin:0 0 4px">You're booked, ${booking.customer_name}! ✅</h1>
          <p style="margin:0 0 16px;color:#57534e">Here are your appointment details.</p>
          <div style="background:#f5f5f4;border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 8px"><strong>${booking.service}</strong> with <strong>${booking.barber}</strong></p>
            <p style="margin:0 0 8px">${booking.day} at ${booking.slot}</p>
            <p style="margin:0 0 8px">Price: $${booking.price}</p>
            ${depositLine}
          </div>
          <p style="margin:0 0 4px;font-weight:600">${shopName}</p>
          ${whereLine}
          ${phoneLine}
          <p style="margin:16px 0 0;font-size:13px;color:#a8a29e">See you soon! If you need to cancel, please contact the shop.</p>
        </div>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}