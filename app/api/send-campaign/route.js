import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { shopId, subject, message, origin } = await request.json();
    if (!shopId || !subject || !message) return Response.json({ error: "Missing fields" }, { status: 400 });

    const { data: shop } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    // collect opted-in emails (wants_offers = true), unique
    const { data: bookings } = await supabase.from("bookings")
      .select("email").eq("shop_id", shopId).eq("wants_offers", true);
    const emails = [...new Set((bookings || []).map((b) => (b.email || "").trim().toLowerCase()).filter(Boolean))];

    // remove anyone who unsubscribed
    const { data: optouts } = await supabase.from("marketing_optouts").select("email").eq("shop_id", shopId);
    const optoutSet = new Set((optouts || []).map((o) => (o.email || "").trim().toLowerCase()));
    const recipients = emails.filter((e) => !optoutSet.has(e));

    if (recipients.length === 0) return Response.json({ ok: true, sent: 0, note: "No opted-in recipients." });

    let sent = 0;
    for (const email of recipients) {
      const unsubUrl = `${origin}/unsubscribe?shop=${shopId}&email=${encodeURIComponent(email)}`;
      const { error } = await resend.emails.send({
        from: `${shop.name} <offers@kursey.com>`,
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; color:#1c1917;">
            <h2 style="color:#059669;">${shop.name}</h2>
            <div style="white-space: pre-wrap; line-height:1.6;">${message.replace(/</g, "&lt;")}</div>
            <hr style="border:none; border-top:1px solid #e7e5e4; margin:20px 0;" />
            <p style="color:#a8a29e; font-size:12px;">You're receiving this because you opted into offers from ${shop.name}. <a href="${unsubUrl}" style="color:#78716c;">Unsubscribe</a>.</p>
          </div>
        `,
      });
      if (!error) sent++;
    }

    return Response.json({ ok: true, sent, total: recipients.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}