"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const BUSINESS_TYPES = [
  { value: "barbershop", label: "Barbershop" },
  { value: "salon", label: "Hair / beauty salon" },
  { value: "nails", label: "Nail salon" },
  { value: "waxing", label: "Waxing studio" },
  { value: "petgrooming", label: "Pet grooming" },
  { value: "other", label: "Other appointment business" },
];

export default function Signup() {
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessType, setBusinessType] = useState("barbershop");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function onShopName(v) {
    setShopName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  }

  async function handleSignup() {
    setError("");
    if (!shopName || !slug || !email || !password) { setError("Please fill everything in."); return; }
    setLoading(true);

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) { setLoading(false); setError(signUpErr.message); return; }

    let userId = signUpData.user?.id;
    if (!signUpData.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setLoading(false); setError("Account made, but couldn't sign in: " + signInErr.message); return; }
      userId = signInData.user?.id;
    }

    const { error: shopErr } = await supabase.from("shops").insert({
      owner_id: userId, name: shopName, slug: slug, business_type: businessType,
    });
    setLoading(false);
    if (shopErr) {
      if (shopErr.message.includes("duplicate") || shopErr.code === "23505") {
        setError("That link name is taken — try another.");
      } else {
        setError(shopErr.message);
      }
      return;
    }

    router.replace("/plan");
  }

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <img src="/logo.png" alt="Kursey" className="mb-5 h-10 w-auto" />
        <h1 className="text-xl font-bold text-slate-900">Start your business on Kursey</h1>
        <p className="mb-5 text-sm text-slate-500">Create your account and booking page.</p>

        <div className="space-y-2">
          <input value={shopName} onChange={(e) => onShopName(e.target.value)} placeholder="Business name (e.g. Fade & Co)" className={input} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">What kind of business?</label>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={input}>
              {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="link-name" className={input} />
            <p className="mt-1 text-xs text-slate-500">Your booking link: kursey.com/{slug || "your-shop"}</p>
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" className={input} />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button disabled={loading} onClick={handleSignup} className="mt-5 w-full rounded-xl bg-[#13294b] py-3 font-semibold text-white transition enabled:hover:bg-[#1d3a63] disabled:opacity-40">
          {loading ? "Creating…" : "Create my business"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have a shop? <a href="/login" className="font-medium text-[#13294b] hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}