"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
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
      owner_id: userId, name: shopName, slug: slug,
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

  const input = "w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-white/20 placeholder:text-stone-400 focus:ring-amber-500";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white/10 p-7 shadow-2xl ring-1 ring-white/15 backdrop-blur-md">
        <img src="/logo.png" alt="Kursey" className="mb-5 h-12 w-auto rounded-xl" />
        <h1 className="text-xl font-bold text-white">Start your shop on Kursey</h1>
        <p className="mb-5 text-sm text-stone-300">Create your account and booking page.</p>

        <div className="space-y-2">
          <input value={shopName} onChange={(e) => onShopName(e.target.value)} placeholder="Shop name (e.g. Fade & Co)" className={input} />
          <div>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="link-name" className={input} />
            <p className="mt-1 text-xs text-stone-300">Your booking link: kursey.com/{slug || "your-shop"}</p>
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" className={input} />
        </div>

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <button disabled={loading} onClick={handleSignup}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-lg transition enabled:hover:from-amber-700 enabled:hover:to-amber-600 disabled:opacity-40">
          {loading ? "Creating…" : "Create my shop"}
        </button>

        <p className="mt-4 text-center text-sm text-stone-300">
          Already have a shop? <a href="/login" className="font-medium text-amber-400 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}