"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Analytics() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData); setChecking(false);
      const [bk, rv] = await Promise.all([
        supabase.from("bookings").select("*").eq("shop_id", shopData.id),
        supabase.from("reviews").select("*").eq("shop_id", shopData.id),
      ]);
      setBookings(bk.data || []);
      setReviews(rv.data || []);
      setLoading(false);
    }
    init();
  }, [router]);

  if (checking || loading) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;

  // only real, non-cancelled bookings for revenue/counts
  const real = bookings.filter((b) => !b.is_block);
  const active = real.filter((b) => b.status !== "cancelled");
  const cancelled = real.filter((b) => b.status === "cancelled");

  const today = new Date();
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const wkStr = startOfWeek.toISOString().slice(0, 10);
  const moStr = startOfMonth.toISOString().slice(0, 10);

  const revAll = active.reduce((s, b) => s + (b.price || 0), 0);
  const revWeek = active.filter((b) => b.booking_date && b.booking_date >= wkStr).reduce((s, b) => s + (b.price || 0), 0);
  const revMonth = active.filter((b) => b.booking_date && b.booking_date >= moStr).reduce((s, b) => s + (b.price || 0), 0);

  // busiest days of week
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  active.forEach((b) => { if (b.booking_date) { const d = new Date(b.booking_date + "T00:00:00"); dayCounts[d.getDay()]++; } });
  const maxDay = Math.max(1, ...dayCounts);

  // busiest hours
  const hourCounts = {};
  active.forEach((b) => { if (b.start_min != null) { const h = Math.floor(b.start_min / 60); hourCounts[h] = (hourCounts[h] || 0) + 1; } });
  const hours = Object.keys(hourCounts).map(Number).sort((a, b) => a - b);
  const maxHour = Math.max(1, ...Object.values(hourCounts));

  // per-barber
  const barberStats = {};
  active.forEach((b) => { if (!barberStats[b.barber]) barberStats[b.barber] = { count: 0, rev: 0 }; barberStats[b.barber].count++; barberStats[b.barber].rev += (b.price || 0); });
  const barbers = Object.entries(barberStats).sort((a, b) => b[1].rev - a[1].rev);

  const cancelRate = real.length ? Math.round((cancelled.length / real.length) * 100) : 0;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : null;

  const card = "rounded-2xl bg-white p-4 ring-1 ring-stone-200";
  const barBg = "h-2.5 rounded-full bg-stone-100 overflow-hidden";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-stone-500">{shop.name}</p></div>
          <a href="/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">← Dashboard</a>
        </div>

        {/* REVENUE */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Revenue</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className={card}><div className="text-2xl font-bold text-emerald-700">${revWeek}</div><div className="text-xs text-stone-500">This week</div></div>
          <div className={card}><div className="text-2xl font-bold text-emerald-700">${revMonth}</div><div className="text-xs text-stone-500">This month</div></div>
          <div className={card}><div className="text-2xl font-bold text-emerald-700">${revAll}</div><div className="text-xs text-stone-500">All time</div></div>
        </div>

        {/* KEY NUMBERS */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className={card}><div className="text-2xl font-bold">{active.length}</div><div className="text-xs text-stone-500">Completed / booked</div></div>
          <div className={card}><div className="text-2xl font-bold text-red-600">{cancelRate}%</div><div className="text-xs text-stone-500">Cancellation rate</div></div>
          <div className={card}><div className="text-2xl font-bold text-amber-500">{avgRating != null ? avgRating.toFixed(1) : "—"}</div><div className="text-xs text-stone-500">Avg rating ({reviews.length})</div></div>
        </div>

        {/* BUSIEST DAYS */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Busiest days</h2>
        <div className={card}>
          <div className="space-y-2">
            {DOW.map((d, i) => (
              <div key={d} className="flex items-center gap-3">
                <div className="w-10 text-sm text-stone-500">{d}</div>
                <div className={`flex-1 ${barBg}`}><div className="h-full bg-emerald-500" style={{ width: `${(dayCounts[i] / maxDay) * 100}%` }} /></div>
                <div className="w-6 text-right text-sm font-medium">{dayCounts[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BUSIEST HOURS */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Busiest times</h2>
        <div className={card}>
          {hours.length === 0 ? <p className="text-sm text-stone-500">Not enough data yet.</p> : <div className="space-y-2">{hours.map((h) => (
            <div key={h} className="flex items-center gap-3">
              <div className="w-14 text-sm text-stone-500">{String(h).padStart(2, "0")}:00</div>
              <div className={`flex-1 ${barBg}`}><div className="h-full bg-indigo-500" style={{ width: `${(hourCounts[h] / maxHour) * 100}%` }} /></div>
              <div className="w-6 text-right text-sm font-medium">{hourCounts[h]}</div>
            </div>
          ))}</div>}
        </div>

        {/* PER-BARBER */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Per barber</h2>
        <div className="space-y-2">
          {barbers.length === 0 ? <p className={`${card} text-sm text-stone-500`}>No bookings yet.</p> : barbers.map(([name, st]) => (
            <div key={name} className={`${card} flex items-center justify-between`}>
              <div><div className="font-semibold">{name}</div><div className="text-sm text-stone-500">{st.count} booking{st.count === 1 ? "" : "s"}</div></div>
              <div className="text-lg font-bold text-emerald-700">${st.rev}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">Cancellations and blocked time are excluded from revenue.</p>
      </div>
    </div>
  );
}