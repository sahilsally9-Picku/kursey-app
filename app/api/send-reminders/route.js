import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// normal windows: ~24h before, and ~3h before
const DAY_WINDOW = [23 * 60, 25 * 60];
const HOURS_WINDOW = [2 * 60, 4 * 60];

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
    return Response.json({ ok: true, sentDay, sentHours, checked: (bookings || []).length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}