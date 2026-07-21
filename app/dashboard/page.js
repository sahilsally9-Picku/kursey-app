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

      // if returning from checkout, confirm + activate
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

  if (checking) return <div className="flex min-h-screen items-center justify-center text-stone-300">Loading…</div>;

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

  const card = "rounded-2xl bg-stone-900/75 ring-1 ring-white/15 backdrop-blur-md";
  const navBtn = "whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-stone-200 ring-1 ring-white/15 hover:bg-white/15";

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* header — stacks on phones so buttons never get cramped */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{shop.name}</h1>
            <p className="truncate text-sm text-stone-300">kursey.com/{shop.slug}</p>
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
            <div><div className="font-semibold text-amber-400">Subscription active ✓</div><div className="text-sm text-stone-300">Thanks for being a Kursey member.</div></div>
            <a href="/plan" className="shrink-0 whitespace-nowrap text-sm font-medium text-amber-400 hover:underline">Change plan</a>
          </div>
        ) : status === "past_due" ? (
          <div className={`mt-4 p-4 ${card}`}>
            <div className="font-semibold text-red-300">Payment needed</div>
            <div className="text-sm text-stone-300">Your booking page is paused until you subscribe.</div>
            <a href="/plan" className="mt-3 inline-block rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">Choose a plan</a>
          </div>
        ) : (
          <div className={`mt-4 p-4 ${card}`}>
            <div className="font-semibold text-white">Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
            <div className="text-sm text-stone-300">Choose a plan any time to keep your booking page live after the trial.</div>
            <a href="/plan" className="mt-3 inline-block rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">Choose a plan</a>
          </div>
        )}

        {/* booking link */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 p-4 text-white shadow-lg">
          <div className="text-sm text-amber-50">Your booking link — share this with clients</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-lg font-semibold">kursey.com/{shop.slug}</span>
            <button onClick={() => { navigator.clipboard.writeText(`https://kursey.com/${shop.slug}`); }} className="shrink-0 whitespace-nowrap rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium ring-1 ring-white/30 hover:bg-white/30">Copy link</button>
          </div>
        </div>

        {/* headline stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold">{totalBookings}</div><div className="text-sm text-stone-300">Total bookings</div></div>
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold text-amber-400">${revenue}</div><div className="text-sm text-stone-300">Booked revenue</div></div>
        </div>

        {/* quick actions */}
        <div className="mt-4 space-y-3">
          <a href="/add-booking" className={`flex items-center justify-between gap-3 p-4 ${card}`}>
            <div><div className="font-semibold">Add a booking</div><div className="text-sm text-stone-300">For walk-ins or phone bookings.</div></div>
            <span className="shrink-0 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow">Add</span>
          </a>
          <a href="/settings" className={`flex items-center justify-between gap-3 p-4 ${card}`}>
            <div><div className="font-semibold">Block off time</div><div className="text-sm text-stone-300">For lunch, vacation, or time off.</div></div>
            <span className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15">Block</span>
          </a>
        </div>

        {/* VALUE SECTION */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">What Kursey is doing for you</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold text-amber-400">${depositsCollected}</div><div className="text-sm text-stone-300">Deposits secured{depositsCount > 0 ? ` (${depositsCount})` : ""}</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold text-amber-400">{afterHours}</div><div className="text-sm text-stone-300">Booked while you were closed</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{upcoming}</div><div className="text-sm text-stone-300">Upcoming appointments</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{repeatCustomers}</div><div className="text-sm text-stone-300">Repeat clients</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{offersList}</div><div className="text-sm text-stone-300">On your marketing list</div></div>
          <div className={`p-4 ${card}`}><div className="text-2xl font-bold">{totalBookings ? Math.round((afterHours / totalBookings) * 100) : 0}%</div><div className="text-sm text-stone-300">Bookings made after hours</div></div>
        </div>

        {/* list */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">Bookings</h2>
        {loading ? <p className="text-stone-300">Loading…</p>
        : bookings.length === 0 ? <p className={`p-4 text-stone-300 ${card}`}>No bookings yet. Share your booking link to get started.</p>
        : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className={`p-4 ${card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{b.customer_name}</div>
                    <div className="text-sm text-stone-300">{b.service} · {b.barber}</div>
                    <div className="text-sm text-stone-300">{b.day} at {b.slot}</div>
                  </div>
                  <div className="shrink-0 text-right"><div className="font-semibold">${b.price}</div><div className="text-xs text-stone-400">{b.phone}</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.deposit_paid && <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30">Deposit paid ${b.deposit_amount} ✓</span>}
                  {b.wants_offers && <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-stone-200">on offers list</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}