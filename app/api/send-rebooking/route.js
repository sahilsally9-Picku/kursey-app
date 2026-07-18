import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const today = new Date();

    // shops that have rebooking on
    const { data: shops } = await supabase.from("shops").select("*").eq("rebooking_enabled", true);
    let sent = 0;

    for (const shop of shops || []) {
      const weeks = shop.rebooking_weeks || 4;
      const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - weeks * 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      // get all this shop's confirmed bookings with an email
      const { data: bookings } = await supabase.from("bookings")
        .select("*").eq("shop_id", shop.id)
        .neq("status", "cancelled");

      if (!bookings) continue;

      // opt-outs for this shop
      const { data: optouts } = await supabase.from("marketing_optouts").select("email").eq("shop_id", shop.id);
      const optoutSet = new Set((optouts || []).map((o) => (o.email || "").trim().toLowerCase()));

      // group by customer (email), find their latest visit
      const byEmail = {};
      for (const b of bookings) {
        const em = (b.email || "").trim().toLowerCase();
        if (!em) continue;
        if (!byEmail[em]) byEmail[em] = [];
        byEmail[em].push(b);
      }

      for (const em of Object.keys(byEmail)) {
        if (optoutSet.has(em)) continue;
        const list = byEmail[em].filter((b) => b.booking_date);
        if (list.length === 0) continue;

        // most recent visit
        list.sort((a, b) => (a.booking_date < b.booking_date ? 1 : -1));
        const latest = list[0];

        // do they have any upcoming booking? if so, skip
        const hasUpcoming = list.some((b) => b.booking_date >= todayStr);
        if (hasUpcoming) continue;

        // already nudged for this latest visit? skip
        if (latest.rebooking_sent) continue;

        // latest visit older than the cutoff?
        if (latest.booking_date <= cutoffStr) {
          const unsubUrl = `https://www.kursey.com/unsubscribe?shop=${shop.id}&email=${encodeURIComponent(em)}`;
          const { error } = await resend.emails.send({
            from: `${shop.name} <hello@kursey.com>`,
            to: [em],
            subject: `Time for your next visit to ${shop.name}?`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; color:#1c1917;">
                <h2 style="color:#059669;">${shop.name}</h2>
                <p>Hi ${latest.customer_name || "there"},</p>
                <p>It's been a little while since your last visit — we'd love to see you again!</p>
                <p><a href="https://www.kursey.com/${shop.slug}" style="display:inline-block; background:#059669; color:#fff; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">Book your next appointment</a></p>
                <hr style="border:none; border-top:1px solid #e7e5e4; margin:20px 0;" />
                <p style="color:#a8a29e; font-size:12px;"><a href="${unsubUrl}" style="color:#78716c;">Unsubscribe</a> from these reminders.</p>
              </div>
            `,
          });
          if (!error) {
            await supabase.from("bookings").update({ rebooking_sent: true }).eq("id", latest.id);
            sent++;
          }
        }
      }
    }

    return Response.json({ ok: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}