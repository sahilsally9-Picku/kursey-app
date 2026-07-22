"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

const colors = [
  { label: "Navy", value: "bg-[#13294b]" }, { label: "Slate", value: "bg-slate-500" },
  { label: "Stone", value: "bg-slate-200" }, { label: "Blue", value: "bg-blue-700" }, { label: "Rose", value: "bg-rose-600" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = [];
for (let h = 0; h < 24; h++) for (let m of [0, 30]) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

function SettingsInner() {
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingWork, setUploadingWork] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [depAmount, setDepAmount] = useState(10);
  const [savingDep, setSavingDep] = useState(false);
  const [depSaved, setDepSaved] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bName, setBName] = useState(""); const [bDesc, setBDesc] = useState("");
  const [bAddress, setBAddress] = useState(""); const [bPhone, setBPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false); const [infoSaved, setInfoSaved] = useState(false);

  const [services, setServices] = useState([]);
  const [sName, setSName] = useState(""); const [sPrice, setSPrice] = useState(""); const [sMins, setSMins] = useState(""); const [sDesc, setSDesc] = useState("");
  const [editServiceId, setEditServiceId] = useState(null);

  const [staff, setStaff] = useState([]);
  const [stName, setStName] = useState(""); const [stSpecialty, setStSpecialty] = useState("");
  const [stBio, setStBio] = useState(""); const [stPhoto, setStPhoto] = useState(""); const [stWork, setStWork] = useState([]);
  const [stColor, setStColor] = useState("bg-[#13294b]");
  const [stDays, setStDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [stStart, setStStart] = useState("09:00"); const [stEnd, setStEnd] = useState("17:00");
  const [stBreaks, setStBreaks] = useState([]); const [brStart, setBrStart] = useState("13:00"); const [brEnd, setBrEnd] = useState("14:00");
  const [editStaffId, setEditStaffId] = useState(null);

  const [loginFor, setLoginFor] = useState(null);
  const [loginEmail, setLoginEmail] = useState(""); const [loginPass, setLoginPass] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).single();
      if (!shopData) { router.push("/signup"); return; }
      setShop(shopData);
      setBName(shopData.name || ""); setBDesc(shopData.description || ""); setBAddress(shopData.address || ""); setBPhone(shopData.phone || "");
      setDepAmount(shopData.deposit_amount || 10);
      setChecking(false);
      loadServices(shopData.id); loadStaff(shopData.id);
    }
    init();
  }, [router]);

  async function loadServices(id) { const { data } = await supabase.from("services").select("*").eq("shop_id", id).order("created_at", { ascending: true }); setServices(data || []); }
  async function loadStaff(id) { const { data } = await supabase.from("staff").select("*").eq("shop_id", id).order("created_at", { ascending: true }); setStaff(data || []); }

  async function uploadImage(file, folder) {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${shop.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
  }

  async function connectStripe() {
    setConnecting(true);
    try {
      const res = await fetch("/api/connect-stripe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopId: shop.id, origin: window.location.origin }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert("Couldn't start Stripe connect: " + (data.error || "unknown error")); setConnecting(false); }
    } catch (err) { alert("Error: " + err.message); setConnecting(false); }
  }

  async function toggleDeposits() {
    const newVal = !shop.deposits_enabled;
    await supabase.from("shops").update({ deposits_enabled: newVal }).eq("id", shop.id);
    setShop({ ...shop, deposits_enabled: newVal });
  }
  async function saveDeposit() {
    setSavingDep(true); setDepSaved(false);
    await supabase.from("shops").update({ deposit_amount: parseInt(depAmount) || 0 }).eq("id", shop.id);
    setShop({ ...shop, deposit_amount: parseInt(depAmount) || 0 });
    setSavingDep(false); setDepSaved(true); setTimeout(() => setDepSaved(false), 2000);
  }

  async function saveInfo() {
    if (!bName) { alert("Business name can't be empty."); return; }
    setSavingInfo(true); setInfoSaved(false);
    const { error } = await supabase.from("shops").update({ name: bName, description: bDesc, address: bAddress, phone: bPhone }).eq("id", shop.id);
    setSavingInfo(false);
    if (error) { alert("Error: " + error.message); return; }
    setShop({ ...shop, name: bName, description: bDesc, address: bAddress, phone: bPhone });
    setInfoSaved(true); setTimeout(() => setInfoSaved(false), 2000);
  }

  async function uploadLogo(file) { if (!file) return; setUploadingLogo(true); try { const url = await uploadImage(file, "logos"); await supabase.from("shops").update({ logo_url: url }).eq("id", shop.id); setShop({ ...shop, logo_url: url }); } catch (err) { alert("Logo upload failed: " + err.message); } setUploadingLogo(false); }
  async function removeLogo() { await supabase.from("shops").update({ logo_url: null }).eq("id", shop.id); setShop({ ...shop, logo_url: null }); }
  async function uploadStaffPhoto(file) { if (!file) return; setUploadingPhoto(true); try { const url = await uploadImage(file, "barbers"); setStPhoto(url); } catch (err) { alert("Photo upload failed: " + err.message); } setUploadingPhoto(false); }
  async function uploadWorkPhoto(file) { if (!file) return; setUploadingWork(true); try { const url = await uploadImage(file, "work"); setStWork((prev) => [...prev, url]); } catch (err) { alert("Work photo upload failed: " + err.message); } setUploadingWork(false); }
  function removeWorkPhoto(i) { setStWork((prev) => prev.filter((_, idx) => idx !== i)); }

  function resetServiceForm() { setSName(""); setSPrice(""); setSMins(""); setSDesc(""); setEditServiceId(null); }
  function startEditService(s) { setEditServiceId(s.id); setSName(s.name); setSPrice(String(s.price)); setSMins(String(s.mins || "")); setSDesc(s.description || ""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function saveService() {
    if (!sName || !sPrice) return;
    const payload = { name: sName, price: parseInt(sPrice), mins: sMins ? parseInt(sMins) : 30, description: sDesc, shop_id: shop.id };
    const { error } = editServiceId ? await supabase.from("services").update(payload).eq("id", editServiceId) : await supabase.from("services").insert(payload);
    if (error) { alert("Error: " + error.message); return; }
    resetServiceForm(); loadServices(shop.id);
  }
  async function deleteService(id) { await supabase.from("services").delete().eq("id", id); if (editServiceId === id) resetServiceForm(); loadServices(shop.id); }

  function resetStaffForm() { setStName(""); setStSpecialty(""); setStBio(""); setStPhoto(""); setStWork([]); setStColor("bg-[#13294b]"); setStDays(["Mon", "Tue", "Wed", "Thu", "Fri"]); setStStart("09:00"); setStEnd("17:00"); setStBreaks([]); setBrStart("13:00"); setBrEnd("14:00"); setEditStaffId(null); }
  function startEditStaff(st) { setEditStaffId(st.id); setStName(st.name); setStSpecialty(st.specialty || ""); setStBio(st.bio || ""); setStPhoto(st.photo_url || ""); setStWork(st.work_photos || []); setStColor(st.color || "bg-[#13294b]"); setStDays(st.work_days || []); setStStart(st.start_time || "09:00"); setStEnd(st.end_time || "17:00"); setStBreaks(st.breaks || []); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function toggleDay(day) { setStDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]); }
  function addBreakToForm() { if (brStart >= brEnd) { alert("Break end must be after start."); return; } setStBreaks((prev) => [...prev, `${brStart}-${brEnd}`]); }
  function removeBreakFromForm(i) { setStBreaks((prev) => prev.filter((_, idx) => idx !== i)); }
  async function saveStaff() {
    if (!stName || stDays.length === 0) { alert("Add a name and at least one working day."); return; }
    const payload = { name: stName, specialty: stSpecialty, bio: stBio, photo_url: stPhoto || null, work_photos: stWork, color: stColor, work_days: stDays, start_time: stStart, end_time: stEnd, breaks: stBreaks, shop_id: shop.id };
    const { error } = editStaffId ? await supabase.from("staff").update(payload).eq("id", editStaffId) : await supabase.from("staff").insert(payload);
    if (error) { alert("Error: " + error.message); return; }
    resetStaffForm(); loadStaff(shop.id);
  }
  async function deleteStaff(id) { await supabase.from("staff").delete().eq("id", id); if (editStaffId === id) resetStaffForm(); loadStaff(shop.id); }

  function openLoginForm(st) { setLoginFor(st.id); setLoginEmail(st.login_email || ""); setLoginPass(""); }
  async function createBarberLogin() {
    if (!loginEmail || !loginPass) { alert("Enter an email and password."); return; }
    setCreatingLogin(true);
    try {
      const res = await fetch("/api/create-barber-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: loginFor, shopId: shop.id, email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (data.ok) { setLoginFor(null); setLoginEmail(""); setLoginPass(""); loadStaff(shop.id); alert("Staff login created! They can now log in at kursey.com/login with that email and password."); }
      else { alert("Couldn't create login: " + (data.error || "unknown")); }
    } catch (err) { alert("Error: " + err.message); }
    setCreatingLogin(false);
  }

  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  async function deleteAccount() {
    if (deleteText !== "DELETE") { alert('Type DELETE to confirm.'); return; }
    if (!confirm("This permanently deletes your shop, all bookings, staff, services, and your login. This cannot be undone. Continue?")) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setDeleting(false); alert("Couldn't delete: " + (data.error || "please try again")); return; }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) { setDeleting(false); alert("Error: " + err.message); }
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading…</div>;

  const input = "w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-[#13294b]";
  const select = "rounded-xl bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-300 focus:ring-2 focus:ring-[#13294b]";
  const card = "rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm";
  const navyBtn = "rounded-xl bg-[#13294b] font-semibold text-white shadow-sm transition enabled:hover:bg-[#1d3a63] disabled:opacity-40";
  const connected = !!shop.stripe_account_id;
  const justReturned = searchParams.get("stripe") === "done";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center justify-between">
          <div><h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1><p className="text-sm text-slate-600">{shop.name} · kursey.com/{shop.slug}</p></div>
          <a href="/dashboard" className="text-sm font-medium text-[#13294b] hover:underline">← Dashboard</a>
        </div>

        {/* PAYMENTS / DEPOSITS */}
        <h2 className="mt-6 mb-2 font-display text-xl font-semibold">Payments &amp; deposits</h2>
        <div className={`p-4 ${card}`}>
          {justReturned && <p className="mb-2 rounded-lg bg-[#13294b]/5 px-3 py-2 text-sm text-[#13294b] ring-1 ring-[#13294b]/20">Returned from Stripe. If setup is complete, you're ready to take deposits.</p>}
          {!connected ? (
            <>
              <p className="text-sm text-slate-600">Connect your Stripe to take deposits. Money goes straight to your account — Kursey never touches it.</p>
              <button onClick={connectStripe} disabled={connecting} className={`mt-3 px-5 py-3 ${navyBtn}`}>{connecting ? "Opening Stripe…" : "Connect Stripe"}</button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-[#13294b]">✓ Stripe connected</div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div><div className="font-medium">Require a deposit to book</div><div className="text-xs text-slate-500">Customers pay upfront to confirm.</div></div>
                <button onClick={toggleDeposits} className={`relative h-6 w-11 rounded-full transition ${shop.deposits_enabled ? "bg-[#13294b]" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${shop.deposits_enabled ? "left-[22px]" : "left-0.5"}`} /></button>
              </div>
              {shop.deposits_enabled && (<div className="mt-3 flex items-end gap-2"><div><div className="mb-1 text-xs font-medium text-slate-600">Deposit amount ($)</div><input value={depAmount} onChange={(e) => setDepAmount(e.target.value)} type="number" className={`${input} w-32`} /></div><button onClick={saveDeposit} disabled={savingDep} className={`px-4 py-3 text-sm ${navyBtn}`}>{savingDep ? "Saving…" : "Save"}</button>{depSaved && <span className="pb-3 text-sm font-medium text-[#13294b]">Saved ✓</span>}</div>)}
              <button onClick={connectStripe} className="mt-3 block text-xs text-slate-500 hover:underline">Re-open Stripe setup</button>
            </>
          )}
        </div>

        {/* BUSINESS INFO */}
        <h2 className="mt-8 mb-2 font-display text-xl font-semibold">Business info</h2>
        <div className={`p-4 ${card}`}>
          <div className="space-y-2"><input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Business name" className={input} /><textarea value={bDesc} onChange={(e) => setBDesc(e.target.value)} placeholder="Describe your business" rows={3} className={`${input} resize-none`} /><input value={bAddress} onChange={(e) => setBAddress(e.target.value)} placeholder="Address" className={input} /><input value={bPhone} onChange={(e) => setBPhone(e.target.value)} placeholder="Phone" className={input} /></div>
          <div className="mt-3 flex items-center gap-3"><button disabled={savingInfo || !bName} onClick={saveInfo} className={`px-5 py-3 ${navyBtn}`}>{savingInfo ? "Saving…" : "Save info"}</button>{infoSaved && <span className="text-sm font-medium text-[#13294b]">Saved ✓</span>}</div>
        </div>

        {/* LOGO */}
        <h2 className="mt-8 mb-2 font-display text-xl font-semibold">Shop logo</h2>
        <div className={`flex items-center gap-4 p-4 ${card}`}>
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#13294b] to-[#0e1f3a] text-2xl font-bold text-white">{shop.logo_url ? <img src={shop.logo_url} alt="logo" className="h-full w-full object-cover" /> : (shop.name[0] || "K")}</div>
          <div className="flex-1"><label className={`inline-block cursor-pointer px-4 py-2 text-sm ${navyBtn}`}>{uploadingLogo ? "Uploading…" : shop.logo_url ? "Replace logo" : "Upload logo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files[0])} disabled={uploadingLogo} /></label>{shop.logo_url && <button onClick={removeLogo} className="ml-3 text-sm text-red-600 hover:underline">Remove</button>}</div>
        </div>

        {/* SERVICES */}
        <h2 className="mt-8 mb-2 font-display text-xl font-semibold">Services ({services.length})</h2>
        <div className={`p-4 ${editServiceId ? "rounded-2xl bg-white ring-1 ring-[#13294b]/30 shadow-sm" : card}`}>
          {editServiceId && <p className="mb-2 text-sm font-medium text-[#13294b]">Editing service…</p>}
          <div className="space-y-2"><input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Service name" className={input} /><div className="flex gap-2"><input value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="Price $" type="number" className={input} /><input value={sMins} onChange={(e) => setSMins(e.target.value)} placeholder="Minutes" type="number" className={input} /></div><textarea value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Description (optional)" rows={2} className={`${input} resize-none`} /></div>
          <div className="mt-3 flex gap-2"><button disabled={!sName || !sPrice} onClick={saveService} className={`flex-1 py-3 ${navyBtn}`}>{editServiceId ? "Save changes" : "Add service"}</button>{editServiceId && <button onClick={resetServiceForm} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">Cancel</button>}</div>
        </div>
        {services.length > 0 && <div className="mt-2 space-y-2">{services.map((s) => (<div key={s.id} className={`flex items-start justify-between p-4 ${card}`}><div className="pr-3"><div className="font-medium">{s.name}</div><div className="text-sm text-slate-600">{s.mins} min · ${s.price}</div>{s.description && <div className="mt-0.5 font-display text-xs italic text-slate-500">{s.description}</div>}</div><div className="flex shrink-0 items-center gap-3"><button onClick={() => startEditService(s)} className="text-sm text-[#13294b] hover:underline">Edit</button><button onClick={() => deleteService(s.id)} className="text-sm text-red-600 hover:underline">Remove</button></div></div>))}</div>}

        {/* STAFF */}
        <h2 className="mt-8 mb-2 font-display text-xl font-semibold">Staff ({staff.length})</h2>
        <div className={`p-4 ${editStaffId ? "rounded-2xl bg-white ring-1 ring-[#13294b]/30 shadow-sm" : card}`}>
          {editStaffId && <p className="mb-2 text-sm font-medium text-[#13294b]">Editing staff member…</p>}
          <div className="space-y-2">
            <div className="flex items-center gap-3"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-xs text-slate-500">{stPhoto ? <img src={stPhoto} alt="" className="h-full w-full object-cover" /> : "Photo"}</div><label className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-300">{uploadingPhoto ? "Uploading…" : stPhoto ? "Change photo" : "Upload photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadStaffPhoto(e.target.files[0])} disabled={uploadingPhoto} /></label>{stPhoto && <button onClick={() => setStPhoto("")} className="text-sm text-red-600 hover:underline">Remove</button>}</div>
            <input value={stName} onChange={(e) => setStName(e.target.value)} placeholder="Name (e.g. Marcus)" className={input} />
            <input value={stSpecialty} onChange={(e) => setStSpecialty(e.target.value)} placeholder="Specialty" className={input} />
            <textarea value={stBio} onChange={(e) => setStBio(e.target.value)} placeholder="About this staff member" rows={3} className={`${input} resize-none`} />
            <div className="pt-1"><div className="mb-1 text-xs font-medium text-slate-600">Work photos</div><div className="flex flex-wrap gap-2">{stWork.map((url, i) => (<div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-slate-200"><img src={url} alt="" className="h-full w-full object-cover" /><button onClick={() => removeWorkPhoto(i)} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg bg-black/60 text-xs text-white">✕</button></div>))}<label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg bg-slate-50 text-2xl text-slate-500 ring-1 ring-dashed ring-slate-300 hover:bg-slate-100">{uploadingWork ? "…" : "+"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadWorkPhoto(e.target.files[0])} disabled={uploadingWork} /></label></div></div>
            <div className="pt-1"><div className="mb-1 text-xs font-medium text-slate-600">Working days</div><div className="flex flex-wrap gap-1.5">{DAYS.map((d) => (<button key={d} onClick={() => toggleDay(d)} className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${stDays.includes(d) ? "bg-[#13294b] text-white ring-[#13294b]" : "bg-slate-100 text-slate-700 ring-slate-300"}`}>{d}</button>))}</div></div>
            <div className="flex items-center gap-2 pt-1"><div className="flex-1"><div className="mb-1 text-xs font-medium text-slate-600">Start</div><select value={stStart} onChange={(e) => setStStart(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div><div className="flex-1"><div className="mb-1 text-xs font-medium text-slate-600">End</div><select value={stEnd} onChange={(e) => setStEnd(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div></div>
            <div className="pt-1"><div className="mb-1 text-xs font-medium text-slate-600">Breaks (optional)</div><div className="flex items-end gap-2"><div className="flex-1"><select value={brStart} onChange={(e) => setBrStart(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div><span className="pb-3 text-slate-500">–</span><div className="flex-1"><select value={brEnd} onChange={(e) => setBrEnd(e.target.value)} className={`${select} w-full`}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div><button onClick={addBreakToForm} className="mb-0.5 rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-300">+ Break</button></div>{stBreaks.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{stBreaks.map((b, i) => (<span key={i} className="flex items-center gap-1 rounded-full bg-[#13294b]/10 px-2 py-1 text-xs text-[#13294b] ring-1 ring-[#13294b]/20">{b}<button onClick={() => removeBreakFromForm(i)} className="text-[#13294b]">✕</button></span>))}</div>}</div>
            <div className="flex flex-wrap gap-2 pt-1">{colors.map((c) => (<button key={c.value} onClick={() => setStColor(c.value)} className={`h-8 w-8 rounded-full ${c.value} ${stColor === c.value ? "ring-2 ring-offset-2 ring-offset-white ring-[#13294b]" : ""}`} title={c.label} />))}</div>
          </div>
          <div className="mt-3 flex gap-2"><button disabled={!stName} onClick={saveStaff} className={`flex-1 py-3 ${navyBtn}`}>{editStaffId ? "Save changes" : "Add staff"}</button>{editStaffId && <button onClick={resetStaffForm} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">Cancel</button>}</div>
        </div>
        {staff.length > 0 && <div className="mt-2 space-y-2">{staff.map((st) => (
          <div key={st.id} className={`p-4 ${card}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full ${st.color || "bg-[#13294b]"} font-semibold text-white`}>{st.photo_url ? <img src={st.photo_url} alt="" className="h-full w-full object-cover" /> : st.name[0]}</div>
                <div><div className="font-medium">{st.name}</div><div className="text-xs text-slate-500">{st.login_email ? `Login: ${st.login_email}` : "No login yet"}</div></div>
              </div>
              <div className="flex items-center gap-3"><button onClick={() => startEditStaff(st)} className="text-sm text-[#13294b] hover:underline">Edit</button><button onClick={() => deleteStaff(st.id)} className="text-sm text-red-600 hover:underline">Remove</button></div>
            </div>
            <div className="mt-2 border-t border-slate-200 pt-2">
              {loginFor === st.id ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">{st.login_email ? "Reset this staff login" : "Create a login for this staff member"}</div>
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Staff email" type="email" className={input} />
                  <input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Password (min 6)" type="password" className={input} />
                  <div className="flex gap-2"><button onClick={createBarberLogin} disabled={creatingLogin} className={`flex-1 py-2.5 text-sm ${navyBtn}`}>{creatingLogin ? "Creating…" : "Create login"}</button><button onClick={() => setLoginFor(null)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button></div>
                </div>
              ) : (
                <button onClick={() => openLoginForm(st)} className="text-sm font-medium text-[#13294b] hover:underline">{st.login_email ? "Reset login" : "+ Set up login"}</button>
              )}
            </div>
          </div>
        ))}</div>}

        {/* DANGER ZONE */}
        <h2 className="mt-8 mb-2 font-display text-xl font-semibold text-red-600">Danger zone</h2>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-slate-900">Delete my account</div>
          <p className="mt-1 text-sm text-slate-600">Permanently removes your shop, all bookings, staff, services, reviews, and your login. This cannot be undone.</p>
          <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder='Type DELETE to confirm' className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-red-200 placeholder:text-slate-400 focus:ring-2 focus:ring-red-400" />
          <button onClick={deleteAccount} disabled={deleting || deleteText !== "DELETE"} className="mt-3 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-red-700 disabled:opacity-40">{deleting ? "Deleting…" : "Delete my account permanently"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-600">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}