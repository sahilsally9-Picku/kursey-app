"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Settings() {
  const [checking, setChecking] = useState(true);
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mins, setMins] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setChecking(false);
      loadServices();
    }
    init();
  }, [router]);

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.log("load error:", error); return; }
    console.log("loaded services:", data);
    setServices(data || []);
  }

  async function addService() {
    if (!name || !price) return;
    setSaving(true);
    const { error } = await supabase.from("services").insert({
      name: name,
      price: parseInt(price),
      mins: mins ? parseInt(mins) : 30,
    });
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    setName(""); setPrice(""); setMins("");
    await loadServices();
  }

  async function deleteService(id) {
    await supabase.from("services").delete().eq("id", id);
    await loadServices();
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;
  }

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your services</h1>
          <a href="/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">← Dashboard</a>
        </div>
        <p className="mt-1 text-sm text-stone-500">These show on your booking page.</p>

        {/* add form */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name (e.g. Skin Fade)" className={input} />
            <div className="flex gap-2">
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price $" type="number" className={input} />
              <input value={mins} onChange={(e) => setMins(e.target.value)} placeholder="Minutes" type="number" className={input} />
            </div>
          </div>
          <button disabled={!name || !price || saving} onClick={addService}
            className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">
            {saving ? "Adding…" : "Add service"}
          </button>
        </div>

        {/* list */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Current services ({services.length})</h2>
        {services.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">No services yet. Add your first one above.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-stone-200">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-stone-500">{s.mins} min</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">${s.price}</span>
                  <button onClick={() => deleteService(s.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}