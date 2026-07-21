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
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData); setChecking(false);

      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") === "success" && shopData.subscription_status !== "active") {
        try {
          const res = await fetch("/api/confirm-subscription", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shopId: shopData.id }),
          });
          const conf = await res.json();
          if (conf.active) {
            shopData.subscription_status = "active";
            if (conf.plan) shopData.plan = conf.plan;
            setShop({ ...shopData });
          }
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

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;

  const totalBookings = bookings.length;
  const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const depositsCollected = bookings.reduce((sum, b) => sum + (b.deposit_paid ? (b.deposit_amount || 0) : 0), 0);
  const depositsCount = bookings.filter((b) => b.deposit_paid).length;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.booking_date && b.booking_date >= today).length;
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

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const navBtn = "whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
  const navyBtn = "rounded-xl bg-[#13294b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3a63]";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* header — stacks on phones */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{shop.name}</h1>
            <p className="truncate text-sm text-slate-500">kursey.com/{shop.slug}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/analytics" className={navBtn}>Analytics</a>
            <a href="/settings" className={navBtn}>Settings</a>
            <button onClick={handleLogout} className={navBtn}>Log out</button>
          </div>
        </div>

        {/* SUBSCRIPTION BANNER */}
        {isActive ? (
          <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 p-4 ${card}`}>
            <div><div className="font-semibold text-[#13294b]">Subscription active ✓</div><div className="text-sm text-slate-600">Thanks for being a Kursey member.</div></div>
            <a href="/plan" className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#13294b] hover:underline">Change plan</a>
          </div>
        ) : status === "past_due" ? (
          <div className={`mt-4 p-4 ${card}`}>
            <div className="font-semibold text-red-600">Payment needed</div>
            <div className="text-sm text-slate-600">Your booking page is paused until you subscribe.</div>
            <a href="/plan" className={`mt-3 inline-block ${navyBtn}`}>Choose a plan</a>
          </div>
        ) : (trialEnds && trialEnds < new Date()) ? (
          <div className={`mt-4 p-4 ${card}`}>
            <div className="font-semibold text-red-600">Your free trial has ended</div>
            <div className="text-sm text-slate-600">Your booking page is paused. Subscribe to reactivate it and start taking bookings again.</div>
            <a href="/plan" className={`mt-3 inline-block ${navyBtn}`}>Subscribe now</a>
          </div>
        ) : (
          <div className={`mt-4 p-4 ${card}`}>
            <div className="font-semibold text-slate-900">Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
            <div className="text-sm text-slate-600">Choose a plan any time to keep your booking page live after the trial.</div>
            <a href="/plan" className={`mt-3 inline-block ${navyBtn}`}>Choose a plan</a>
          </div>
        )}

        {/* booking link */}
        <div className="mt-4 rounded-2xl bg-[#13294b] p-4 text-white shadow-sm">
          <div className="text-sm text-white/70">Your booking link — share this with clients</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-lg font-semibold">kursey.com/{shop.slug}</span>
            <button onClick={() => { navigator.clipboard.writeText(`https://kursey.com/${shop.slug}`); }} className="shrink-0 whitespace-nowrap rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium ring-1 ring-white/25 hover:bg-white/25">Copy link</button>
          </div>
        </div>

        {/* headline stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold">{totalBookings}</div><div className="text-sm text-slate-600">Total bookings</div></div>
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold text-[#13294b]">${revenue}</div><div className="text-sm text-slate-600">Booked revenue</div></div>
        </div>

        {/* quick actions */}
        <div className="mt-4 space-y-3">
          <a href="/add-booking" className={`flex items-center justify-between gap-3 p-4 ${card}`}>
            <div><div className="font-semibold">Add a booking</div><div className="text-sm text-slate-600">For walk-ins or phone bookings.</div></div>
            <span className="shrink-0 rounded-lg bg-[#13294b] px-4 py-2 text-sm font-semibold text-white">Add</span>
          </a>
          <a href="/settings" className={`flex items-center justify-between gap-3 p-4 ${card}`}>
            <div><div className="font-semibold">Block off time</div><div className="text-sm text-slate-600">For lunch, vacation, or time off.</div></div>
            <span className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Block</span>
          </a>
        </div>

        {/* VALUE SECTION */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">What Kursey is doing for you</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold text-[#13294b]">${depositsCollected}</div><div className="text-sm text-slate-600">Deposits secured{depositsCount > 0 ? ` (${depositsCount})` : ""}</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold text-[#13294b]">{afterHours}</div><div className="text-sm text-slate-600">Booked while you were closed</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{upcoming}</div><div className="text-sm text-slate-600">Upcoming appointments</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{repeatCustomers}</div><div className="text-sm text-slate-600">Repeat clients</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{offersList}</div><div className="text-sm text-slate-600">On your marketing list</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{totalBookings ? Math.round((afterHours / totalBookings) * 100) : 0}%</div><div className="text-sm text-slate-600">Bookings made after hours</div></div>
        </div>

        {/* list */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">Bookings</h2>
        {loading ? <p className="text-slate-500">Loading…</p>
        : bookings.length === 0 ? <p className={`p-4 text-slate-600 ${card}`}>No bookings yet. Share your booking link to get started.</p>
        : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className={`p-4 ${card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{b.customer_name}</div>
                    <div className="text-sm text-slate-600">{b.service} · {b.barber}</div>
                    <div className="text-sm text-slate-600">{b.day} at {b.slot}</div>
                  </div>
                  <div className="shrink-0 text-right"><div className="font-semibold">${b.price}</div><div className="text-xs text-slate-400">{b.phone}</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.deposit_paid && <span className="inline-block rounded-full bg-[#13294b]/10 px-2 py-0.5 text-xs font-medium text-[#13294b] ring-1 ring-[#13294b]/20">Deposit paid ${b.deposit_amount} ✓</span>}
                  {b.wants_offers && <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">on offers list</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}