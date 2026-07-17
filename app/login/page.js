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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">K</div>
        <h1 className="text-xl font-bold text-stone-900">Owner login</h1>
        <p className="mb-4 text-sm text-stone-500">Sign in to see your bookings.</p>

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