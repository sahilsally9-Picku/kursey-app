import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEFAULT_TZ = "America/Halifax";

// Don't chase someone who stopped coming ages ago — a "we miss you" note to a
// customer from two years back reads as spam, not service.
const MAX_WEEKS_BACK = 26;

// Hard ceiling on emails per run, so a first run across a big shop can't fire
// off a thousand messages at once and torch your sending reputation.
const MAX_PER_RUN = 200;

function todayInTz(tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// A shop name can contain quotes, commas or angle brackets, any of which break
// an email From header. Strip them.
function safeFromName(name) {
  const cleaned = (name || "Kursey").replace(/["<>\r\n,;]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 60) || "Kursey";
}

// Supabase returns at most 1000 rows per request, so walk through in pages.
async function fetchAllBookings(shopId) {
  const rows = [];
  const size = 1000;
  for (let from = 0; from < 50000; from += size) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id,email,customer_name,booking_date,status,rebooking_sent")
      .eq("shop_id", shopId)
      .or("status.is.null,status.neq.cancelled")
      .order("booking_date", { ascending: false })
      .range(from, from + size - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < size) break;
  }
  return rows;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  const auth = request.headers.get("authorization") || "";
  const key = new URL(request.url).searchParams.get("key") || "";
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const todayStr = todayInTz(DEFAULT_TZ);

    const { data: shops } = await supabase.from("shops").select("*").eq("rebooking_enabled", true);
    let sent = 0, skippedTooOld = 0, capped = false;

    for (const shop of shops || []) {
      if (sent >= MAX_PER_RUN) { capped = true; break; }

      const weeks = shop.rebooking_weeks || 4;
      const cutoffStr = addDays(todayStr, -weeks * 7);      // last visit must be at least this old
      const floorStr = addDays(todayStr, -MAX_WEEKS_BACK * 7); // ...but not older than this

      const bookings = await fetchAllBookings(shop.id);
      if (bookings.length === 0) continue;

      const { data: optouts } = await supabase
        .from("marketing_optouts").select("email").eq("shop_id", shop.id);
      const optoutSet = new Set((optouts || []).map((o) => (o.email || "").trim().toLowerCase()));

      // group by customer email
      const byEmail = {};
      for (const b of bookings) {
        const em = (b.email || "").trim().toLowerCase();
        if (!em || !b.booking_date) continue;
        if (!byEmail[em]) byEmail[em] = [];
        byEmail[em].push(b);
      }

      for (const em of Object.keys(byEmail)) {
        if (sent >= MAX_PER_RUN) { capped = true; break; }
        if (optoutSet.has(em)) continue;

        const list = byEmail[em];
        list.sort((a, b) => (a.booking_date < b.booking_date ? 1 : -1));
        const latest = list[0];

        if (list.some((b) => b.booking_date >= todayStr)) continue; // already coming back
        if (latest.rebooking_sent) continue;                        // already nudged
        if (latest.booking_date > cutoffStr) continue;              // too recent to chase
        if (latest.booking_date < floorStr) { skippedTooOld++; continue; } // gone too long

        const unsubUrl = `https://www.kursey.com/unsubscribe?shop=${shop.id}&email=${encodeURIComponent(em)}`;
        const { error } = await resend.emails.send({
          from: `${safeFromName(shop.name)} <hello@kursey.com>`,
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

    return Response.json({ ok: true, localDate: todayStr, sent, skippedTooOld, capped });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}