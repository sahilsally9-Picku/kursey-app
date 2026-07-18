"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("ready"); // ready | saving | done | error
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // when the user lands here from the email link, Supabase sets a recovery session
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // also check if a session already exists (link already processed)
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    setErr("");
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setStatus("error"); setErr(error.message); return; }
    setStatus("done");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">K</div>
        <h1 className="text-xl font-bold text-stone-900">Set a new password</h1>
        {status === "done" ? (
          <p className="mt-2 text-sm text-emerald-700">Password updated! Taking you to login…</p>
        ) : !ready ? (
          <p className="mt-2 text-sm text-stone-500">Open this page from the reset link in your email. If you did and still see this, the link may have expired — request a new one.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-500">Enter your new password below.</p>
            <div className="space-y-2">
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6)" type="password" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" type="password" className="w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500" />
            </div>
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button disabled={status === "saving" || !password || !confirm} onClick={save} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{status === "saving" ? "Saving…" : "Update password"}</button>
          </>
        )}
      </div>
    </div>
  );
}