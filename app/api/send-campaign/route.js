import { Resend } from "resend";
import { admin, requireShopOwner } from "../../../lib/auth";

// Anything a person typed gets escaped before it goes into an email.
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeFromName(name) {
  const cleaned = String(name || "Kursey").replace(/["<>\r\n,;]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 60) || "Kursey";
}

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { shopId, subject, message, origin } = await request.json();
    if (!shopId || !subject || !message) return Response.json({ error: "Missing fields" }, { status: 400 });

    // only the shop owner may email that shop's customers
    const gate = await requireShopOwner(request, shopId);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });
    const shop = gate.shop;

    const cleanSubject = String(subject).replace(/[\r\n]+/g, " ").slice(0, 200);
    const base = origin || "https://www.kursey.com";

    const { data: bookings } = await admin.from("bookings")
      .select("email").eq("shop_id", shopId).eq("wants_offers", true);
    const emails = [...new Set((bookings || []).map((b) => (b.email || "").trim().toLowerCase()).filter(Boolean))];

    const { data: optouts } = await admin.from("marketing_optouts").select("email").eq("shop_id", shopId);
    const optoutSet = new Set((optouts || []).map((o) => (o.email || "").trim().toLowerCase()));
    const recipients = emails.filter((e) => !optoutSet.has(e));

    if (recipients.length === 0) return Response.json({ ok: true, sent: 0, note: "No opted-in recipients." });

    let sent = 0;
    for (const email of recipients) {
      const unsubUrl = `${base}/unsubscribe?shop=${shopId}&email=${encodeURIComponent(email)}`;
      const { error } = await resend.emails.send({
        from: `${safeFromName(shop.name)} <offers@kursey.com>`,
        to: [email],
        subject: cleanSubject,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; color:#1c1917;">
            <h2 style="color:#059669;">${esc(shop.name)}</h2>
            <div style="white-space: pre-wrap; line-height:1.6;">${esc(message)}</div>
            <hr style="border:none; border-top:1px solid #e7e5e4; margin:20px 0;" />
            <p style="color:#a8a29e; font-size:12px;">You're receiving this because you opted into offers from ${esc(shop.name)}. <a href="${unsubUrl}" style="color:#78716c;">Unsubscribe</a>.</p>
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