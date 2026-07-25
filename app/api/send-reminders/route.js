import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// normal windows: ~24h before, and ~3h before
const DAY_WINDOW = [23 * 60, 25 * 60];
const HOURS_WINDOW = [2 * 60, 4 * 60];

// email the shop owner when their trial has this many days (or fewer) left
const TRIAL_NUDGE_DAYS = 3;

function bookingStartsInMinutes(b) {
  if (!b.booking_date || b.start_min == null) return null;
  const [y, mo, d] = b.booking_date.split("-").map(Number);
  const start = new Date(y, mo - 1, d, 0, 0, 0);
  start.setMinutes(b.start_min);
  return Math.round((start.getTime() - Date.now()) / 60000);
}

async function sendReminder(resend, b, whenText) {
  if (!b.email) return false;
  const { error } = await resend.emails.send({
    from: "Kursey <reminders@kursey.com>",
    to: [b.email],
    subject: `Reminder: your appointment ${whenText}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; color:#1c1917;">
        <h2 style="color:#059669;">Appointment reminder</h2>
        <p>Hi ${b.customer_name || "there"},</p>
        <p>Just a reminder about your upcoming appointment:</p>
        <div style="background:#f5f5f4; border-radius:12px; padding:16px; margin:12px 0;">
          <p style="margin:0;"><strong>${b.service}</strong> with <strong>${b.barber}</strong></p>
          <p style="margin:4px 0 0;">${b.day} at ${b.slot}</p>
        </div>
        <p>See you soon!</p>
        <p style="color:#78716c; font-size:12px; margin-top:20px;">Powered by Kursey</p>
      </div>
    `,
  });
  return !error;
}

// The owner's email might sit on the shops row under a few possible names.
// If it isn't there, fall back to the Supabase auth user that owns the shop.
async function ownerEmail(shop) {
  const direct = shop.email || shop.owner_email || shop.contact_email;
  if (direct) return direct;
  if (!shop.owner_id) return null;
  try {
    const { data } = await supabase.auth.admin.getUserById(shop.owner_id);
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

async function sendTrialNudge(resend, shop, to, daysLeft) {
  const dayWord = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  const { error } = await resend.emails.send({
    from: "Kursey <reminders@kursey.com>",
    to: [to],
    subject: `Your Kursey trial ends in ${dayWord}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; color:#1c1917;">
        <h2 style="color:#13294b;">Your free trial ends in ${dayWord}</h2>
        <p>Hi${shop.name ? ` ${shop.name}` : ""},</p>
        <p>Your Kursey trial wraps up in <strong>${dayWord}</strong>. When it does, your booking page stops taking new appointments until you pick a plan.</p>
        <div style="background:#f1f5f9; border-radius:12px; padding:16px; margin:12px 0;">
          <p style="margin:0;">Your bookings, staff, services and settings all stay exactly where they are — nothing is deleted. Subscribing switches everything back on straight away.</p>
        </div>
        <p style="margin:20px 0;">
          <a href="https://kursey.com/plan" style="background:#13294b; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:600; display:inline-block;">Choose your plan</a>
        </p>
        <p>If anything hasn't worked the way you hoped, just reply to this email and tell me — I'd rather fix it than lose you.</p>
        <p style="color:#78716c; font-size:12px; margin-top:20px;">Powered by Kursey</p>
      </div>
    `,
  });
  return !error;
}

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const { data: bookings } = await supabase
      .from("bookings").select("*").gte("booking_date", today);

    let sentDay = 0, sentHours = 0;
    for (const b of bookings || []) {
      const mins = bookingStartsInMinutes(b);
      if (mins == null || mins < 0) continue;
      if (!b.reminder_day_sent && mins >= DAY_WINDOW[0] && mins <= DAY_WINDOW[1]) {
        if (await sendReminder(resend, b, "tomorrow")) { await supabase.from("bookings").update({ reminder_day_sent: true }).eq("id", b.id); sentDay++; }
      }
      if (!b.reminder_hours_sent && mins >= HOURS_WINDOW[0] && mins <= HOURS_WINDOW[1]) {
        if (await sendReminder(resend, b, "in a few hours")) { await supabase.from("bookings").update({ reminder_hours_sent: true }).eq("id", b.id); sentHours++; }
      }
    }

    // ---- trial ending soon: nudge the shop owner (once) ----
    let sentTrial = 0;
    const { data: shops } = await supabase
      .from("shops").select("*")
      .not("trial_ends_at", "is", null)
      .is("trial_nudge_sent_at", null);

    for (const shop of shops || []) {
      if (shop.subscription_status === "active") continue;
      const msLeft = new Date(shop.trial_ends_at).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / 86400000);
      if (daysLeft < 1 || daysLeft > TRIAL_NUDGE_DAYS) continue;
      const to = await ownerEmail(shop);
      if (!to) continue;
      if (await sendTrialNudge(resend, shop, to, daysLeft)) {
        await supabase.from("shops").update({ trial_nudge_sent_at: new Date().toISOString() }).eq("id", shop.id);
        sentTrial++;
      }
    }

    return Response.json({ ok: true, sentDay, sentHours, sentTrial, checked: (bookings || []).length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}