"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setError(error.message); return; }

    const userId = signInData.user.id;
    // is this user a barber? (linked staff row)
    const { data: staffRow } = await supabase.from("staff").select("id").eq("user_id", userId).limit(1).single();
    setLoading(false);
    if (staffRow) { router.push("/barber"); }
    else { router.push("/dashboard"); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">K</div>
        <h1 className="text-xl font-bold text-stone-900">Log in</h1>
        <p className="mb-4 text-sm text-stone-500">Owners and barbers sign in here.</p>

        <div className="space-y-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button disabled={loading || !email || !password} onClick={handleLogin}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}