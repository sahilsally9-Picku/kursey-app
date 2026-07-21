"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const PLANS = [
  { id: "solo", name: "Solo", price: "$12.99", limit: 1, blurb: "For a single chair just starting out.", features: ["1 staff member", "Your own booking page", "Deposits & reminders", "Reviews & rebooking"] },
  { id: "shop", name: "Shop", price: "$29.99", limit: 5, blurb: "For a typical salon or shop.", features: ["Up to 5 staff", "Everything in Solo", "Individual staff logins", "Priority support"], popular: true },
  { id: "studio", name: "Studio", price: "$49.99", limit: Infinity, blurb: "For larger teams.", features: ["Unlimited staff", "Everything in Shop", "Best for growing businesses"] },
];

export default function PlanPage() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [busy, setBusy] = useState(null);
  const [saving, setSaving] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.replace("/signup"); return; }
      setShop(shopData);
      const { count } = await supabase.from("staff").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id);
      setStaffCount(count || 0);
      setChecking(false);
    }
    init();
  }, [router]);

  function overLimit(plan) { return staffCount > plan.limit; }

  async function chooseFree(planId) {
    const plan = PLANS.find((p) => p.id === planId);
    if (overLimit(plan)) {
      alert(`You currently have ${staffCount} staff. The ${plan.name} plan allows ${plan.limit === Infinity ? "unlimited" : plan.limit}. Please remove staff first, or choose a larger plan.`);
      return;
    }
    setSaving(planId);
    const { error } = await supabase.from("shops").update({ plan: planId }).eq("id", shop.id);
    setSaving(null);
    if (error) { alert("Couldn't save your plan: " + error.message); return; }
    setShop({ ...shop, plan: planId });
    router.replace("/dashboard");
  }

  async function subscribePaid(planId) {
    const plan = PLANS.find((p) => p.id === planId);
    if (overLimit(plan)) {
      alert(`You currently have ${staffCount} staff. The ${plan.name} plan allows ${plan.limit === Infinity ? "unlimited" : plan.limit}. Please remove staff first, or choose a larger plan.`);
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

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;

  const isActive = shop.subscription_status === "active";
  const currentPlan = shop.plan || "shop";
  const selectedPlanObj = PLANS.find((p) => p.id === currentPlan) || PLANS[1];
  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const navyBtn = "rounded-xl bg-[#13294b] font-semibold text-white shadow-sm transition enabled:hover:bg-[#1d3a63] disabled:opacity-40";

  const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{isActive ? "Your plan" : "Choose your plan"}</h1>
            <p className="text-sm text-slate-500">{shop.name} · {staffCount} staff in use</p>
          </div>
          <a href="/dashboard" className="text-sm font-medium text-[#13294b] hover:underline">← Dashboard</a>
        </div>

        {!isActive && (
          <div className="mt-4 rounded-2xl bg-[#13294b]/5 p-4 text-sm text-slate-700 ring-1 ring-[#13294b]/15">
            <span className="font-semibold text-slate-900">You're on a free trial{daysLeft ? ` — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}.</span> Pick the plan you want — you won't be charged. Your trial runs on that plan's staff limit, and you can subscribe whenever you're ready.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.id;
            const blocked = overLimit(p);
            return (
              <div key={p.id} className={`relative flex flex-col p-5 ${card} ${p.popular ? "ring-2 ring-[#13294b]" : ""}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#13294b] px-3 py-0.5 text-xs font-bold text-white shadow">Most popular</div>}
                <div className="font-display text-xl font-semibold">{p.name}</div>
                <div className="mt-1 flex items-end gap-1"><span className="font-display text-3xl font-bold text-[#13294b]">{p.price}</span><span className="mb-1 text-sm text-slate-500">/mo</span></div>
                <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-700">
                  {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-[#13294b]">✓</span>{f}</li>))}
                </ul>

                {isActive ? (
                  isCurrent ? (
                    <div className="mt-4 rounded-xl bg-slate-100 py-2.5 text-center text-sm font-semibold text-[#13294b] ring-1 ring-slate-200">Current plan</div>
                  ) : (
                    <button onClick={() => subscribePaid(p.id)} disabled={busy === p.id || blocked} className={`mt-4 py-2.5 ${navyBtn}`}>{busy === p.id ? "Opening…" : blocked ? "Remove staff first" : "Switch to this plan"}</button>
                  )
                ) : (
                  isCurrent ? (
                    <div className="mt-4 rounded-xl bg-[#13294b]/10 py-2.5 text-center text-sm font-semibold text-[#13294b] ring-1 ring-[#13294b]/20">✓ Your trial plan</div>
                  ) : (
                    <button onClick={() => chooseFree(p.id)} disabled={saving === p.id || blocked} className={`mt-4 py-2.5 ${navyBtn}`}>{saving === p.id ? "Saving…" : blocked ? "Remove staff first" : "Choose this plan"}</button>
                  )
                )}
              </div>
            );
          })}
        </div>

        {!isActive && (
          <div className={`mt-6 flex flex-col items-center gap-2 p-5 text-center ${card}`}>
            <div className="font-display text-lg font-semibold">Ready to subscribe?</div>
            <p className="max-w-md text-sm text-slate-600">You won't be charged during your free trial. When you subscribe, you'll be billed {selectedPlanObj.price}/mo for the {selectedPlanObj.name} plan.</p>
            <button onClick={() => subscribePaid(currentPlan)} disabled={busy === currentPlan} className={`mt-1 px-6 py-3 ${navyBtn}`}>{busy === currentPlan ? "Opening…" : `Subscribe — ${selectedPlanObj.price}/mo`}</button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">All plans include everything: booking page, deposits, reminders, reviews, and rebooking. Cancel anytime.</p>
      </div>
    </div>
  );
}