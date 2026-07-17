"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const services = [
  { id: "fade", name: "Skin Fade", price: 30, mins: 30 },
  { id: "beard", name: "Beard Trim", price: 18, mins: 20 },
  { id: "combo", name: "Cut + Beard", price: 45, mins: 45 },
  { id: "kids", name: "Kids Cut", price: 22, mins: 25 },
];

const barbers = [
  { id: "marcus", name: "Marcus", tags: ["Skin fades", "Tapers"], color: "bg-emerald-700",
    work: ["from-stone-800 to-stone-600", "from-emerald-900 to-emerald-700", "from-amber-800 to-stone-700"] },
  { id: "deja", name: "Deja", tags: ["Designs", "Line-ups"], color: "bg-amber-600",
    work: ["from-amber-900 to-amber-700", "from-stone-800 to-amber-800", "from-emerald-800 to-stone-700"] },
  { id: "sam", name: "Sam", tags: ["Classic cuts", "Beards"], color: "bg-stone-700",
    work: ["from-stone-700 to-stone-500", "from-emerald-900 to-stone-800", "from-amber-800 to-amber-900"] },
];

const days = [
  { id: "today", label: "Today", sub: "Thu 17" },
  { id: "fri", label: "Fri", sub: "Jul 18" },
  { id: "sat", label: "Sat", sub: "Jul 19" },
];

const allSlots = ["9:00", "10:00", "11:30", "1:00", "2:30", "4:00", "4:30", "5:30"];

const taken = {
  marcus: { today: ["10:00", "1:00"], fri: ["9:00"], sat: ["2:30", "4:30"] },
  deja: { today: ["9:00", "2:30"], fri: ["1:00", "4:00"], sat: ["10:00"] },
  sam: { today: ["11:30"], fri: ["10:00", "2:30"], sat: ["9:00", "1:00"] },
};

export default function Home() {
  const [step, setStep] = useState("service"); // service, barber, time, details, done
  const [service, setService] = useState(null);
  const [barber, setBarber] = useState(null);
  const [day, setDay] = useState("today");
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [offers, setOffers] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("service"); setService(null); setBarber(null); setDay("today");
    setSlot(null); setName(""); setPhone(""); setEmail(""); setOffers(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* shop header */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          <div className="h-24 bg-gradient-to-r from-emerald-800 to-stone-900" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow ring-4 ring-white">F</div>
            <h1 className="text-2xl font-bold">Fade &amp; Co</h1>
            <p className="text-sm text-stone-500">Book in seconds — no app, no account.</p>
          </div>
        </div>

        {/* STEP 1: service */}
        {step === "service" && (
          <>
            <h2 className="mt-6 mb-3 text-lg font-semibold">Choose a service</h2>
            <div className="space-y-2">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setService(s); setStep("barber"); }}
                  className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left ring-1 ring-stone-200 transition hover:ring-emerald-400">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-stone-500">{s.mins} min</div>
                  </div>
                  <div className="text-lg font-semibold">${s.price}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: barber */}
        {step === "barber" && (
          <>
            <button onClick={() => setStep("service")} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-1 text-lg font-semibold">Pick your barber</h2>
            <p className="mb-3 text-sm text-stone-500">Choose by their work, not just a name.</p>
            <div className="space-y-3">
              {barbers.map((b) => (
                <div key={b.id} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-full ${b.color} font-semibold text-white`}>{b.name[0]}</div>
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {b.tags.map((t) => <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {b.work.map((g, i) => <div key={i} className={`aspect-square rounded-lg bg-gradient-to-br ${g}`} />)}
                  </div>
                  <button onClick={() => { setBarber(b); setStep("time"); }}
                    className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Book with {b.name}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 3: time */}
        {step === "time" && (
          <>
            <button onClick={() => { setStep("barber"); setSlot(null); }} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-1 text-lg font-semibold">Pick a time with {barber.name}</h2>
            <p className="mb-3 text-sm text-stone-500">Greyed-out times are already booked.</p>
            <div className="mb-3 flex gap-2">
              {days.map((d) => (
                <button key={d.id} onClick={() => { setDay(d.id); setSlot(null); }}
                  className={`flex-1 rounded-xl px-2 py-2 text-center ring-1 transition ${day === d.id ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-700 ring-stone-200"}`}>
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className={`text-xs ${day === d.id ? "text-emerald-100" : "text-stone-400"}`}>{d.sub}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allSlots.map((t) => {
                const isTaken = taken[barber.id][day].includes(t);
                return (
                  <button key={t} disabled={isTaken} onClick={() => setSlot(t)}
                    className={`rounded-xl py-2.5 text-sm font-medium ring-1 transition ${
                      isTaken ? "cursor-not-allowed bg-stone-100 text-stone-300 ring-stone-100 line-through"
                      : slot === t ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-stone-800 ring-stone-200 hover:ring-emerald-400"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
            <button disabled={!slot} onClick={() => setStep("details")}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
              Continue
            </button>
          </>
        )}

        {/* STEP 4: details */}
        {step === "details" && (
          <>
            <button onClick={() => setStep("time")} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-3 text-lg font-semibold">Your details</h2>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <div className="flex justify-between text-sm"><span className="text-stone-400">Service</span><span className="font-medium">{service.name} · ${service.price}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">Barber</span><span className="font-medium">{barber.name}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">When</span><span className="font-medium">{days.find((d) => d.id === day).label} at {slot}</span></div>
            </div>

            <div className="mt-3 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-stone-200 focus:ring-emerald-400" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-stone-200 focus:ring-emerald-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (confirmation & receipts)"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-stone-200 focus:ring-emerald-400" />
            </div>

            <button onClick={() => setOffers(!offers)} className="mt-2 flex w-full items-start gap-2 rounded-xl bg-white p-3 text-left text-sm ring-1 ring-stone-200">
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-white ${offers ? "border-emerald-600 bg-emerald-600" : "border-stone-300"}`}>{offers ? "✓" : ""}</span>
              <span className="text-stone-600">Email me offers &amp; news from Fade &amp; Co <span className="text-stone-400">— optional, unsubscribe anytime</span></span>
            </button>

            <button disabled={!name || !phone || saving}
              onClick={async () => {
                setSaving(true);
                const { error } = await supabase.from("bookings").insert({
                  service: service.name,
                  price: service.price,
                  barber: barber.name,
                  day: days.find((d) => d.id === day).label,
                  slot: slot,
                  customer_name: name,
                  phone: phone,
                  email: email,
                  wants_offers: offers,
                });
                setSaving(false);
                if (error) {
                  alert("Something went wrong saving your booking: " + error.message);
                } else {
                  setStep("done");
                }
              }}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
              {saving ? "Booking..." : "Confirm booking"}
            </button>
          </>
        )}

        {/* STEP 5: done */}
        {step === "done" && (
          <div className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-stone-200">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
            <h2 className="text-xl font-bold">You&apos;re booked, {name}!</h2>
            <p className="mt-1 text-stone-600"><span className="font-semibold">{service.name}</span> with <span className="font-semibold">{barber.name}</span></p>
            <p className="mt-1 text-stone-600">{days.find((d) => d.id === day).label} at {slot}</p>
            <p className="mt-2 text-sm text-stone-400">A confirmation will be sent to {phone}.</p>
            <button onClick={reset} className="mt-4 text-sm font-medium text-emerald-700 underline">Book another</button>
          </div>
        )}
      </div>
    </div>
  );
}