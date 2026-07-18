"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const PLANS = [
  { id: "solo", name: "Solo", price: "$12.99", limit: 1, blurb: "For a single-chair barber just starting out.", features: ["1 barber", "Your own booking page", "Deposits & reminders", "Reviews & rebooking"] },
  { id: "shop", name: "Shop", price: "$29.99", limit: 5, blurb: "For a typical barbershop or salon.", features: ["Up to 5 barbers", "Everything in Solo", "Per-barber logins", "Priority support"], popular: true },
  { id: "studio", name: "Studio", price: "$49.99", limit: Infinity, blurb: "For large shops and small chains.", features: ["Unlimited barbers", "Everything in Shop", "Best for growing teams"] },
];

export default function PlanPage() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [busy, setBusy] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData);
      const { count } = await supabase.from("staff").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id);
      setStaffCount(count || 0);
      setChecking(false);
    }
    init();
  }, [router]);

  async function choosePlan(planId) {
    const plan = PLANS.find((p) => p.id === planId);
    if (staffCount > plan.limit) {
      alert(`You currently have ${staffCount} barbers. The ${plan.name} plan allows ${plan.limit === Infinity ? "unlimited" : plan.limit}. Please remove barbers first, or choose a larger plan.`);
      return;
    }
    setBusy(planId);
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, origin: window.location.origin, plan: planId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Couldn't start checkout: " + (data.error || "unknown")); setBusy(null); }
    } catch (err) { alert("Error: " + err.message); setBusy(null); }
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center text-stone-300">Loading…</div>;

  const currentPlan = shop.plan || "shop";
  const card = "rounded-2xl bg-stone-900/75 ring-1 ring-white/15 backdrop-blur-md";
  const btnGold = "rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-white shadow-lg transition enabled:hover:from-amber-700 enabled:hover:to-amber-600 disabled:opacity-40";

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Choose your plan</h1>
            <p className="text-sm text-stone-300">{shop.name} · {staffCount} barber{staffCount === 1 ? "" : "s"} in use</p>
          </div>
          <a href="/dashboard" className="text-sm font-medium text-amber-400 hover:underline">← Dashboard</a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.id && shop.subscription_status === "active";
            return (
              <div key={p.id} className={`relative flex flex-col p-5 ${card} ${p.popular ? "ring-2 ring-amber-400/60" : ""}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white shadow">Most popular</div>}
                <div className="font-display text-xl font-semibold">{p.name}</div>
                <div className="mt-1 flex items-end gap-1"><span className="font-display text-3xl font-bold text-amber-400">{p.price}</span><span className="mb-1 text-sm text-stone-400">/mo</span></div>
                <p className="mt-2 text-sm text-stone-300">{p.blurb}</p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-stone-200">
                  {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">✓</span>{f}</li>))}
                </ul>
                {isCurrent ? (
                  <div className="mt-4 rounded-xl bg-white/10 py-2.5 text-center text-sm font-semibold text-amber-300 ring-1 ring-amber-400/30">Current plan</div>
                ) : (
                  <button onClick={() => choosePlan(p.id)} disabled={busy === p.id} className={`mt-4 py-2.5 ${btnGold}`}>{busy === p.id ? "Opening…" : "Choose " + p.name}</button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">All plans include everything: booking page, deposits, reminders, reviews, and rebooking. Cancel anytime.</p>
      </div>
    </div>
  );
}