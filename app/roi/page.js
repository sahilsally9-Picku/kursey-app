"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const TZ = "America/Halifax";

// Your `price` and `deposit_amount` columns are whole numbers. If a $25 haircut
// is stored as 25, leave this false. If it's stored as 2500 (cents), set true.
const AMOUNTS_IN_CENTS = false;

// Share of reminded appointments that would likely have been missed without a
// reminder. Deliberately conservative — this is the only estimated figure here.
const NO_SHOW_RATE = 0.05;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function money(n) {
  const v = AMOUNTS_IN_CENTS ? n / 100 : n;
  return "$" + (v || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normDay(v) {
  if (typeof v === "number") return DAY_KEYS[((v % 7) + 7) % 7];
  const s = String(v).trim().toLowerCase().slice(0, 3);
  return DAY_KEYS.includes(s) ? s : null;
}

function parseTime(t) {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// when a booking was actually made, in the shop's own time
function madeAt(iso) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { day: String(p.weekday).toLowerCase().slice(0, 3), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function todayInTz() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

const RANGES = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
];

export default function RoiPage() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [rangeId, setRangeId] = useState("30");
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.replace("/signup"); return; }
      setShop(shopData);

      const { data: staffData } = await supabase.from("staff").select("*").eq("shop_id", shopData.id);
      setStaff(staffData || []);

      // read every booking in pages of 1000
      const rows = [];
      for (let from = 0; from < 50000; from += 1000) {
        const { data, error } = await supabase
          .from("bookings")
          .select("id,created_at,email,customer_name,price,deposit_amount,deposit_paid,deposit_refunded,booking_date,status,is_block,rebooking_sent,reminder_day_sent,reminder_hours_sent")
          .eq("shop_id", shopData.id)
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error || !data || data.length === 0) break;
        rows.push(...data);
        if (data.length < 1000) break;
      }
      setBookings(rows);
      setChecking(false);
    }
    init();
  }, [router]);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Working out your numbers…</div>;

  // ---- when is this shop open? ----
  const windows = {};
  for (const s of staff) {
    const days = Array.isArray(s.work_days) ? s.work_days : [];
    const st = parseTime(s.start_time);
    const en = parseTime(s.end_time);
    if (st == null || en == null) continue;
    for (const d of days) {
      const k = normDay(d);
      if (!k) continue;
      if (!windows[k]) windows[k] = [st, en];
      else { windows[k][0] = Math.min(windows[k][0], st); windows[k][1] = Math.max(windows[k][1], en); }
    }
  }
  const hasHours = Object.keys(windows).length > 0;

  function bookedWhileClosed(b) {
    if (!b.created_at || !hasHours) return false;
    const at = madeAt(b.created_at);
    const w = windows[at.day];
    if (!w) return true;                       // shop shut that day entirely
    return at.minutes < w[0] || at.minutes >= w[1];
  }

  // ---- the window we're reporting on ----
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0];
  const today = todayInTz();
  const fromDate = addDays(today, -range.days);
  const fromMs = new Date(fromDate + "T00:00:00Z").getTime();

  const real = bookings.filter((b) => !b.is_block && b.status !== "cancelled");
  const inRange = real.filter((b) => b.created_at && new Date(b.created_at).getTime() >= fromMs);

  // 1. booked outside opening hours
  const afterHours = inRange.filter(bookedWhileClosed);
  const afterHoursValue = afterHours.reduce((s, b) => s + (b.price || 0), 0);

  // 2. customers who came back after a rebooking nudge
  const nudged = new Set(real.filter((b) => b.rebooking_sent && b.email).map((b) => b.email.trim().toLowerCase()));
  const winBacks = inRange.filter((b) => {
    const em = (b.email || "").trim().toLowerCase();
    if (!em || !nudged.has(em)) return false;
    return real.some((o) => (o.email || "").trim().toLowerCase() === em && o.rebooking_sent && new Date(o.created_at) < new Date(b.created_at));
  });
  const winBackValue = winBacks.reduce((s, b) => s + (b.price || 0), 0);

  // 3. deposits actually taken
  const deposits = inRange.filter((b) => b.deposit_paid && !b.deposit_refunded);
  const depositValue = deposits.reduce((s, b) => s + (b.deposit_amount || 0), 0);

  // 4. reminders — the estimated one
  const reminded = inRange.filter((b) => b.reminder_day_sent || b.reminder_hours_sent);
  const remindedValue = reminded.reduce((s, b) => s + (b.price || 0), 0);
  const noShowEstimate = Math.round(remindedValue * NO_SHOW_RATE);

  // Headline: after-hours + win-backs, counted once each (a booking can be both).
  const countedIds = new Set([...afterHours, ...winBacks].map((b) => b.id));
  const countedValue = [...afterHours, ...winBacks]
    .filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i)
    .reduce((s, b) => s + (b.price || 0), 0);
  const headline = countedValue + noShowEstimate;

  const planCost = { solo: 12.99, shop: 29.99, studio: 49.99 }[shop.plan || "shop"] || 29.99;
  const monthsInRange = range.days / 30;
  const spend = planCost * monthsInRange;

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">What Kursey brought in</h1>
            <p className="text-sm text-slate-500">{shop.name}</p>
          </div>
          <a href="/dashboard" className="text-sm font-medium text-[#13294b] hover:underline">← Dashboard</a>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${rangeId === r.id ? "bg-[#13294b] text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* the receipt — shows its own arithmetic */}
        <div className={`mt-5 overflow-hidden ${card}`}>
          <div className="border-b border-dashed border-slate-300 bg-[#13294b] px-6 py-6 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{range.label}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums">{money(headline)}</div>
            <div className="mt-1 text-sm text-white/70">brought in by things Kursey did while you got on with the work</div>
          </div>

          <div className="px-6 py-5 font-mono text-sm">
            <Line label="Booked while you were closed" note={`${afterHours.length} appointment${afterHours.length === 1 ? "" : "s"}`} value={money(afterHoursValue)} />
            <Line label="Customers who came back after a nudge" note={`${winBacks.length} returning`} value={money(winBackValue)} />
            {countedIds.size < afterHours.length + winBacks.length && (
              <div className="py-1 pl-4 text-xs text-slate-400">less {afterHours.length + winBacks.length - countedIds.size} counted in both rows</div>
            )}
            <Line label="No-shows probably avoided" note={`${reminded.length} reminded · estimate only`} value={money(noShowEstimate)} muted />
            <div className="mt-3 flex items-baseline justify-between border-t-2 border-slate-900 pt-3">
              <span className="font-semibold">Total</span>
              <span className="font-display text-xl font-bold tabular-nums">{money(headline)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-slate-500">
              <span>Your plan over the same period</span>
              <span className="tabular-nums">−${spend.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={`p-5 ${card}`}>
            <div className="text-sm font-medium text-slate-500">Deposits taken up front</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#13294b] tabular-nums">{money(depositValue)}</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Across {deposits.length} booking{deposits.length === 1 ? "" : "s"}. Money already in your account before the client sat down. Not added to the total above — it's part of what those appointments were worth, not extra on top.
            </p>
          </div>
          <div className={`p-5 ${card}`}>
            <div className="text-sm font-medium text-slate-500">Appointments booked</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#13294b] tabular-nums">{inRange.length}</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {hasHours
                ? `${afterHours.length} of them came in outside your opening hours — calls you'd have missed.`
                : "Set your staff working hours to see how many arrived outside opening hours."}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Where these come from.</span> Bookings made outside your staff's working hours are counted at their full service price. Returning customers are ones who got a rebooking email and then booked again. The no-show figure is the only estimate on this page — it assumes {Math.round(NO_SHOW_RATE * 100)} in 100 reminded appointments would otherwise have been missed. Cancelled bookings and blocked-out time are left out entirely.
        </div>
      </div>
    </div>
  );
}

function Line({ label, note, value, muted }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className={muted ? "text-slate-500" : ""}>{label}</div>
        {note && <div className="text-xs text-slate-400">{note}</div>}
      </div>
      <div className={`shrink-0 tabular-nums ${muted ? "text-slate-500" : "font-semibold"}`}>{value}</div>
    </div>
  );
}