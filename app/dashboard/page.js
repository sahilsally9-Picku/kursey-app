"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toLabel = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = [];
for (let h = 0; h < 24; h++) for (let m of [0, 30]) TIMES.push(h * 60 + m);

export default function Dashboard() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [rebookWeeks, setRebookWeeks] = useState(4);
  const [savingRebook, setSavingRebook] = useState(false);
  const [rebookSaved, setRebookSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [aService, setAService] = useState(""); const [aBarber, setABarber] = useState("");
  const [aDate, setADate] = useState(""); const [aTime, setATime] = useState("540");
  const [aName, setAName] = useState(""); const [aPhone, setAPhone] = useState("");
  const [addingBooking, setAddingBooking] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [blockMode, setBlockMode] = useState("range");
  const [bBarber, setBBarber] = useState(""); const [bDate, setBDate] = useState("");
  const [bStart, setBStart] = useState("720"); const [bEnd, setBEnd] = useState("780");
  const [blocking, setBlocking] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData); setChecking(false);
      setRebookWeeks(shopData.rebooking_weeks || 4);

      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") === "success" && shopData.subscription_status !== "active") {
        try {
          const res = await fetch("/api/confirm-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopId: shopData.id }) });
          const conf = await res.json();
          if (conf.active) { shopData.subscription_status = "active"; setShop({ ...shopData }); }
        } catch (e) {}
      }

      await refreshBookings(shopData.id);
      const [stf, srv] = await Promise.all([
        supabase.from("staff").select("*").eq("shop_id", shopData.id),
        supabase.from("services").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: true }),
      ]);
      setStaff(stf.data || []);
      setServices(srv.data || []);
      setLoading(false);
    }
    init();
  }, [router]);

  async function refreshBookings(shopId) {
    const { data } = await supabase.from("bookings").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    setBookings(data || []);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  function copyLink() {
    navigator.clipboard.writeText(`https://kursey.com/${shop.slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  async function subscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/create-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopId: shop.id, origin: window.location.origin }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Couldn't start checkout: " + (data.error || "unknown")); setSubscribing(false); }
    } catch (err) { alert("Error: " + err.message); setSubscribing(false); }
  }

  async function sendCampaign() {
    if (!subject || !message) { alert("Add a subject and message."); return; }
    setSending(true); setSendResult("");
    try {
      const res = await fetch("/api/send-campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopId: shop.id, subject, message, origin: window.location.origin }) });
      const data = await res.json();
      if (data.ok) { setSendResult(`Sent to ${data.sent} customer${data.sent === 1 ? "" : "s"}.`); setSubject(""); setMessage(""); }
      else { setSendResult("Error: " + (data.error || "unknown")); }
    } catch (err) { setSendResult("Error: " + err.message); }
    setSending(false);
  }

  async function toggleRebooking() {
    const newVal = !shop.rebooking_enabled;
    await supabase.from("shops").update({ rebooking_enabled: newVal }).eq("id", shop.id);
    setShop({ ...shop, rebooking_enabled: newVal });
  }
  async function saveRebookWeeks() {
    setSavingRebook(true); setRebookSaved(false);
    const w = parseInt(rebookWeeks) || 4;
    await supabase.from("shops").update({ rebooking_weeks: w }).eq("id", shop.id);
    setShop({ ...shop, rebooking_weeks: w });
    setSavingRebook(false); setRebookSaved(true); setTimeout(() => setRebookSaved(false), 2000);
  }

  async function refundDeposit(id) {
    setRefunding(id);
    try {
      const res = await fetch("/api/refund-deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: id }) });
      const data = await res.json();
      if (data.ok) { setBookings((prev) => prev.map((b) => b.id === id ? { ...b, deposit_refunded: true } : b)); }
      else { alert("Refund failed: " + (data.error || "unknown")); }
    } catch (err) { alert("Error: " + err.message); }
    setRefunding(null);
  }

  async function ownerCancel(b) {
    if (!confirm("Cancel this booking?")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
    if (error) { alert("Couldn't cancel: " + error.message); return; }
    setBookings((prev) => prev.map((x) => x.id === b.id ? { ...x, status: "cancelled" } : x));
    if (b.deposit_paid && !b.deposit_refunded && b.stripe_payment_intent) {
      if (confirm(`Refund the $${b.deposit_amount} deposit to the customer?`)) { refundDeposit(b.id); }
    }
  }

  async function removeBlock(id) {
    if (!confirm("Remove this time block?")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) { alert("Couldn't remove: " + error.message); return; }
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
  }

  async function addBooking() {
    if (!aService || !aBarber || !aDate || !aName) { alert("Fill in service, barber, date, and name."); return; }
    setAddingBooking(true);
    const svc = services.find((s) => s.name === aService);
    const dur = svc ? (svc.mins || 30) : 30;
    const price = svc ? svc.price : 0;
    const startMin = parseInt(aTime);
    const d = new Date(aDate + "T00:00:00");
    const dayLabel = `${DOW[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const { data: fresh } = await supabase.rpc("busy_times", { p_shop_id: shop.id, p_barber: aBarber, p_date: aDate });
    const clash = (fresh || []).some((b) => b.start_min != null && startMin < b.start_min + (b.duration_min || 30) && b.start_min < startMin + dur);
    if (clash) { setAddingBooking(false); alert("That barber is already booked at that time."); return; }
    const { error } = await supabase.from("bookings").insert({ shop_id: shop.id, service: aService, price, barber: aBarber, day: dayLabel, slot: toLabel(startMin), booking_date: aDate, start_min: startMin, duration_min: dur, customer_name: aName, phone: aPhone, email: "", wants_offers: false, status: "confirmed" });
    setAddingBooking(false);
    if (error) { alert("Couldn't add: " + error.message); return; }
    setShowAdd(false); setAService(""); setABarber(""); setADate(""); setATime("540"); setAName(""); setAPhone("");
    refreshBookings(shop.id);
  }

  async function addBlock() {
    if (!bBarber || !bDate) { alert("Pick a barber and date."); return; }
    setBlocking(true);
    const d = new Date(bDate + "T00:00:00");
    const dayLabel = `${DOW[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
    let startMin, dur;
    if (blockMode === "day") { startMin = 0; dur = 24 * 60; }
    else { startMin = parseInt(bStart); const endMin = parseInt(bEnd); if (endMin <= startMin) { setBlocking(false); alert("End time must be after start."); return; } dur = endMin - startMin; }
    const { error } = await supabase.from("bookings").insert({ shop_id: shop.id, service: blockMode === "day" ? "Day off" : "Blocked", price: 0, barber: bBarber, day: dayLabel, slot: blockMode === "day" ? "All day" : toLabel(startMin), booking_date: bDate, start_min: startMin, duration_min: dur, customer_name: "— Blocked —", phone: "", email: "", wants_offers: false, status: "confirmed", is_block: true });
    setBlocking(false);
    if (error) { alert("Couldn't block: " + error.message); return; }
    setShowBlock(false); setBBarber(""); setBDate(""); setBStart("720"); setBEnd("780");
    refreshBookings(shop.id);
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;

  const realBookings = bookings.filter((b) => !b.is_block);
  const activeBookings = realBookings.filter((b) => b.status !== "cancelled");
  const totalBookings = activeBookings.length;
  const revenue = activeBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const depositsCollected = realBookings.reduce((sum, b) => sum + (b.deposit_paid && !b.deposit_refunded ? (b.deposit_amount || 0) : 0), 0);
  const depositsCount = realBookings.filter((b) => b.deposit_paid && !b.deposit_refunded).length;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = activeBookings.filter((b) => b.booking_date && b.booking_date >= today).length;
  const starts = staff.map((s) => toMin(s.start_time)).filter((v) => v != null);
  const ends = staff.map((s) => toMin(s.end_time)).filter((v) => v != null);
  const openMin = starts.length ? Math.min(...starts) : 9 * 60;
  const closeMin = ends.length ? Math.max(...ends) : 17 * 60;
  const afterHours = activeBookings.filter((b) => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins < openMin || mins > closeMin;
  }).length;
  const phoneCounts = {};
  activeBookings.forEach((b) => { if (b.phone) phoneCounts[b.phone] = (phoneCounts[b.phone] || 0) + 1; });
  const repeatCustomers = Object.values(phoneCounts).filter((c) => c > 1).length;
  const offersList = realBookings.filter((b) => b.wants_offers).length;

  const status = shop.subscription_status || "trialing";
  const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = status === "active";
  const inputCls = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";
  const selCls = "w-full rounded-xl bg-white px-3 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start justify-between">
          <div><h1 className="text-2xl font-bold">{shop.name}</h1><p className="text-sm text-stone-500">kursey.com/{shop.slug}</p></div>
          <div className="flex items-center gap-2"><a href="/settings" className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">Settings</a><button onClick={handleLogout} className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">Log out</button></div>
        </div>

        {isActive ? (<div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200"><div><div className="font-semibold text-emerald-800">Subscription active ✓</div><div className="text-sm text-emerald-700">Thanks for being a Kursey member.</div></div></div>)
        : status === "past_due" ? (<div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200"><div className="font-semibold text-red-800">Payment needed</div><div className="text-sm text-red-700">Your booking page is paused until you subscribe.</div><button onClick={subscribe} disabled={subscribing} className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{subscribing ? "Opening…" : "Subscribe now"}</button></div>)
        : (<div className="mt-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200"><div className="font-semibold text-indigo-900">Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left</div><div className="text-sm text-indigo-700">Subscribe any time to keep your booking page live after the trial.</div><button onClick={subscribe} disabled={subscribing} className="mt-3 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{subscribing ? "Opening…" : "Subscribe — $34.99/mo"}</button></div>)}

        {/* BOOKING LINK + COPY */}
        <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-white">
          <div className="text-sm text-emerald-100">Your booking link — share this with clients</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="text-lg font-semibold">kursey.com/{shop.slug}</div>
            <button onClick={copyLink} className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/30">{copied ? "Copied ✓" : "Copy link"}</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-3xl font-bold">{totalBookings}</div><div className="text-sm text-stone-500">Total bookings</div></div>
          <div className="rounded-2xl bg-stone-900 p-4 text-white"><div className="text-3xl font-bold text-emerald-400">${revenue}</div><div className="text-sm text-stone-300">Booked revenue</div></div>
        </div>

        {/* ADD BOOKING */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><div><div className="font-semibold">Add a booking</div><div className="text-sm text-stone-500">For walk-ins or phone bookings.</div></div><button onClick={() => setShowAdd(!showAdd)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">{showAdd ? "Close" : "Add"}</button></div>
          {showAdd && (<div className="mt-3 space-y-2"><select value={aService} onChange={(e) => setAService(e.target.value)} className={selCls}><option value="">Select service…</option>{services.map((s) => <option key={s.id} value={s.name}>{s.name} · {s.mins}min · ${s.price}</option>)}</select><select value={aBarber} onChange={(e) => setABarber(e.target.value)} className={selCls}><option value="">Select barber…</option>{staff.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select><div className="flex gap-2"><input value={aDate} onChange={(e) => setADate(e.target.value)} type="date" className={inputCls} /><select value={aTime} onChange={(e) => setATime(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select></div><input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Customer name" className={inputCls} /><input value={aPhone} onChange={(e) => setAPhone(e.target.value)} placeholder="Phone (optional)" className={inputCls} /><button onClick={addBooking} disabled={addingBooking} className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-40">{addingBooking ? "Adding…" : "Add booking"}</button></div>)}
        </div>

        {/* BLOCK OFF TIME */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><div><div className="font-semibold">Block off time</div><div className="text-sm text-stone-500">For lunch, vacation, or time off.</div></div><button onClick={() => setShowBlock(!showBlock)} className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-900">{showBlock ? "Close" : "Block"}</button></div>
          {showBlock && (<div className="mt-3 space-y-2"><div className="flex gap-2"><button onClick={() => setBlockMode("range")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "range" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}>Time range</button><button onClick={() => setBlockMode("day")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "day" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}>Whole day</button></div><select value={bBarber} onChange={(e) => setBBarber(e.target.value)} className={selCls}><option value="">Select barber…</option>{staff.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select><input value={bDate} onChange={(e) => setBDate(e.target.value)} type="date" className={inputCls} />{blockMode === "range" && (<div className="flex items-center gap-2"><select value={bStart} onChange={(e) => setBStart(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select><span className="text-stone-400">–</span><select value={bEnd} onChange={(e) => setBEnd(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select></div>)}<button onClick={addBlock} disabled={blocking} className="w-full rounded-xl bg-stone-800 py-3 font-semibold text-white disabled:opacity-40">{blocking ? "Blocking…" : blockMode === "day" ? "Block whole day" : "Block this time"}</button></div>)}
        </div>

        {/* MARKETING */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><div><div className="font-semibold">Send an offer</div><div className="text-sm text-stone-500">Email your {offersList} opted-in customer{offersList === 1 ? "" : "s"}.</div></div><button onClick={() => setShowCampaign(!showCampaign)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">{showCampaign ? "Close" : "Compose"}</button></div>
          {showCampaign && (<div className="mt-3 space-y-2"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g. 20% off this week!)" className={inputCls} /><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message…" rows={5} className={`${inputCls} resize-none`} /><div className="flex items-center gap-3"><button onClick={sendCampaign} disabled={sending || !subject || !message} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{sending ? "Sending…" : `Send to ${offersList}`}</button>{sendResult && <span className="text-sm font-medium text-emerald-700">{sendResult}</span>}</div><p className="text-xs text-stone-400">An unsubscribe link is added automatically. Only customers who opted in receive this.</p></div>)}
        </div>

        {/* REBOOKING */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><div><div className="font-semibold">Automatic rebooking reminders</div><div className="text-sm text-stone-500">Nudge clients who haven't visited in a while.</div></div><button onClick={toggleRebooking} className={`relative h-6 w-11 rounded-full transition ${shop.rebooking_enabled ? "bg-emerald-600" : "bg-stone-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${shop.rebooking_enabled ? "left-[22px]" : "left-0.5"}`} /></button></div>
          {shop.rebooking_enabled && (<div className="mt-3 flex items-end gap-2"><div><div className="mb-1 text-xs font-medium text-stone-500">Send after (weeks since last visit)</div><input value={rebookWeeks} onChange={(e) => setRebookWeeks(e.target.value)} type="number" min="1" className="w-32 rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 focus:ring-emerald-500" /></div><button onClick={saveRebookWeeks} disabled={savingRebook} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{savingRebook ? "Saving…" : "Save"}</button>{rebookSaved && <span className="pb-3 text-sm font-medium text-emerald-600">Saved ✓</span>}</div>)}
        </div>

        <h2 className="mt-6 mb-2 text-lg font-semibold">What Kursey is doing for you</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold text-emerald-700">${depositsCollected}</div><div className="text-sm text-stone-500">Deposits secured{depositsCount > 0 ? ` (${depositsCount})` : ""}</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold text-emerald-700">{afterHours}</div><div className="text-sm text-stone-500">Booked while you were closed</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{upcoming}</div><div className="text-sm text-stone-500">Upcoming appointments</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{repeatCustomers}</div><div className="text-sm text-stone-500">Repeat clients</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{offersList}</div><div className="text-sm text-stone-500">On your marketing list</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{totalBookings ? Math.round((afterHours / totalBookings) * 100) : 0}%</div><div className="text-sm text-stone-500">Bookings made after hours</div></div>
        </div>

        <h2 className="mt-6 mb-2 text-lg font-semibold">Bookings &amp; blocks</h2>
        {loading ? <p className="text-stone-500">Loading…</p>
        : bookings.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No bookings yet. Share your booking link to get started.</p>
        : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const isCancelled = b.status === "cancelled";
              const isUpcoming = b.booking_date && b.booking_date >= today;
              if (b.is_block) {
                return (
                  <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-stone-100 opacity-50 ring-stone-200" : "bg-stone-800 text-white ring-stone-700"}`}>
                    <div className="flex items-center justify-between">
                      <div><div className="font-semibold">{b.service} — {b.barber}</div><div className={`text-sm ${isCancelled ? "text-stone-500" : "text-stone-300"}`}>{b.day} · {b.slot}</div></div>
                      {!isCancelled && isUpcoming && <button onClick={() => removeBlock(b.id)} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20">Remove</button>}
                      {isCancelled && <span className="text-xs text-stone-400">Removed</span>}
                    </div>
                  </div>
                );
              }
              const canRefund = b.deposit_paid && !b.deposit_refunded && b.stripe_payment_intent;
              return (
                <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-stone-100 ring-stone-200 opacity-70" : "bg-white ring-stone-200"}`}>
                  <div className="flex items-start justify-between">
                    <div><div className="font-semibold">{b.customer_name}</div><div className="text-sm text-stone-500">{b.service} · {b.barber}</div><div className="text-sm text-stone-500">{b.day} at {b.slot}</div></div>
                    <div className="text-right"><div className="font-semibold">${b.price}</div><div className="text-xs text-stone-400">{b.phone}</div>{!isCancelled && isUpcoming && <button onClick={() => ownerCancel(b)} className="mt-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100">Cancel</button>}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {isCancelled && <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Cancelled</span>}
                    {b.deposit_paid && !b.deposit_refunded && <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Deposit paid ${b.deposit_amount} ✓</span>}
                    {b.deposit_refunded && <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">Deposit refunded</span>}
                    {b.wants_offers && <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">on offers list</span>}
                    {canRefund && <button onClick={() => refundDeposit(b.id)} disabled={refunding === b.id} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-40">{refunding === b.id ? "Refunding…" : `Refund $${b.deposit_amount}`}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}