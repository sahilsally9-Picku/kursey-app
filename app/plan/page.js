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
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("shop");
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.replace("/signup"); return; }
      setShop(shopData);
      setSelected(shopData.plan || "shop");
      const { count } = await supabase.from("staff").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id);
      setStaffCount(count || 0);
      setChecking(false);
    }
    init();
  }, [router]);

  function overLimit(plan) { return staffCount > plan.limit; }

  // Clicking a card only highlights it. During the trial we quietly remember the
  // choice on the shop row (so trial staff limits still work) — no redirect.
  async function pickPlan(planId) {
    setSelected(planId);
    if (!shop) return;
    if (shop.subscription_status === "active") return;
    const plan = PLANS.find((p) => p.id === planId);
    if (overLimit(plan)) return;
    if (shop.plan === planId) return;
    const { error } = await supabase.from("shops").update({ plan: planId }).eq("id", shop.id);
    if (!error) setShop({ ...shop, plan: planId });
  }

  async function subscribePaid(planId) {
    const plan = PLANS.find((p) => p.id === planId);
    if (overLimit(plan)) {
      alert(`You currently have ${staffCount} staff. The ${plan.name} plan allows ${plan.limit === Infinity ? "unlimited" : plan.limit}. Please remove staff first, or choose a larger plan.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, origin: window.location.origin, plan: planId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Couldn't start checkout: " + (data.error || "unknown")); setBusy(false); }
    } catch (err) { alert("Error: " + err.message); setBusy(false); }
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;

  const isActive = shop.subscription_status === "active";
  const activePlan = shop.plan || "shop";
  const selectedObj = PLANS.find((p) => p.id === selected) || PLANS[1];
  const blocked = overLimit(selectedObj);
  const sameAsActive = isActive && activePlan === selected;

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
            <span className="font-semibold text-slate-900">You're on a free trial{daysLeft ? ` — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}.</span> Tap a plan to select it — you won't be charged. Your trial runs on that plan's staff limit, and you can subscribe whenever you're ready.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => {
            const isSelected = selected === p.id;
            const isCurrent = isActive && activePlan === p.id;
            const cardBlocked = overLimit(p);
            const ring = isSelected ? "ring-2 ring-[#13294b]" : p.popular ? "ring-1 ring-[#13294b]/25" : "";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPlan(p.id)}
                className={`relative flex flex-col p-5 text-left transition ${card} ${ring} ${isSelected ? "" : "hover:shadow-md"}`}
              >
                {p.popular && !isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#13294b] px-3 py-0.5 text-xs font-bold text-white shadow">Most popular</div>}
                {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#13294b] px-3 py-0.5 text-xs font-bold text-white shadow">✓ Selected</div>}

                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-semibold">{p.name}</span>
                  {isCurrent && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">Current</span>}
                </div>

                <div className="mt-1 flex items-end gap-1"><span className="font-display text-3xl font-bold text-[#13294b]">{p.price}</span><span className="mb-1 text-sm text-slate-500">/mo</span></div>
                <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-700">
                  {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-[#13294b]">✓</span>{f}</li>))}
                </ul>

                {cardBlocked && <div className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">Too small for your {staffCount} staff</div>}
              </button>
            );
          })}
        </div>

        <div className={`mt-6 flex flex-col items-center gap-2 p-5 text-center ${card}`}>
          {sameAsActive ? (
            <>
              <div className="font-display text-lg font-semibold">You're subscribed to {selectedObj.name}</div>
              <p className="max-w-md text-sm text-slate-600">You're being billed {selectedObj.price}/mo. Pick a different plan above if you'd like to switch.</p>
            </>
          ) : (
            <>
              <div className="font-display text-lg font-semibold">{isActive ? `Switch to ${selectedObj.name}?` : "Ready to subscribe?"}</div>
              <p className="max-w-md text-sm text-slate-600">
                {isActive
                  ? `You'll be billed ${selectedObj.price}/mo for the ${selectedObj.name} plan from your next billing date.`
                  : `You won't be charged during your free trial. When you subscribe, you'll be billed ${selectedObj.price}/mo for the ${selectedObj.name} plan.`}
              </p>
              <button
                onClick={() => subscribePaid(selected)}
                disabled={busy || blocked}
                className={`mt-1 px-6 py-3 ${navyBtn}`}
              >
                {busy ? "Opening…" : blocked ? "Remove staff first" : isActive ? `Switch to ${selectedObj.name} — ${selectedObj.price}/mo` : `Subscribe to ${selectedObj.name} — ${selectedObj.price}/mo`}
              </button>

              {!isActive && daysLeft > 0 && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="mt-1 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-800"
                >
                  Skip for now — keep my {daysLeft} day{daysLeft === 1 ? "" : "s"} free
                </button>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">All plans include everything: booking page, deposits, reminders, reviews, and rebooking. Cancel anytime.</p>
      </div>
    </div>
  );
}