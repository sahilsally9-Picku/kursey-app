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

  // turn "Fade & Co" into "fade-co" as they type the shop name
  function onShopName(v) {
    setShopName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  }

  async function handleSignup() {
    setError("");
    if (!shopName || !slug || !email || !password) { setError("Please fill everything in."); return; }
    setLoading(true);

    // 1. create the user account
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) { setLoading(false); setError(signUpErr.message); return; }

    // 2. make sure we have a session (log them in)
    let userId = signUpData.user?.id;
    if (!signUpData.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setLoading(false); setError("Account made, but couldn't sign in: " + signInErr.message); return; }
      userId = signInData.user?.id;
    }

    // 3. create their shop
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

    // 4. done → go to their dashboard
    router.push("/dashboard");
  }

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">K</div>
        <h1 className="text-xl font-bold text-stone-900">Start your shop on Kursey</h1>
        <p className="mb-4 text-sm text-stone-500">Create your account and booking page.</p>

        <div className="space-y-2">
          <input value={shopName} onChange={(e) => onShopName(e.target.value)} placeholder="Shop name (e.g. Fade & Co)" className={input} />
          <div>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="link-name" className={input} />
            <p className="mt-1 text-xs text-stone-400">Your booking link: kursey.com/{slug || "your-shop"}</p>
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" className={input} />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button disabled={loading} onClick={handleSignup}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
          {loading ? "Creating…" : "Create my shop"}
        </button>

        <p className="mt-3 text-center text-sm text-stone-500">
          Already have a shop? <a href="/login" className="font-medium text-emerald-700 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}