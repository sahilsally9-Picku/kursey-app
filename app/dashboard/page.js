"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function Dashboard() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  // rebooking state
  const [rebookWeeks, setRebookWeeks] = useState(4);
  const [savingRebook, setSavingRebook] = useState(false);
  const [rebookSaved, setRebookSaved] = useState(false);
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
          const res = await fetch("/api/confirm-subscription", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shopId: shopData.id }),
          });
          const conf = await res.json();
          if (conf.active) { shopData.subscription_status = "active"; setShop({ ...shopData }); }
        } catch (e) {}
      }

      const [bk, stf] = await Promise.all([
        supabase.from("bookings").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
        supabase.from("staff").select("start_time,end_time").eq("shop_id", shopData.id),
      ]);
      setBookings(bk.data || []);
      setStaff(stf.data || []);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  async function subscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, origin: window.location.origin }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Couldn't start checkout: " + (data.error || "unknown")); setSubscribing(false); }
    } catch (err) { alert("Error: " + err.message); setSubscribing(false); }
  }

  async function sendCampaign() {
    if (!subject || !message) { alert("Add a subject and message."); return; }
    setSending(true); setSendResult("");
    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, subject, message, origin: window.location.origin }),
      });
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

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;

  const totalBookings = bookings.length;
  const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const depositsCollected = bookings.reduce((sum, b) => sum + (b.deposit_paid ? (b.deposit_amount || 0) : 0), 0);
  const depositsCount = bookings.filter((b) => b.deposit_paid).length;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.booking_date && b.booking_date >= today && b.status !== "cancelled").length;
  const starts = staff.map((s) => toMin(s.start_time)).filter((v) => v != null);
  const ends = staff.map((s) => toMin(s.end_time)).filter((v) => v != null);
  const openMin = starts.length ? Math.min(...starts) : 9 * 60;
  const closeMin = ends.length ? Math.max(...ends) : 17 * 60;
  const afterHours = bookings.filter((b) => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins < openMin || mins > closeMin;
  }).length;
  const phoneCounts = {};
  bookings.forEach((b) => { if (b.phone) phoneCounts[b.phone] = (phoneCounts[b.phone] || 0) + 1; });
  const repeatCustomers = Object.values(phoneCounts).filter((c) => c > 1).length;
  const offersList = bookings.filter((b) => b.wants_offers).length;

  const status = shop.subscription_status || "trialing";
  const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = status === "active";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <p className="text-sm text-stone-500">kursey.com/{shop.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/settings" className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">Settings</a>
            <button onClick={handleLogout} className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">Log out</button>
          </div>
        </div>

        {/* SUBSCRIPTION BANNER */}
        {isActive ? (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div><div className="font-semibold text-emerald-800">Subscription active ✓</div><div className="text-sm text-emerald-700">Thanks for being a Kursey member.</div></div>
          </div>
        ) : status === "past_due" ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
            <div className="font-semibold text-red-800">Payment needed</div>
            <div className="text-sm text-red-700">Your booking page is paused until you subscribe.</div>
            <button onClick={subscribe} disabled={subscribing} className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{subscribing ? "Opening…" : "Subscribe now"}</button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
            <div className="font-semibold text-indigo-900">Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
            <div className="text-sm text-indigo-700">Subscribe any time to keep your booking page live after the trial.</div>
            <button onClick={subscribe} disabled={subscribing} className="mt-3 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{subscribing ? "Opening…" : "Subscribe — $34.99/mo"}</button>
          </div>
        )}

        {/* booking link */}
        <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-white">
          <div className="text-sm text-emerald-100">Your booking link — share this with clients</div>
          <div className="mt-1 text-lg font-semibold">kursey.com/{shop.slug}</div>
        </div>

        {/* headline stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-3xl font-bold">{totalBookings}</div><div className="text-sm text-stone-500">Total bookings</div></div>
          <div className="rounded-2xl bg-stone-900 p-4 text-white"><div className="text-3xl font-bold text-emerald-400">${revenue}</div><div className="text-sm text-stone-300">Booked revenue</div></div>
        </div>

        {/* MARKETING / SEND AN OFFER */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Send an offer</div>
              <div className="text-sm text-stone-500">Email your {offersList} opted-in customer{offersList === 1 ? "" : "s"}.</div>
            </div>
            <button onClick={() => setShowCampaign(!showCampaign)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">{showCampaign ? "Close" : "Compose"}</button>
          </div>
          {showCampaign && (
            <div className="mt-3 space-y-2">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g. 20% off this week!)" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message…" rows={5} className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500 resize-none" />
              <div className="flex items-center gap-3">
                <button onClick={sendCampaign} disabled={sending || !subject || !message} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{sending ? "Sending…" : `Send to ${offersList}`}</button>
                {sendResult && <span className="text-sm font-medium text-emerald-700">{sendResult}</span>}
              </div>
              <p className="text-xs text-stone-400">An unsubscribe link is added automatically. Only customers who opted in receive this.</p>
            </div>
          )}
        </div>

        {/* REBOOKING NUDGE */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Automatic rebooking reminders</div>
              <div className="text-sm text-stone-500">Nudge clients who haven't visited in a while.</div>
            </div>
            <button onClick={toggleRebooking} className={`relative h-6 w-11 rounded-full transition ${shop.rebooking_enabled ? "bg-emerald-600" : "bg-stone-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${shop.rebooking_enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          {shop.rebooking_enabled && (
            <div className="mt-3 flex items-end gap-2">
              <div>
                <div className="mb-1 text-xs font-medium text-stone-500">Send after (weeks since last visit)</div>
                <input value={rebookWeeks} onChange={(e) => setRebookWeeks(e.target.value)} type="number" min="1" className="w-32 rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 focus:ring-emerald-500" />
              </div>
              <button onClick={saveRebookWeeks} disabled={savingRebook} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{savingRebook ? "Saving…" : "Save"}</button>
              {rebookSaved && <span className="pb-3 text-sm font-medium text-emerald-600">Saved ✓</span>}
            </div>
          )}
        </div>

        {/* VALUE SECTION */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">What Kursey is doing for you</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold text-emerald-700">${depositsCollected}</div><div className="text-sm text-stone-500">Deposits secured{depositsCount > 0 ? ` (${depositsCount})` : ""}</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold text-emerald-700">{afterHours}</div><div className="text-sm text-stone-500">Booked while you were closed</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{upcoming}</div><div className="text-sm text-stone-500">Upcoming appointments</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{repeatCustomers}</div><div className="text-sm text-stone-500">Repeat clients</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{offersList}</div><div className="text-sm text-stone-500">On your marketing list</div></div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200"><div className="text-2xl font-bold">{totalBookings ? Math.round((afterHours / totalBookings) * 100) : 0}%</div><div className="text-sm text-stone-500">Bookings made after hours</div></div>
        </div>

        {/* list */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Bookings</h2>
        {loading ? <p className="text-stone-500">Loading…</p>
        : bookings.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No bookings yet. Share your booking link to get started.</p>
        : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className={`rounded-xl p-4 ring-1 ${b.status === "cancelled" ? "bg-stone-100 ring-stone-200 opacity-60" : "bg-white ring-stone-200"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{b.customer_name}</div>
                    <div className="text-sm text-stone-500">{b.service} · {b.barber}</div>
                    <div className="text-sm text-stone-500">{b.day} at {b.slot}</div>
                  </div>
                  <div className="text-right"><div className="font-semibold">${b.price}</div><div className="text-xs text-stone-400">{b.phone}</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.status === "cancelled" && <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Cancelled</span>}
                  {b.deposit_paid && <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Deposit paid ${b.deposit_amount} ✓</span>}
                  {b.wants_offers && <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">on offers list</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}