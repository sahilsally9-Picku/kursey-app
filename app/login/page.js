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
    setLoading(true);
    setError("");
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setResetting(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  const input = "w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-white/20 placeholder:text-stone-400 focus:ring-amber-500";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/10 p-7 shadow-2xl ring-1 ring-white/15 backdrop-blur-md">
        <img src="/logo.png" alt="Kursey" className="mb-5 h-12 w-auto rounded-xl" />

        {mode === "forgot" ? (
          <>
            <h1 className="text-xl font-bold text-white">Reset password</h1>
            {resetSent ? (
              <p className="mt-3 text-sm text-amber-300">Check your email for a reset link. (It may take a minute, and could land in spam.)</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-stone-300">Enter your email and we'll send a reset link.</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
                {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
                <button disabled={resetting || !email} onClick={sendReset}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-lg transition enabled:hover:from-amber-700 enabled:hover:to-amber-600 disabled:opacity-40">
                  {resetting ? "Sending…" : "Send reset link"}
                </button>
              </>
            )}
            <button onClick={() => { setMode("login"); setResetSent(false); setError(""); }} className="mt-4 block w-full text-center text-sm text-stone-300 hover:text-white hover:underline">← Back to login</button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">Log in</h1>
            <p className="mb-4 text-sm text-stone-300">Owners and barbers sign in here.</p>

            <div className="space-y-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={input} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className={input} />
            </div>

            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

            <button disabled={loading || !email || !password} onClick={handleLogin}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-lg transition enabled:hover:from-amber-700 enabled:hover:to-amber-600 disabled:opacity-40">
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button onClick={() => { setMode("forgot"); setResetSent(false); setError(""); }} className="mt-3 block w-full text-center text-sm text-amber-400 hover:underline">Forgot password?</button>
            <p className="mt-3 text-center text-sm text-stone-300">
              New here? <a href="/signup" className="font-medium text-amber-400 hover:underline">Create your shop</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}