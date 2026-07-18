"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true); setError("");
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setError(error.message); return; }
    const userId = signInData.user.id;
    const { data: staffRow } = await supabase.from("staff").select("id").eq("user_id", userId).limit(1).single();
    setLoading(false);
    if (staffRow) { router.push("/barber"); }
    else { router.push("/dashboard"); }
  }

  async function sendReset() {
    if (!email) { setError("Enter your email first."); return; }
    setResetting(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">K</div>

        {mode === "login" ? (
          <>
            <h1 className="text-xl font-bold text-stone-900">Log in</h1>
            <p className="mb-4 text-sm text-stone-500">Owners and barbers sign in here.</p>
            <div className="space-y-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button disabled={loading || !email || !password} onClick={handleLogin} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{loading ? "Signing in..." : "Sign in"}</button>
            <button onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }} className="mt-3 block w-full text-center text-sm text-emerald-700 hover:underline">Forgot password?</button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-stone-900">Reset password</h1>
            {resetSent ? (
              <p className="mt-2 text-sm text-emerald-700">Check your email for a reset link. (It may take a minute, and could land in spam.)</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-stone-500">Enter your email and we'll send a reset link.</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <button disabled={resetting || !email} onClick={sendReset} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{resetting ? "Sending…" : "Send reset link"}</button>
              </>
            )}
            <button onClick={() => { setMode("login"); setError(""); }} className="mt-3 block w-full text-center text-sm text-stone-500 hover:underline">← Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}