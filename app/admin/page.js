"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const PLAN_PRICE = { solo: 12.99, shop: 29.99, studio: 49.99 };
const PLAN_LABEL = { solo: "Solo", shop: "Shop", studio: "Studio" };

function fmtDate(d) {
  if (!d) return "—";
  const x = new Date(d);
  return `${x.toLocaleString("en", { month: "short" })} ${x.getDate()}, ${x.getFullYear()}`;
}

export default function AdminPanel() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      // hard gate: is this account a platform admin?
      const { data: adminRow } = await supabase.from("platform_admins").select("user_id").eq("user_id", session.user.id).limit(1).single();
      if (!adminRow) { router.replace("/dashboard"); return; }
      setAllowed(true); setChecking(false);
      const { data, error } = await supabase.rpc("admin_overview");
      if (!error) setRows(data || []);
      setLoading(false);
    }
    init();
  }, [router]);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Checking access…</div>;
  if (!allowed) return null;

  const now = new Date();
  const isExpired = (r) => r.subscription_status === "trialing" && r.trial_ends_at && new Date(r.trial_ends_at) < now;
  const statusOf = (r) => {
    if (r.subscription_status === "active") return "active";
    if (r.subscription_status === "past_due") return "past_due";
    if (isExpired(r)) return "expired";
    return "trialing";
  };

  const filtered = rows.filter((r) => {
    const matchesQ = !q || r.name?.toLowerCase().includes(q.toLowerCase()) || r.slug?.toLowerCase().includes(q.toLowerCase());
    const matchesF = filter === "all" || statusOf(r) === filter;
    return matchesQ && matchesF;
  });

  const totalShops = rows.length;
  const activeShops = rows.filter((r) => r.subscription_status === "active");
  const trialingShops = rows.filter((r) => statusOf(r) === "trialing");
  const totalBookings = rows.reduce((n, r) => n + Number(r.bookings_count || 0), 0);
  const mrr = activeShops.reduce((n, r) => n + (PLAN_PRICE[r.plan] || 0), 0);

  const badge = (s) => {
    const map = {
      active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      trialing: "bg-blue-50 text-blue-700 ring-blue-200",
      expired: "bg-red-50 text-red-700 ring-red-200",
      past_due: "bg-amber-50 text-amber-700 ring-amber-200",
    };
    const label = { active: "Active", trialing: "Trial", expired: "Trial ended", past_due: "Past due" };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${map[s]}`}>{label[s]}</span>;
  };

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const chip = (v, label) => (
    <button onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${filter === v ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Kursey admin</h1>
            <p className="text-sm text-slate-500">Platform overview — every shop on Kursey.</p>
          </div>
          <a href="/dashboard" className="whitespace-nowrap text-sm font-medium text-[#13294b] hover:underline">← My dashboard</a>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold">{totalShops}</div><div className="text-sm text-slate-600">Total shops</div></div>
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold text-emerald-600">{activeShops.length}</div><div className="text-sm text-slate-600">Paying</div></div>
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold text-blue-600">{trialingShops.length}</div><div className="text-sm text-slate-600">On trial</div></div>
          <div className={`p-4 ${card}`}><div className="font-display text-3xl font-bold text-[#13294b]">${mrr.toFixed(2)}</div><div className="text-sm text-slate-600">Monthly revenue</div></div>
        </div>

        <div className={`mt-4 p-4 ${card}`}>
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or link…" className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chip("all", "All")}
            {chip("active", "Paying")}
            {chip("trialing", "On trial")}
            {chip("expired", "Trial ended")}
            {chip("past_due", "Past due")}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? <p className="text-slate-500">Loading shops…</p>
          : filtered.length === 0 ? <p className={`p-4 text-slate-600 ${card}`}>No shops match.</p>
          : filtered.map((r) => (
            <div key={r.shop_id} className={`p-4 ${card}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    {badge(statusOf(r))}
                  </div>
                  <a href={`https://kursey.com/${r.slug}`} target="_blank" rel="noreferrer" className="text-sm text-[#13294b] hover:underline">kursey.com/{r.slug}</a>
                  <div className="mt-1 text-xs text-slate-500">
                    {r.business_type || "—"} · joined {fmtDate(r.created_at)} · {r.plan ? PLAN_LABEL[r.plan] || r.plan : "no plan"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-4 text-right text-sm">
                  <div><div className="font-semibold">{r.bookings_count}</div><div className="text-xs text-slate-500">bookings</div></div>
                  <div><div className="font-semibold">{r.staff_count}</div><div className="text-xs text-slate-500">staff</div></div>
                  <div><div className={`font-semibold ${r.stripe_connected ? "text-emerald-600" : "text-slate-400"}`}>{r.stripe_connected ? "✓" : "—"}</div><div className="text-xs text-slate-500">Stripe</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Only you can see this page. {rows.length} shop{rows.length === 1 ? "" : "s"} total.</p>
      </div>
    </div>
  );
}