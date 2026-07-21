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
    if (staffRow) { router.replace("/barber"); }
    else { router.replace("/dashboard"); }
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

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";
  const navyBtn = "w-full rounded-xl bg-[#13294b] py-3 font-semibold text-white transition enabled:hover:bg-[#1d3a63] disabled:opacity-40";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <img src="/logo.png" alt="Kursey" className="mb-5 h-10 w-auto" />

        {mode === "login" ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Log in</h1>
            <p className="mb-5 text-sm text-slate-500">Owners and staff sign in here.</p>
            <div className="space-y-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className={input} />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button disabled={loading || !email || !password} onClick={handleLogin} className={`mt-4 ${navyBtn}`}>{loading ? "Signing in…" : "Sign in"}</button>
            <button onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }} className="mt-3 block w-full text-center text-sm font-medium text-[#13294b] hover:underline">Forgot password?</button>
            <p className="mt-5 text-center text-sm text-slate-500">New here? <a href="/signup" className="font-medium text-[#13294b] hover:underline">Create your shop</a></p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
            {resetSent ? (
              <p className="mt-2 text-sm text-[#13294b]">Check your email for a reset link. (It may take a minute, and could land in spam.)</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-500">Enter your email and we'll send a reset link.</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <button disabled={resetting || !email} onClick={sendReset} className={`mt-4 ${navyBtn}`}>{resetting ? "Sending…" : "Send reset link"}</button>
              </>
            )}
            <button onClick={() => { setMode("login"); setError(""); }} className="mt-3 block w-full text-center text-sm text-slate-500 hover:underline">← Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}