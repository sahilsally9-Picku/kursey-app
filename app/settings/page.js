"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const colors = [
  { label: "Green", value: "bg-emerald-700" },
  { label: "Amber", value: "bg-amber-600" },
  { label: "Stone", value: "bg-stone-700" },
  { label: "Blue", value: "bg-blue-700" },
  { label: "Rose", value: "bg-rose-600" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = [];
for (let h = 0; h < 24; h++) for (let m of [0, 30]) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

export default function Settings() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const router = useRouter();

  const [services, setServices] = useState([]);
  const [sName, setSName] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sMins, setSMins] = useState("");
  const [editServiceId, setEditServiceId] = useState(null);

  const [staff, setStaff] = useState([]);
  const [stName, setStName] = useState("");
  const [stSpecialty, setStSpecialty] = useState("");
  const [stColor, setStColor] = useState("bg-emerald-700");
  const [stDays, setStDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [stStart, setStStart] = useState("09:00");
  const [stEnd, setStEnd] = useState("17:00");
  const [stBreaks, setStBreaks] = useState([]);
  const [brStart, setBrStart] = useState("13:00");
  const [brEnd, setBrEnd] = useState("14:00");
  const [editStaffId, setEditStaffId] = useState(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // find THIS owner's shop
      const { data: shopData } = await supabase
        .from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData);
      setChecking(false);
      loadServices(shopData.id);
      loadStaff(shopData.id);
    }
    init();
  }, [router]);

  async function loadServices(shopId) {
    const { data } = await supabase.from("services").select("*").eq("shop_id", shopId).order("created_at", { ascending: true });
    setServices(data || []);
  }
  async function loadStaff(shopId) {
    const { data } = await supabase.from("staff").select("*").eq("shop_id", shopId).order("created_at", { ascending: true });
    setStaff(data || []);
  }

  function resetServiceForm() { setSName(""); setSPrice(""); setSMins(""); setEditServiceId(null); }
  function startEditService(s) { setEditServiceId(s.id); setSName(s.name); setSPrice(String(s.price)); setSMins(String(s.mins || "")); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function saveService() {
    if (!sName || !sPrice) return;
    const payload = { name: sName, price: parseInt(sPrice), mins: sMins ? parseInt(sMins) : 30, shop_id: shop.id };
    const { error } = editServiceId
      ? await supabase.from("services").update(payload).eq("id", editServiceId)
      : await supabase.from("services").insert(payload);
    if (error) { alert("Error: " + error.message); return; }
    resetServiceForm(); loadServices(shop.id);
  }
  async function deleteService(id) { await supabase.from("services").delete().eq("id", id); if (editServiceId === id) resetServiceForm(); loadServices(shop.id); }

  function resetStaffForm() {
    setStName(""); setStSpecialty(""); setStColor("bg-emerald-700");
    setStDays(["Mon", "Tue", "Wed", "Thu", "Fri"]); setStStart("09:00"); setStEnd("17:00");
    setStBreaks([]); setBrStart("13:00"); setBrEnd("14:00"); setEditStaffId(null);
  }
  function startEditStaff(st) {
    setEditStaffId(st.id); setStName(st.name); setStSpecialty(st.specialty || "");
    setStColor(st.color || "bg-emerald-700"); setStDays(st.work_days || []);
    setStStart(st.start_time || "09:00"); setStEnd(st.end_time || "17:00"); setStBreaks(st.breaks || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleDay(day) { setStDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]); }
  function addBreakToForm() { if (brStart >= brEnd) { alert("Break end must be after start."); return; } setStBreaks((prev) => [...prev, `${brStart}-${brEnd}`]); }
  function removeBreakFromForm(i) { setStBreaks((prev) => prev.filter((_, idx) => idx !== i)); }
  async function saveStaff() {
    if (!stName || stDays.length === 0) { alert("Add a name and at least one working day."); return; }
    const payload = { name: stName, specialty: stSpecialty, color: stColor, work_days: stDays, start_time: stStart, end_time: stEnd, breaks: stBreaks, shop_id: shop.id };
    const { error } = editStaffId
      ? await supabase.from("staff").update(payload).eq("id", editStaffId)
      : await supabase.from("staff").insert(payload);
    if (error) { alert("Error: " + error.message); return; }
    resetStaffForm(); loadStaff(shop.id);
  }
  async function deleteStaff(id) { await supabase.from("staff").delete().eq("id", id); if (editStaffId === id) resetStaffForm(); loadStaff(shop.id); }

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-emerald-500";
  const select = "rounded-xl bg-white px-3 py-3 text-sm text-stone-900 outline-none ring-1 ring-stone-300 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-stone-500">{shop.name} · kursey.com/{shop.slug}</p>
          </div>
          <a href="/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">← Dashboard</a>
        </div>

        {/* SERVICES */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Services ({services.length})</h2>
        <div className={`rounded-2xl bg-white p-4 ring-1 ${editServiceId ? "ring-emerald-400" : "ring-stone-200"}`}>
          {editServiceId && <p className="mb-2 text-sm font-medium text-emerald-700">Editing service…</p>}
          <div className="space-y-2">
            <input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Service name (e.g. Skin Fade)" className={input} />
            <div className="flex gap-2">
              <input value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="Price $" type="number" className={input} />
              <input value={sMins} onChange={(e) => setSMins(e.target.value)} placeholder="Minutes" type="number" className={input} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={!sName || !sPrice} onClick={saveService} className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{editServiceId ? "Save changes" : "Add service"}</button>
            {editServiceId && <button onClick={resetServiceForm} className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-medium text-stone-700">Cancel</button>}
          </div>
        </div>
        {services.length > 0 && (
          <div className="mt-2 space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-stone-200">
                <div><div className="font-medium">{s.name}</div><div className="text-sm text-stone-500">{s.mins} min · ${s.price}</div></div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditService(s)} className="text-sm text-emerald-700 hover:underline">Edit</button>
                  <button onClick={() => deleteService(s.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STAFF */}
        <h2 className="mt-8 mb-2 text-lg font-semibold">Barbers / staff ({staff.length})</h2>
        <div className={`rounded-2xl bg-white p-4 ring-1 ${editStaffId ? "ring-emerald-400" : "ring-stone-200"}`}>
          {editStaffId && <p className="mb-2 text-sm font-medium text-emerald-700">Editing barber…</p>}
          <div className="space-y-2">
            <input value={stName} onChange={(e) => setStName(e.target.value)} placeholder="Name (e.g. Marcus)" className={input} />
            <input value={stSpecialty} onChange={(e) => setStSpecialty(e.target.value)} placeholder="Specialty (e.g. Skin fades)" className={input} />
            <div className="pt-1">
              <div className="mb-1 text-xs font-medium text-stone-500">Working days</div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (<button key={d} onClick={() => toggleDay(d)} className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${stDays.includes(d) ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-600 ring-stone-300"}`}>{d}</button>))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1"><div className="mb-1 text-xs font-medium text-stone-500">Start</div><select value={stStart} onChange={(e) => setStStart(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="flex-1"><div className="mb-1 text-xs font-medium text-stone-500">End</div><select value={stEnd} onChange={(e) => setStEnd(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div className="pt-1">
              <div className="mb-1 text-xs font-medium text-stone-500">Breaks (optional)</div>
              <div className="flex items-end gap-2">
                <div className="flex-1"><select value={brStart} onChange={(e) => setBrStart(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <span className="pb-3 text-stone-400">–</span>
                <div className="flex-1"><select value={brEnd} onChange={(e) => setBrEnd(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <button onClick={addBreakToForm} className="mb-0.5 rounded-xl bg-stone-800 px-3 py-3 text-sm font-semibold text-white">+ Break</button>
              </div>
              {stBreaks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {stBreaks.map((b, i) => (<span key={i} className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-200">{b}<button onClick={() => removeBreakFromForm(i)} className="text-amber-600 hover:text-amber-900">✕</button></span>))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {colors.map((c) => (<button key={c.value} onClick={() => setStColor(c.value)} className={`h-8 w-8 rounded-full ${c.value} ${stColor === c.value ? "ring-2 ring-offset-2 ring-stone-900" : ""}`} title={c.label} />))}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={!stName} onClick={saveStaff} className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-40">{editStaffId ? "Save changes" : "Add barber"}</button>
            {editStaffId && <button onClick={resetStaffForm} className="rounded-xl bg-stone-200 px-4 py-3 text-sm font-medium text-stone-700">Cancel</button>}
          </div>
        </div>
        {staff.length > 0 && (
          <div className="mt-2 space-y-2">
            {staff.map((st) => (
              <div key={st.id} className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-stone-200">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-full ${st.color || "bg-emerald-700"} font-semibold text-white`}>{st.name[0]}</div>
                  <div>
                    <div className="font-medium">{st.name}</div>
                    <div className="text-xs text-stone-500">{(st.work_days || []).join(", ")} · {st.start_time}–{st.end_time}</div>
                    {(st.breaks || []).length > 0 && <div className="text-xs text-amber-700">Breaks: {(st.breaks || []).join(", ")}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditStaff(st)} className="text-sm text-emerald-700 hover:underline">Edit</button>
                  <button onClick={() => deleteStaff(st.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}