"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toLabel = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

function upcomingDates(barber) {
  const workDays = barber.work_days || []; const out = []; const today = new Date();
  for (let i = 0; i < 21 && out.length < 14; i++) { const d = new Date(today); d.setDate(today.getDate() + i); const dn = DAY_NAMES[d.getDay()]; if (workDays.includes(dn)) out.push({ key: d.toISOString().slice(0, 10), label: i === 0 ? "Today" : dn, sub: `${MONTHS[d.getMonth()]} ${d.getDate()}` }); }
  return out;
}
function breakBlocks(barber) { return (barber.breaks || []).map((b) => { const [s, e] = b.split("-"); return { s: toMin(s), e: toMin(e) }; }); }
function tightSlots(barber, service, bookings) {
  const dur = service?.mins || 30; const open = toMin(barber.start_time || "09:00"), close = toMin(barber.end_time || "17:00");
  const busy = [...(bookings || []).filter((b) => b.start_min != null).map((b) => ({ s: b.start_min, e: b.start_min + (b.duration_min || 30) })), ...breakBlocks(barber)].sort((a, b) => a.s - b.s);
  const out = []; let cur = open, g = 0;
  while (cur + dur <= close && g < 300) { g++; const hit = busy.find((b) => overlaps(cur, cur + dur, b.s, b.e)); if (hit) { cur = hit.e; continue; } out.push(cur); cur += dur; }
  return out;
}

function DepositForm({ amount, onPaid, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true); setErr("");
    const { error: submitErr } = await elements.submit();
    if (submitErr) { setErr(submitErr.message); setPaying(false); return; }
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) { setErr(error.message); setPaying(false); return; }
    if (paymentIntent && paymentIntent.status === "succeeded") { onPaid(paymentIntent.id); }
    else { setErr("Payment didn't complete. Try again."); setPaying(false); }
  }

  return (
    <div>
      <PaymentElement onReady={() => setReady(true)} />
      {!ready && <p className="mt-2 text-sm text-stone-400">Loading payment form…</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button onClick={pay} disabled={!stripe || !ready || paying} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
        {paying ? "Processing…" : `Pay $${amount} deposit`}
      </button>
      <button onClick={onCancel} className="mt-2 w-full text-sm text-stone-500">Cancel</button>
    </div>
  );
}

export default function ShopBooking() {
  const slug = useParams().slug;
  const [shop, setShop] = useState(null); const [notFound, setNotFound] = useState(false);
  const [services, setServices] = useState([]); const [staff, setStaff] = useState([]); const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null); const [showAuth, setShowAuth] = useState(false); const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState(""); const [authPass, setAuthPass] = useState(""); const [authName, setAuthName] = useState(""); const [authPhone, setAuthPhone] = useState("");
  const [authErr, setAuthErr] = useState(""); const [authBusy, setAuthBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false); const [history, setHistory] = useState([]);
  const [step, setStep] = useState("service");
  const [service, setService] = useState(null); const [barber, setBarber] = useState(null);
  const [date, setDate] = useState(null); const [slot, setSlot] = useState(null);
  const [dayBookings, setDayBookings] = useState([]); const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [offers, setOffers] = useState(false); const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripeForAccount, setStripeForAccount] = useState(null);
  const [preparingPayment, setPreparingPayment] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: shopData } = await supabase.from("shops").select("*").eq("slug", slug).limit(1).single();
      if (!shopData) { setNotFound(true); setLoading(false); return; }
      setShop(shopData);
      const [srv, stf] = await Promise.all([
        supabase.from("services").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: true }),
        supabase.from("staff").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: true }),
      ]);
      if (srv.data) setServices(srv.data); if (stf.data) setStaff(stf.data);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { const { data: prof } = await supabase.from("customer_profiles").select("*").eq("user_id", session.user.id).eq("shop_id", shopData.id).limit(1).single(); if (prof) { setCustomer({ user: session.user, profile: prof }); setName(prof.name || ""); setPhone(prof.phone || ""); setEmail(prof.email || ""); } }
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    async function loadDay() {
      if (!barber || !date || !shop) { setDayBookings([]); return; }
      setLoadingSlots(true);
      const { data } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key });
      setDayBookings(data || []); setLoadingSlots(false);
    }
    loadDay();
  }, [barber, date, shop]);

  async function handleAuth() {
    setAuthErr(""); setAuthBusy(true);
    try {
      if (authMode === "signup") { const { data: su, error: e1 } = await supabase.auth.signUp({ email: authEmail, password: authPass }); if (e1) throw e1; let uid = su.user?.id; if (!su.session) { const { data: si, error: e2 } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass }); if (e2) throw e2; uid = si.user?.id; } await supabase.from("customer_profiles").insert({ user_id: uid, shop_id: shop.id, name: authName, phone: authPhone, email: authEmail }); }
      else { const { error: e3 } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass }); if (e3) throw e3; }
      const { data: { session } } = await supabase.auth.getSession();
      let { data: prof } = await supabase.from("customer_profiles").select("*").eq("user_id", session.user.id).eq("shop_id", shop.id).limit(1).single();
      if (!prof) { await supabase.from("customer_profiles").insert({ user_id: session.user.id, shop_id: shop.id, email: session.user.email }); const r = await supabase.from("customer_profiles").select("*").eq("user_id", session.user.id).eq("shop_id", shop.id).limit(1).single(); prof = r.data; }
      setCustomer({ user: session.user, profile: prof });
      if (prof) { setName(prof.name || ""); setPhone(prof.phone || ""); setEmail(prof.email || session.user.email); }
      setShowAuth(false); setAuthEmail(""); setAuthPass(""); setAuthName(""); setAuthPhone("");
    } catch (err) { setAuthErr(err.message || "Something went wrong."); }
    setAuthBusy(false);
  }
  async function logoutCustomer() { await supabase.auth.signOut(); setCustomer(null); setShowHistory(false); setName(""); setPhone(""); setEmail(""); }
  async function openHistory() { if (!customer) return; const { data } = await supabase.from("bookings").select("*").eq("customer_user_id", customer.user.id).order("created_at", { ascending: false }); setHistory(data || []); setShowHistory(true); }
  async function cancelBooking(id) {
    if (!confirm("Cancel this booking? This can't be undone.")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id).eq("customer_user_id", customer.user.id);
    if (error) { alert("Couldn't cancel: " + error.message); return; }
    setHistory((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
  }

  const reset = () => { setStep("service"); setService(null); setBarber(null); setDate(null); setSlot(null); setDayBookings([]); if (!customer) { setName(""); setPhone(""); setEmail(""); } setOffers(false); setClientSecret(null); setStripeForAccount(null); };
  const dates = barber ? upcomingDates(barber) : [];
  const availableSlots = (barber && service && date) ? tightSlots(barber, service, dayBookings) : [];
  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";

  async function saveBooking(depositPaid, paymentIntentId) {
    setSaving(true);
    const dur = service.mins || 30;
    const { data: fresh } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: barber.name, p_date: date.key });
    const clash = (fresh || []).some((b) => b.start_min != null && overlaps(slot, slot + dur, b.start_min, b.start_min + (b.duration_min || 30)));
    if (clash) { setSaving(false); alert("Sorry, that time was just taken."); setStep("time"); setSlot(null); setClientSecret(null); return false; }
    const { error } = await supabase.from("bookings").insert({
      shop_id: shop.id, service: service.name, price: service.price, barber: barber.name,
      day: `${date.label} ${date.sub}`, slot: toLabel(slot),
      booking_date: date.key, start_min: slot, duration_min: dur,
      customer_name: name, phone: phone, email: email, wants_offers: offers,
      customer_user_id: customer ? customer.user.id : null,
      deposit_paid: depositPaid ? true : false,
      deposit_amount: depositPaid ? (shop.deposit_amount || 0) : 0,
      stripe_payment_intent: paymentIntentId || null,
      status: "confirmed",
    });
    setSaving(false);
    if (error) { alert("Something went wrong: " + error.message); return false; }
    return true;
  }

  async function handleConfirm() {
    if (shop.deposits_enabled && shop.stripe_account_id) {
      setPreparingPayment(true);
      try {
        const res = await fetch("/api/create-payment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId: shop.id }),
        });
        const data = await res.json();
        if (data.clientSecret) {
          const sp = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, { stripeAccount: data.accountId });
          setStripeForAccount(sp);
          setClientSecret(data.clientSecret);
          setStep("pay");
        }
        else { alert("Couldn't start payment: " + (data.error || "unknown")); }
      } catch (err) { alert("Error: " + err.message); }
      setPreparingPayment(false);
    } else {
      const ok = await saveBooking(false, null);
      if (ok) setStep("done");
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;
  if (notFound) return <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-center"><div><h1 className="text-2xl font-bold text-stone-800">Shop not found</h1><p className="mt-1 text-stone-500">No shop at kursey.com/{slug}.</p></div></div>;

  if (shop) {
    const status = shop.subscription_status || "trialing";
    const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
    const trialValid = status === "trialing" && trialEnds && trialEnds > new Date();
    const inGoodStanding = status === "active" || trialValid;
    if (!inGoodStanding) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-stone-200 text-2xl">⏸️</div>
            <h1 className="text-2xl font-bold text-stone-800">Booking temporarily unavailable</h1>
            <p className="mt-2 text-stone-500">{shop.name} isn't taking online bookings right now. Please contact them directly{shop.phone ? ` at ${shop.phone}` : ""}.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {lightbox && (<div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-xl" /></div>)}
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-3 flex items-center justify-end gap-3 text-sm">
          {customer ? (<><button onClick={openHistory} className="font-medium text-emerald-700 hover:underline">My bookings</button><button onClick={logoutCustomer} className="text-stone-500 hover:underline">Log out</button></>)
          : (<button onClick={() => { setShowAuth(true); setAuthMode("login"); }} className="font-medium text-emerald-700 hover:underline">Log in / Sign up</button>)}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          <div className="h-24 bg-gradient-to-r from-emerald-800 to-stone-900" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-2 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow ring-4 ring-white">{shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" /> : shop.name[0]}</div>
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            {shop.description && <p className="mt-1 text-sm leading-relaxed text-stone-600">{shop.description}</p>}
            <div className="mt-2 flex flex-col gap-1 text-sm text-stone-500">{shop.address && <div className="flex items-center gap-1.5"><span>📍</span>{shop.address}</div>}{shop.phone && <div className="flex items-center gap-1.5"><span>📞</span>{shop.phone}</div>}</div>
            {!customer && <p className="mt-2 text-xs text-stone-400">Book in seconds — no app, no account needed.</p>}
            {customer && <p className="mt-2 text-xs text-emerald-600">Welcome back, {customer.profile?.name || "friend"}!</p>}
          </div>
        </div>

        {showAuth && !customer && (<div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-emerald-300"><div className="mb-3 flex gap-2"><button onClick={() => setAuthMode("login")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${authMode === "login" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>Log in</button><button onClick={() => setAuthMode("signup")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${authMode === "signup" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>Sign up</button></div><div className="space-y-2">{authMode === "signup" && <><input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" className={input} /><input value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="Mobile number" className={input} /></>}<input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" type="email" className={input} /><input value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder="Password (min 6)" type="password" className={input} /></div>{authErr && <p className="mt-2 text-sm text-red-600">{authErr}</p>}<div className="mt-3 flex gap-2"><button disabled={authBusy || !authEmail || !authPass} onClick={handleAuth} className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-40">{authBusy ? "…" : authMode === "signup" ? "Create account" : "Log in"}</button><button onClick={() => setShowAuth(false)} className="rounded-xl bg-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700">Cancel</button></div></div>)}

        {showHistory && customer && (
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Your bookings</h2><button onClick={() => setShowHistory(false)} className="text-sm text-stone-500">Close</button></div>
            {history.length === 0 ? <p className="mt-2 text-sm text-stone-500">No bookings yet.</p> : <div className="mt-2 space-y-2">{history.map((b) => {
              const isCancelled = b.status === "cancelled";
              const isUpcoming = b.booking_date && b.booking_date >= new Date().toISOString().slice(0, 10);
              return (
                <div key={b.id} className={`rounded-xl p-3 text-sm ring-1 ${isCancelled ? "bg-stone-100 ring-stone-200 opacity-60" : "bg-stone-50 ring-stone-200"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{b.service} with {b.barber}</div>
                      <div className="text-stone-500">{b.day} at {b.slot} · ${b.price}</div>
                      {isCancelled && <div className="mt-1 text-xs font-medium text-red-600">Cancelled</div>}
                    </div>
                    {!isCancelled && isUpcoming && (
                      <button onClick={() => cancelBooking(b.id)} className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100">Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}</div>}
          </div>
        )}

        {step === "service" && (<><h2 className="mt-6 mb-3 text-lg font-semibold">Choose a service</h2>{services.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">This shop hasn't added services yet.</p> : <div className="space-y-2">{services.map((s) => (<button key={s.id} onClick={() => { setService(s); setStep("barber"); }} className="flex w-full items-start justify-between rounded-xl bg-white p-4 text-left ring-1 ring-stone-200 transition hover:ring-emerald-400"><div className="pr-3"><div className="font-medium">{s.name}</div><div className="text-sm text-stone-500">{s.mins} min</div>{s.description && <div className="mt-1 text-sm text-stone-400">{s.description}</div>}</div><div className="shrink-0 text-lg font-semibold">${s.price}</div></button>))}</div>}</>)}

        {step === "barber" && (<><button onClick={() => setStep("service")} className="mt-6 text-sm font-medium text-stone-500">← Back</button><h2 className="mt-2 mb-1 text-lg font-semibold">Pick your barber</h2>{staff.length === 0 ? <p className="mt-3 rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">This shop hasn't added barbers yet.</p> : <div className="space-y-3">{staff.map((b) => (<div key={b.id} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="flex items-start gap-3"><div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl ${b.color || "bg-emerald-700"} text-xl font-semibold text-white`}>{b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" /> : b.name[0]}</div><div className="flex-1"><div className="font-semibold">{b.name}</div>{b.specialty && <span className="mt-0.5 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{b.specialty}</span>}{b.bio && <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{b.bio}</p>}</div></div>{(b.work_photos || []).length > 0 && (<div className="mt-3"><div className="mb-1 text-xs font-medium text-stone-400">Their work</div><div className="flex gap-2 overflow-x-auto pb-1">{b.work_photos.map((url, i) => (<img key={i} src={url} alt="work" onClick={() => setLightbox(url)} className="h-20 w-20 shrink-0 cursor-pointer rounded-lg object-cover ring-1 ring-stone-200" />))}</div></div>)}<button onClick={() => { setBarber(b); setDate(null); setSlot(null); setStep("time"); }} className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Book with {b.name}</button></div>))}</div>}</>)}

        {step === "time" && (<><button onClick={() => { setStep("barber"); setDate(null); setSlot(null); }} className="mt-6 text-sm font-medium text-stone-500">← Back</button><h2 className="mt-2 mb-1 text-lg font-semibold">Pick a day &amp; time with {barber.name}</h2><p className="mb-3 text-sm text-stone-500">{service.name} · {service.mins} min</p>{dates.length === 0 ? <p className="mt-3 rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No working days set for this barber.</p> : <><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{dates.map((d) => (<button key={d.key} onClick={() => { setDate(d); setSlot(null); }} className={`min-w-[68px] shrink-0 rounded-xl px-2 py-2 text-center ring-1 transition ${date?.key === d.key ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-700 ring-stone-200"}`}><div className="text-sm font-semibold">{d.label}</div><div className={`text-xs ${date?.key === d.key ? "text-emerald-100" : "text-stone-400"}`}>{d.sub}</div></button>))}</div>{!date ? <p className="text-sm text-stone-400">Pick a day above.</p> : loadingSlots ? <p className="text-sm text-stone-400">Checking…</p> : availableSlots.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">Fully booked — try another day.</p> : <div className="grid grid-cols-3 gap-2">{availableSlots.map((m) => (<button key={m} onClick={() => setSlot(m)} className={`rounded-xl py-2.5 text-sm font-medium ring-1 transition ${slot === m ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-emerald-400"}`}>{toLabel(m)}</button>))}</div>}</>}<button disabled={slot === null || !date} onClick={() => setStep("details")} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">Continue</button></>)}

        {step === "details" && (<><button onClick={() => setStep("time")} className="mt-6 text-sm font-medium text-stone-500">← Back</button><h2 className="mt-2 mb-3 text-lg font-semibold">Your details</h2><div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="flex justify-between text-sm"><span className="text-stone-400">Service</span><span className="font-medium">{service.name} · ${service.price}</span></div><div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">Barber</span><span className="font-medium">{barber.name}</span></div><div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">When</span><span className="font-medium">{date.label} {date.sub} at {toLabel(slot)}</span></div>{shop.deposits_enabled && shop.stripe_account_id && <div className="mt-1 flex justify-between text-sm"><span className="text-stone-400">Deposit</span><span className="font-medium text-emerald-700">${shop.deposit_amount} to confirm</span></div>}</div><div className="mt-3 space-y-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={input} /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (confirmation & receipts)" className={input} /></div><button onClick={() => setOffers(!offers)} className="mt-2 flex w-full items-start gap-2 rounded-xl bg-white p-3 text-left text-sm ring-1 ring-stone-200"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-white ${offers ? "border-emerald-600 bg-emerald-600" : "border-stone-300"}`}>{offers ? "✓" : ""}</span><span className="text-stone-600">Email me offers &amp; news <span className="text-stone-400">— optional</span></span></button><button disabled={!name || !phone || saving || preparingPayment} onClick={handleConfirm} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{preparingPayment ? "Preparing…" : saving ? "Booking…" : shop.deposits_enabled && shop.stripe_account_id ? `Continue to deposit ($${shop.deposit_amount})` : "Confirm booking"}</button></>)}

        {step === "pay" && clientSecret && stripeForAccount && (
          <>
            <button onClick={() => { setStep("details"); setClientSecret(null); setStripeForAccount(null); }} className="mt-6 text-sm font-medium text-stone-500">← Back</button>
            <h2 className="mt-2 mb-3 text-lg font-semibold">Pay your deposit</h2>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <p className="mb-3 text-sm text-stone-500">A ${shop.deposit_amount} deposit confirms your booking with {barber.name}.</p>
              <Elements stripe={stripeForAccount} options={{ clientSecret }}>
                <DepositForm
                  amount={shop.deposit_amount}
                  onPaid={async (paymentIntentId) => { const ok = await saveBooking(true, paymentIntentId); if (ok) setStep("done"); }}
                  onCancel={() => { setStep("details"); setClientSecret(null); setStripeForAccount(null); }}
                />
              </Elements>
            </div>
          </>
        )}

        {step === "done" && (<div className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-stone-200"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h2 className="text-xl font-bold">You&apos;re booked, {name}!</h2><p className="mt-1 text-stone-600"><span className="font-semibold">{service.name}</span> with <span className="font-semibold">{barber.name}</span></p><p className="mt-1 text-stone-600">{date.label} {date.sub} at {toLabel(slot)}</p>{shop.deposits_enabled && shop.stripe_account_id && <p className="mt-1 text-sm text-emerald-700">Deposit of ${shop.deposit_amount} paid ✓</p>}<button onClick={reset} className="mt-4 block w-full text-sm font-medium text-emerald-700 underline">Book another</button></div>)}
      </div>
    </div>
  );
}