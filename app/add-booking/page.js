"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { terms, cap } from "../../lib/terms";
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
function activeBlocks(total, gapAfter, gapMin) {
  const post = total - (gapAfter || 0) - (gapMin || 0);
  if (!gapMin || !gapAfter || post <= 0) return [{ o: 0, l: total }];
  return [{ o: 0, l: gapAfter }, { o: gapAfter + gapMin, l: post }];
}
function tightSlots(barber, durMin, gapAfter, gapMin, dayBookings) {
  const dur = durMin || 30;
  const open = toMin(barber.start_time || "09:00"), close = toMin(barber.end_time || "17:00");
  const blocks = activeBlocks(dur, gapAfter, gapMin);
  const busy = [...(dayBookings || []).filter((b) => b.start_min != null).map((b) => ({ s: b.start_min, e: b.start_min + (b.duration_min || 30) })), ...breakBlocks(barber)].sort((a, b) => a.s - b.s);
  const out = []; let cur = open, g = 0;
  while (cur + dur <= close && g < 400) {
    g++;
    let advance = null;
    for (const bl of blocks) { const hit = busy.find((b) => overlaps(cur + bl.o, cur + bl.o + bl.l, b.s, b.e)); if (hit) { advance = Math.max(cur + 5, hit.e - bl.o); break; } }
    if (advance !== null) { cur = advance; continue; }
    out.push(cur); cur += dur;
  }
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
  const [picked, setPicked] = useState([]);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);

  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [doneInfo, setDoneInfo] = useState(null);
  const [error, setError] = useState("");
  const [classSpots, setClassSpots] = useState([]);

  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.replace("/signup"); return; }
      setShop(shopData);
      const [sv, st] = await Promise.all([
        supabase.from("services").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: true }),
        supabase.from("staff").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: true }),
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

  const totalMins = picked.reduce((n, s) => n + (s.mins || 30), 0);
  const totalPrice = picked.reduce((n, s) => n + (s.price || 0), 0);
  const serviceNames = picked.map((s) => s.name).join(" + ");
  const soloService = picked.length === 1 ? picked[0] : null;
  const gapAfter = soloService ? (soloService.gap_after_min || 0) : 0;
  const gapMin = soloService ? (soloService.gap_min || 0) : 0;
  const classCap = soloService ? (soloService.capacity || 1) : 1;
  const isClass = classCap > 1;
  const soloName = soloService ? soloService.name : "";
  const t = terms(shop?.business_type);

  useEffect(() => {
    async function loadSpots() {
      if (!isClass || !barber || !date || !shop) { setClassSpots([]); return; }
      const { data } = await supabase.rpc("class_spots", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key, p_service: soloName });
      setClassSpots(data || []);
    }
    loadSpots();
  }, [isClass, soloName, barber, date, shop]);

  function toggleService(s) { setPicked((prev) => prev.some((p) => p.id === s.id) ? prev.filter((p) => p.id !== s.id) : [...prev, s]); setSlot(null); }
  function pickBarber(id) { const b = staff.find((x) => String(x.id) === String(id)) || null; setBarber(b); setDate(null); setSlot(null); }
  function pickDate(d) { setDate(d); setSlot(null); }

  async function save() {
    setError("");
    if (!name.trim()) { setError("Please enter the customer's name."); return; }
    if (picked.length === 0) { setError("Please choose at least one service."); return; }
    if (!barber) { setError(`Please choose a ${t.staff}.`); return; }
    if (!date || slot == null) { setError("Please choose a date and time."); return; }

    setSaving(true);
    const dur = totalMins || 30;
    const { data: fresh } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key });
    let joiningClass = false;
    if (isClass) {
      const { data: freshSpots } = await supabase.rpc("class_spots", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key, p_service: soloName });
      const row = (freshSpots || []).find((cs) => cs.start_min === slot);
      const takenNow = row ? Number(row.taken) : 0;
      if (takenNow >= classCap) { setSaving(false); setError("That class just filled up — please pick another time."); setSlot(null); return; }
      joiningClass = takenNow > 0;
    }
    const myBlocks = activeBlocks(dur, gapAfter, gapMin);
    const clash = !joiningClass && (fresh || []).some((b) => b.start_min != null && myBlocks.some((bl) => overlaps(slot + bl.o, slot + bl.o + bl.l, b.start_min, b.start_min + (b.duration_min || 30))));
    if (clash) { setSaving(false); setError("That time was just taken — please pick another."); setSlot(null); return; }

    const res = await fetch("/api/create-booking", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: shop.id, service: serviceNames, price: totalPrice, barber: barber.name,
        day: `${date.label} ${date.sub}`, slot: toLabel(slot),
        booking_date: date.key, start_min: slot, duration_min: dur,
        customer_name: name, phone: phone, email: email, wants_offers: false,
        customer_user_id: null, deposit_paid: false, deposit_amount: 0,
        stripe_payment_intent: null, status: "confirmed",
        gap_after_min: gapAfter, gap_min: gapMin, capacity: classCap,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || json.error) { setError("Couldn't save: " + (json.error || "please try again")); return; }
    if (json.booking?.id && email) {
      fetch("/api/send-confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: json.booking.id }) }).catch(() => {});
    }
    setDoneInfo({ name, services: serviceNames, barber: barber.name, when: `${date.label} ${date.sub} at ${toLabel(slot)}` });
    setDone(true);
  }

  function addAnother() {
    setDone(false); setDoneInfo(null); setName(""); setPhone(""); setEmail("");
    setPicked([]); setBarber(null); setDate(null); setSlot(null); setDayBookings([]); setError("");
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";
  const label = "mb-1 block text-sm font-medium text-slate-700";
  const dates = barber ? upcomingDates(barber) : [];
  const baseSlots = (barber && picked.length > 0 && date) ? tightSlots(barber, totalMins, gapAfter, gapMin, dayBookings) : [];
  const spotsTaken = {}; classSpots.forEach((cs) => { spotsTaken[cs.start_min] = Number(cs.taken); });
  const openClassTimes = isClass ? classSpots.filter((cs) => Number(cs.taken) < classCap).map((cs) => cs.start_min) : [];
  const slots = [...new Set([...baseSlots, ...openClassTimes])].sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Add a booking</h1>
          <a href="/dashboard" className="whitespace-nowrap text-sm font-medium text-[#13294b] hover:underline">← Dashboard</a>
        </div>
        <p className="mt-1 text-sm text-slate-500">For walk-ins or phone bookings.</p>

        {done && doneInfo ? (
          <div className={`mt-6 p-6 text-center ${card}`}>
            <div className="font-display text-xl font-semibold text-[#13294b]">Booking added ✓</div>
            <p className="mt-1 text-sm text-slate-600">{doneInfo.name} · {doneInfo.services} with {doneInfo.barber}</p>
            <p className="text-sm text-slate-600">{doneInfo.when}</p>
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
              <label className={label}>Service{picked.length > 1 ? "s" : ""} <span className="text-slate-400">— tap to select one or more</span></label>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500">No services yet. Add some in <a href="/settings" className="text-[#13294b] underline">Settings</a>.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {services.map((s) => {
                      const on = picked.some((p) => p.id === s.id);
                      return (
                        <button key={s.id} onClick={() => toggleService(s)} className={`flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left transition ${on ? "ring-2 ring-[#13294b]" : "ring-1 ring-slate-300 hover:ring-[#13294b]"}`}>
                          <span className="flex items-center gap-3">
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs text-white ${on ? "border-[#13294b] bg-[#13294b]" : "border-slate-300"}`}>{on ? "✓" : ""}</span>
                            <span><span className="text-sm font-medium">{s.name}</span><span className="ml-2 text-xs text-slate-500">{s.mins || 30} min{s.capacity > 1 ? ` · class of ${s.capacity}` : ""}</span></span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold">${s.price}</span>
                        </button>
                      );
                    })}
                  </div>
                  {picked.length > 0 && (
                    <p className="mt-2 text-sm font-medium text-[#13294b]">{picked.length} selected · {totalMins} min · ${totalPrice}{gapMin > 0 ? ` · ${gapMin} min processing gap` : ""}{isClass ? ` · class of ${classCap}` : ""}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className={label}>{cap(t.staff)}</label>
              {staff.length === 0 ? (
                <p className="text-sm text-slate-500">No {t.staffPlural} yet. Add them in <a href="/settings" className="text-[#13294b] underline">Settings</a>.</p>
              ) : (
                <select value={barber?.id ?? ""} onChange={(e) => pickBarber(e.target.value)} className={input}>
                  <option value="">Choose a {t.staff}…</option>
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

            {barber && picked.length > 0 && date && (
              <div>
                <label className={label}>Time</label>
                {loadingSlots ? (
                  <p className="text-sm text-slate-500">Loading times…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-500">No open slots that day for a {totalMins}-minute appointment.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((m) => { const left = isClass ? classCap - (spotsTaken[m] || 0) : null; return (
                      <button key={m} onClick={() => setSlot(m)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${slot === m ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>
                        <div>{toLabel(m)}</div>{isClass && <div className={`text-[10px] ${slot === m ? "text-white/70" : "text-slate-500"}`}>{left} left</div>}
                      </button>
                    ); })}
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