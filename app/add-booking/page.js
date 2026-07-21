"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toLabel = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

function upcomingDates(barber) {
  const workDays = barber.work_days || []; const out = []; const today = new Date();
  for (let i = 0; i < 21 && out.length < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dn = DAY_NAMES[d.getDay()];
    if (workDays.includes(dn)) out.push({ key: d.toISOString().slice(0, 10), label: i === 0 ? "Today" : dn, sub: `${MONTHS[d.getMonth()]} ${d.getDate()}` });
  }
  return out;
}
function breakBlocks(barber) { return (barber.breaks || []).map((b) => { const [s, e] = b.split("-"); return { s: toMin(s), e: toMin(e) }; }); }
function tightSlots(barber, service, dayBookings) {
  const dur = service?.mins || 30;
  const open = toMin(barber.start_time || "09:00"), close = toMin(barber.end_time || "17:00");
  const busy = [...(dayBookings || []).filter((b) => b.start_min != null).map((b) => ({ s: b.start_min, e: b.start_min + (b.duration_min || 30) })), ...breakBlocks(barber)].sort((a, b) => a.s - b.s);
  const out = []; let cur = open, g = 0;
  while (cur + dur <= close && g < 300) { g++; const hit = busy.find((b) => overlaps(cur, cur + dur, b.s, b.e)); if (hit) { cur = hit.e; continue; } out.push(cur); cur += dur; }
  return out;
}

export default function AddBooking() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(null);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);

  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.replace("/signup"); return; }
      setShop(shopData);
      const [sv, st] = await Promise.all([
        supabase.from("services").select("*").eq("shop_id", shopData.id),
        supabase.from("staff").select("*").eq("shop_id", shopData.id),
      ]);
      setServices(sv.data || []);
      setStaff(st.data || []);
      setChecking(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    async function loadDay() {
      if (!barber || !date || !shop) { setDayBookings([]); return; }
      setLoadingSlots(true);
      const { data } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key });
      setDayBookings(data || []); setLoadingSlots(false);
    }
    loadDay();
  }, [barber, date, shop]);

  function pickService(id) { const s = services.find((x) => String(x.id) === String(id)) || null; setService(s); setSlot(null); }
  function pickBarber(id) { const b = staff.find((x) => String(x.id) === String(id)) || null; setBarber(b); setDate(null); setSlot(null); }
  function pickDate(d) { setDate(d); setSlot(null); }

  async function save() {
    setError("");
    if (!name.trim()) { setError("Please enter the customer's name."); return; }
    if (!service) { setError("Please choose a service."); return; }
    if (!barber) { setError("Please choose a staff member."); return; }
    if (!date || slot == null) { setError("Please choose a date and time."); return; }

    setSaving(true);
    const dur = service.mins || 30;
    const { data: fresh } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key });
    const clash = (fresh || []).some((b) => b.start_min != null && overlaps(slot, slot + dur, b.start_min, b.start_min + (b.duration_min || 30)));
    if (clash) { setSaving(false); setError("That time was just taken — please pick another."); setSlot(null); return; }

    const res = await fetch("/api/create-booking", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: shop.id, service: service.name, price: service.price, barber: barber.name,
        day: `${date.label} ${date.sub}`, slot: toLabel(slot),
        booking_date: date.key, start_min: slot, duration_min: dur,
        customer_name: name, phone: phone, email: email, wants_offers: false,
        customer_user_id: null, deposit_paid: false, deposit_amount: 0,
        stripe_payment_intent: null, status: "confirmed",
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || json.error) { setError("Couldn't save: " + (json.error || "please try again")); return; }
    setDone(true);
  }

  function addAnother() {
    setDone(false); setName(""); setPhone(""); setEmail("");
    setService(null); setBarber(null); setDate(null); setSlot(null); setDayBookings([]); setError("");
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";
  const label = "mb-1 block text-sm font-medium text-slate-700";
  const dates = barber ? upcomingDates(barber) : [];
  const slots = (barber && service && date) ? tightSlots(barber, service, dayBookings) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Add a booking</h1>
          <a href="/dashboard" className="whitespace-nowrap text-sm font-medium text-[#13294b] hover:underline">← Dashboard</a>
        </div>
        <p className="mt-1 text-sm text-slate-500">For walk-ins or phone bookings.</p>

        {done ? (
          <div className={`mt-6 p-6 text-center ${card}`}>
            <div className="font-display text-xl font-semibold text-[#13294b]">Booking added ✓</div>
            <p className="mt-1 text-sm text-slate-600">{name} · {service?.name} with {barber?.name}</p>
            <p className="text-sm text-slate-600">{date?.label} {date?.sub} at {slot != null ? toLabel(slot) : ""}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button onClick={addAnother} className="rounded-xl bg-[#13294b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d3a63]">Add another</button>
              <a href="/dashboard" className="rounded-xl border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to dashboard</a>
            </div>
          </div>
        ) : (
          <div className={`mt-6 space-y-4 p-5 ${card}`}>
            <div>
              <label className={label}>Customer name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Smith" className={input} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={input} />
            </div>
            <div>
              <label className={label}>Email <span className="text-slate-400">— optional (sends a confirmation)</span></label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" type="email" className={input} />
            </div>

            <div>
              <label className={label}>Service</label>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500">No services yet. Add some in <a href="/settings" className="text-[#13294b] underline">Settings</a>.</p>
              ) : (
                <select value={service?.id ?? ""} onChange={(e) => pickService(e.target.value)} className={input}>
                  <option value="">Choose a service…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} — ${s.price} · {s.mins || 30} min</option>)}
                </select>
              )}
            </div>

            <div>
              <label className={label}>Staff member</label>
              {staff.length === 0 ? (
                <p className="text-sm text-slate-500">No staff yet. Add them in <a href="/settings" className="text-[#13294b] underline">Settings</a>.</p>
              ) : (
                <select value={barber?.id ?? ""} onChange={(e) => pickBarber(e.target.value)} className={input}>
                  <option value="">Choose a staff member…</option>
                  {staff.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>

            {barber && (
              <div>
                <label className={label}>Date</label>
                {dates.length === 0 ? (
                  <p className="text-sm text-slate-500">{barber.name} has no working days set. Set their schedule in Settings.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dates.map((d) => (
                      <button key={d.key} onClick={() => pickDate(d)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${date?.key === d.key ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>
                        {d.label} <span className="opacity-70">{d.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {barber && service && date && (
              <div>
                <label className={label}>Time</label>
                {loadingSlots ? (
                  <p className="text-sm text-slate-500">Loading times…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-500">No open slots that day for a {service.mins || 30}-minute service.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((m) => (
                      <button key={m} onClick={() => setSlot(m)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${slot === m ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>
                        {toLabel(m)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button onClick={save} disabled={saving}
              className="w-full rounded-xl bg-[#13294b] py-3 font-semibold text-white shadow-sm transition enabled:hover:bg-[#1d3a63] disabled:opacity-40">
              {saving ? "Saving…" : "Add booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}