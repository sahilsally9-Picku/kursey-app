"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toLabel = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

function upcomingDates(barber) {
  const workDays = barber.work_days || [];
  const out = [];
  const today = new Date();
  for (let i = 0; i < 21 && out.length < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = DAY_NAMES[d.getDay()];
    if (workDays.includes(dayName)) {
      out.push({ key: d.toISOString().slice(0, 10), dayName, label: i === 0 ? "Today" : dayName, sub: `${MONTHS[d.getMonth()]} ${d.getDate()}` });
    }
  }
  return out;
}

// turn a barber's breaks (["13:00-14:00", ...]) into busy blocks {s,e}
function breakBlocks(barber) {
  return (barber.breaks || []).map((b) => {
    const [start, end] = b.split("-");
    return { s: toMin(start), e: toMin(end) };
  });
}

// "tight" slots: walk opening→closing, jump past any busy block (bookings + breaks)
function tightSlots(barber, service, bookings) {
  const dur = service?.mins || 30;
  const open = toMin(barber.start_time || "09:00");
  const close = toMin(barber.end_time || "17:00");

  const busy = [
    ...(bookings || []).filter((b) => b.start_min != null).map((b) => ({ s: b.start_min, e: b.start_min + (b.duration_min || 30) })),
    ...breakBlocks(barber),
  ].sort((a, b) => a.s - b.s);

  const out = [];
  let cur = open;
  let guard = 0;
  while (cur + dur <= close && guard < 300) {
    guard++;
    const hit = busy.find((b) => overlaps(cur, cur + dur, b.s, b.e));
    if (hit) { cur = hit.e; continue; }
    out.push(cur);
    cur += dur;
  }
  return out;
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("service");
  const [service, setService] = useState(null);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [offers, setOffers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [srv, stf] = await Promise.all([
        supabase.from("services").select("*").order("created_at", { ascending: true }),
        supabase.from("staff").select("*").order("created_at", { ascending: true }),
      ]);
      if (srv.data) setServices(srv.data);
      if (stf.data) setStaff(stf.data);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadDay() {
      if (!barber || !date) { setDayBookings([]); return; }
      setLoadingSlots(true);
      const { data } = await supabase
        .from("bookings")
        .select("start_min,duration_min")
        .eq("barber", barber.name)
        .eq("booking_date", date.key);
      setDayBookings(data || []);
      setLoadingSlots(false);
    }
    loadDay();
  }, [barber, date]);

  const reset = () => {
    setStep("service"); setService(null); setBarber(null); setDate(null);
    setSlot(null); setDayBookings([]); setName(""); setPhone(""); setEmail(""); setOffers(false);
  };

  const dates = barber ? upcomingDates(barber) : [];
  const availableSlots = (barber && service && date) ? tightSlots(barber, service, dayBookings) : [];

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          <div className="h-24 bg-gradient-to-r from-emerald-800 to-stone-900" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow ring-4 ring-white">F</div>
            <h1 className="text-2xl font-bold">Fade &amp; Co</h1>
            <p className="text-sm text-stone-500">Book in seconds — no app, no account.</p>
          </div>
        </div>

        {step === "service" && (
          <>
            <h2 className="mt-6 mb-3 text-lg font-semibold">Choose a service</h2>
            {loading ? <p className="text-stone-500">Loading…</p>
            : services.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No services yet. Add some in Settings.</p>
            : (
              <div className="space-y-2">
                {services.map((s) => (
                  <button key={s.id} onClick={() => { setService(s); setStep("barber"); }}
                    className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left ring-1 ring-stone-200 transition hover:ring-emerald-400">
                    <div><div className="font-medium">{s.name}</div><div className="text-sm text-stone-500">{s.mins} min</div></div>
                    <div className="text-lg font-semibold">${s.price}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "barber" && (
          <>
            <button onClick={() => setStep("service")} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-1 text-lg font-semibold">Pick your barber</h2>
            {staff.length === 0 ? <p className="mt-3 rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No barbers yet. Add some in Settings.</p>
            : (
              <div className="space-y-3">
                {staff.map((b) => (
                  <div key={b.id} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-full ${b.color || "bg-emerald-700"} font-semibold text-white`}>{b.name[0]}</div>
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        {b.specialty && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{b.specialty}</span>}
                      </div>
                    </div>
                    <button onClick={() => { setBarber(b); setDate(null); setSlot(null); setStep("time"); }}
                      className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                      Book with {b.name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === "time" && (
          <>
            <button onClick={() => { setStep("barber"); setDate(null); setSlot(null); }} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-1 text-lg font-semibold">Pick a day &amp; time with {barber.name}</h2>
            <p className="mb-3 text-sm text-stone-500">{service.name} · {service.mins} min</p>
            {dates.length === 0 ? (
              <p className="mt-3 rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">This barber has no working days set. Add them in Settings.</p>
            ) : (
              <>
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => (
                    <button key={d.key} onClick={() => { setDate(d); setSlot(null); }}
                      className={`min-w-[68px] shrink-0 rounded-xl px-2 py-2 text-center ring-1 transition ${date?.key === d.key ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-700 ring-stone-200"}`}>
                      <div className="text-sm font-semibold">{d.label}</div>
                      <div className={`text-xs ${date?.key === d.key ? "text-emerald-100" : "text-stone-400"}`}>{d.sub}</div>
                    </button>
                  ))}
                </div>
                {!date ? <p className="text-sm text-stone-400">Pick a day above to see times.</p>
                : loadingSlots ? <p className="text-sm text-stone-400">Checking availability…</p>
                : availableSlots.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">Fully booked this day — try another.</p>
                : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((m) => (
                      <button key={m} onClick={() => setSlot(m)}
                        className={`rounded-xl py-2.5 text-sm font-medium ring-1 transition ${slot === m ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-emerald-400"}`}>
                        {toLabel(m)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <button disabled={slot === null || !date} onClick={() => setStep("details")}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
              Continue
            </button>
          </>
        )}

        {step === "details" && (
          <>
            <button onClick={() => setStep("time")} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-3 text-lg font-semibold">Your details</h2>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <div className="flex justify-between text-sm"><span className="text-stone-400">Service</span><span className="font-medium">{service.name} · ${service.price}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">Barber</span><span className="font-medium">{barber.name}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">When</span><span className="font-medium">{date.label} {date.sub} at {toLabel(slot)}</span></div>
            </div>
            <div className="mt-3 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={input} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (confirmation & receipts)" className={input} />
            </div>
            <button onClick={() => setOffers(!offers)} className="mt-2 flex w-full items-start gap-2 rounded-xl bg-white p-3 text-left text-sm ring-1 ring-stone-200">
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-white ${offers ? "border-emerald-600 bg-emerald-600" : "border-stone-300"}`}>{offers ? "✓" : ""}</span>
              <span className="text-stone-600">Email me offers &amp; news <span className="text-stone-400">— optional, unsubscribe anytime</span></span>
            </button>
            <button disabled={!name || !phone || saving}
              onClick={async () => {
                setSaving(true);
                const dur = service.mins || 30;
                const { data: fresh } = await supabase.from("bookings").select("start_min,duration_min").eq("barber", barber.name).eq("booking_date", date.key);
                const clash = (fresh || []).some((b) => b.start_min != null && overlaps(slot, slot + dur, b.start_min, b.start_min + (b.duration_min || 30)));
                if (clash) { setSaving(false); alert("Sorry, that time was just taken. Please pick another."); setStep("time"); setSlot(null); return; }
                const { error } = await supabase.from("bookings").insert({
                  service: service.name, price: service.price, barber: barber.name,
                  day: `${date.label} ${date.sub}`, slot: toLabel(slot),
                  booking_date: date.key, start_min: slot, duration_min: dur,
                  customer_name: name, phone: phone, email: email, wants_offers: offers,
                });
                setSaving(false);
                if (error) { alert("Something went wrong: " + error.message); } else { setStep("done"); }
              }}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
              {saving ? "Booking..." : "Confirm booking"}
            </button>
          </>
        )}

        {step === "done" && (
          <div className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-stone-200">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
            <h2 className="text-xl font-bold">You&apos;re booked, {name}!</h2>
            <p className="mt-1 text-stone-600"><span className="font-semibold">{service.name}</span> with <span className="font-semibold">{barber.name}</span></p>
            <p className="mt-1 text-stone-600">{date.label} {date.sub} at {toLabel(slot)}</p>
            <p className="mt-2 text-sm text-stone-400">A confirmation will be sent to {phone}.</p>
            <button onClick={reset} className="mt-4 text-sm font-medium text-emerald-700 underline">Book another</button>
          </div>
        )}
      </div>
    </div>
  );
}