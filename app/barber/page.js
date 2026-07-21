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

function next14Days() {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DOW[d.getDay()];
    out.push({ key, label, sub: `${MONTHS[d.getMonth()]} ${d.getDate()}` });
  }
  return out;
}

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
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
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

  if (checking) return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.booking_date && b.booking_date >= today);
  const days = next14Days();
  const countForDate = (key) => bookings.filter((b) => b.booking_date === key && b.status !== "cancelled").length;
  const visible = (dateFilter === "all" ? bookings : bookings.filter((b) => b.booking_date === dateFilter))
    .slice().sort((a, b) => (a.start_min ?? 0) - (b.start_min ?? 0));

  const inputCls = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";
  const selCls = "w-full rounded-xl bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 focus:ring-2 focus:ring-[#13294b]";
  const card = "rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Hi, {me.name}!</h1>
            <p className="text-sm text-slate-600">{shop?.name} · your schedule</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Log out</button>
        </div>

        <div className="mt-4 rounded-2xl bg-[#13294b] p-4 text-white shadow-sm">
          <div className="text-3xl font-bold">{upcoming.length}</div>
          <div className="text-sm text-white/70">Upcoming appointments</div>
        </div>

        {/* BLOCK OFF MY TIME */}
        <div className={`mt-4 p-4 ${card}`}>
          <div className="flex items-center justify-between"><div><div className="font-semibold">Block off my time</div><div className="text-sm text-slate-500">For lunch, breaks, or time off.</div></div><button onClick={() => setShowBlock(!showBlock)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-200">{showBlock ? "Close" : "Block"}</button></div>
          {showBlock && (<div className="mt-3 space-y-2"><div className="flex gap-2"><button onClick={() => setBlockMode("range")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "range" ? "bg-[#13294b] text-white" : "bg-slate-100 text-slate-700"}`}>Time range</button><button onClick={() => setBlockMode("day")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${blockMode === "day" ? "bg-[#13294b] text-white" : "bg-slate-100 text-slate-700"}`}>Whole day</button></div><input value={bDate} onChange={(e) => setBDate(e.target.value)} type="date" className={inputCls} />{blockMode === "range" && (<div className="flex items-center gap-2"><select value={bStart} onChange={(e) => setBStart(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select><span className="text-slate-500">–</span><select value={bEnd} onChange={(e) => setBEnd(e.target.value)} className={selCls}>{TIMES.map((m) => <option key={m} value={m}>{toLabel(m)}</option>)}</select></div>)}<button onClick={addBlock} disabled={blocking} className="w-full rounded-xl bg-[#13294b] py-3 font-semibold text-white shadow-sm enabled:hover:bg-[#1d3a63] disabled:opacity-40">{blocking ? "Blocking…" : blockMode === "day" ? "Block whole day" : "Block this time"}</button></div>)}
        </div>

        {/* SCHEDULE — date view */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">My schedule</h2>
        <p className="mb-2 text-xs text-slate-500">To cancel a booking, please ask the shop owner.</p>

        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setDateFilter("all")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${dateFilter === "all" ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>All</button>
          <button onClick={() => setDateFilter(today)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${dateFilter === today ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>Today</button>
          <input value={dateFilter === "all" ? "" : dateFilter} onChange={(e) => setDateFilter(e.target.value || "all")} type="date" className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-900 outline-none ring-1 ring-slate-300 focus:ring-2 focus:ring-[#13294b]" />
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const n = countForDate(d.key);
            const selected = dateFilter === d.key;
            return (
              <button key={d.key} onClick={() => setDateFilter(d.key)} className={`min-w-[68px] shrink-0 rounded-xl px-2 py-2 text-center ring-1 transition ${selected ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                <div className="text-sm font-semibold">{d.label}</div>
                <div className={`text-xs ${selected ? "text-white/70" : "text-slate-500"}`}>{d.sub}</div>
                {n > 0 && <div className={`mx-auto mt-1 w-fit rounded-full px-1.5 text-[10px] font-bold ${selected ? "bg-white/25 text-white" : "bg-[#13294b]/10 text-[#13294b]"}`}>{n}</div>}
              </button>
            );
          })}
        </div>

        {loading ? <p className="text-slate-600">Loading…</p>
        : visible.length === 0 ? <p className={`p-4 text-slate-500 ${card}`}>{dateFilter === "all" ? "No bookings yet." : "Nothing booked for this day."}</p>
        : (
          <div className="space-y-2">
            {visible.map((b) => {
              const isCancelled = b.status === "cancelled";
              const isUpcoming = b.booking_date && b.booking_date >= today;
              if (b.is_block) {
                return (
                  <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-slate-100 opacity-60 ring-slate-200" : "bg-slate-100 text-slate-900 ring-slate-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {b.start_min != null && <span className="shrink-0 rounded-lg bg-[#13294b]/10 px-2 py-1 text-xs font-bold text-[#13294b] ring-1 ring-[#13294b]/20">{b.slot}</span>}
                        <div><div className="font-semibold">{b.service}</div><div className="text-sm text-slate-500">{b.day}</div></div>
                      </div>
                      {!isCancelled && isUpcoming && <button onClick={() => removeBlock(b.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-200">Remove</button>}
                      {isCancelled && <span className="text-xs text-slate-500">Removed</span>}
                    </div>
                  </div>
                );
              }
              return (
                <div key={b.id} className={`rounded-xl p-4 ring-1 ${isCancelled ? "bg-white ring-slate-200 opacity-60" : "bg-white ring-slate-200 shadow-sm"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {b.start_min != null && <span className="mt-0.5 shrink-0 rounded-lg bg-[#13294b]/10 px-2 py-1 text-xs font-bold text-[#13294b] ring-1 ring-[#13294b]/20">{b.slot}</span>}
                      <div><div className="font-semibold">{b.customer_name}</div><div className="text-sm text-slate-600">{b.service}</div><div className="text-sm text-slate-500">{b.day}</div></div>
                    </div>
                    <div className="text-right"><div className="text-xs text-slate-500">{b.phone}</div></div>
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