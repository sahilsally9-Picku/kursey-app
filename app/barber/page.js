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

export default function BarberView() {
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlock, setShowBlock] = useState(false);
  const [blockMode, setBlockMode] = useState("range");
  const [bDate, setBDate] = useState("");
  const [bStart, setBStart] = useState("720"); const [bEnd, setBEnd] = useState("780");
  const [blocking, setBlocking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: staffRow } = await supabase.from("staff").select("*").eq("user_id", session.user.id).limit(1).single();
      if (!staffRow) { router.push("/login"); return; }
      setMe(staffRow);
      const { data: shopData } = await supabase.from("shops").select("*").eq("id", staffRow.shop_id).single();
      setShop(shopData);
      setChecking(false);
      await refreshBookings(staffRow);
      setLoading(false);
    }
    init();
  }, [router]);

  async function refreshBookings(staffRow) {
    const { data } = await supabase.from("bookings").select("*")
      .eq("shop_id", staffRow.shop_id).eq("barber", staffRow.name)
      .order("booking_date", { ascending: true });
    setBookings(data || []);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  async function removeBlock(id) {
    if (!confirm("Remove this time block?")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) { alert("Couldn't remove: " + error.message); return; }
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
  }

  async function addBlock() {
    if (!bDate) { alert("Pick a date."); return; }
    setBlocking(true);
    const d = new Date(bDate + "T00:00:00");
    const dayLabel = `${DOW[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
    let startMin, dur;
    if (blockMode === "day") { startMin = 0; dur = 24 * 60; }
    else { startMin = parseInt(bStart); const endMin = parseInt(bEnd); if (endMin <= startMin) { setBlocking(false); alert("End time must be after start."); return; } dur = endMin - startMin; }
    const { error } = await supabase.from("bookings").insert({ shop_id: me.shop_id, service: blockMode === "day" ? "Day off" : "Blocked", price: 0, barber: me.name, day: dayLabel, slot: blockMode === "day" ? "All day" : toLabel(startMin), booking_date: bDate, start_min: startMin, duration_min: dur, customer_name: "— Blocked —", phone: "", email: "", wants_offers: false, status: "confirmed", is_block: true });
    setBlocking(false);
    if (error) { alert("Couldn't block: " + error.message); return; }
    setShowBlock(false); setBDate(""); setBStart("720"); setBEnd("780");
    refreshBookings(me);
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.booking_date && b.booking_date >= today);
  const inputCls = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";
  const selCls = "w-full rounded-xl bg-white px-3 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hi, {me.name}!</h1>
            <p className="text-sm text-stone-500">{shop?.name} · your schedule</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">Log out</button>
        </div>

        <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-white">
          <div className="text-3xl font-bold">{upcoming.length}</div>
          <div className="text-sm text-emerald-100">Upcoming appointments</div>
        </div>

        {/* BLOCK OFF MY TIME */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="flex items-center justify-between"><div><div className="font-semibold">Block off my time</div><div className="text-sm text-stone-500">For lunch, breaks, or time off.</div></div><button onClick={() => setShowBlock(!showBlock)} className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-900">{showBlock ? "Close" : "Block"}</button></div>
          {showBlock && (<div className="mt-3 space-y-2"><div className="flex gap-2"><button onClick={() => setBlockMode("range")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "range" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}>Time range</button><button onClick={() => setBlockMode("day")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "day" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}`}>Whole day</button></div><input value={bDate} onChange={(e) => setBDate(e.target.value)} type="date" className={inputCls} />{blockMode === "range" && (<div className="flex items-center gap-2"><select value={bStart} onChange={(e) => setBStart(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select><span className="text-stone-400">–</span><select value={bEnd} onChange={(e) => setBEnd(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select></div>)}<button onClick={addBlock} disabled={blocking} className="w-full rounded-xl bg-stone-800 py-3 font-semibold text-white disabled:opacity-40">{blocking ? "Blocking…" : blockMode === "day" ? "Block whole day" : "Block this time"}</button></div>)}
        </div>

        <h2 className="mt-6 mb-2 text-lg font-semibold">My bookings</h2>
        <p className="mb-2 text-xs text-stone-400">To cancel a booking, please ask the shop owner.</p>
        {loading ? <p className="text-stone-500">Loading…</p>
        : bookings.length === 0 ? <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No bookings yet.</p>
        : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const isCancelled = b.status === "cancelled";
              const isUpcoming = b.booking_date && b.booking_date >= today;
              if (b.is_block) {
                return (
                  <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-stone-100 opacity-50 ring-stone-200" : "bg-stone-800 text-white ring-stone-700"}`}>
                    <div className="flex items-center justify-between">
                      <div><div className="font-semibold">{b.service}</div><div className={`text-sm ${isCancelled ? "text-stone-500" : "text-stone-300"}`}>{b.day} · {b.slot}</div></div>
                      {!isCancelled && isUpcoming && <button onClick={() => removeBlock(b.id)} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20">Remove</button>}
                      {isCancelled && <span className="text-xs text-stone-400">Removed</span>}
                    </div>
                  </div>
                );
              }
              return (
                <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-stone-100 ring-stone-200 opacity-70" : "bg-white ring-stone-200"}`}>
                  <div className="flex items-start justify-between">
                    <div><div className="font-semibold">{b.customer_name}</div><div className="text-sm text-stone-500">{b.service}</div><div className="text-sm text-stone-500">{b.day} at {b.slot}</div></div>
                    <div className="text-right"><div className="text-xs text-stone-400">{b.phone}</div></div>
                  </div>
                  {isCancelled && <div className="mt-2"><span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Cancelled</span></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}