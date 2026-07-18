"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams } from "next/navigation";

function UnsubInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState("working");

  useEffect(() => {
    async function run() {
      const shop = params.get("shop");
      const email = (params.get("email") || "").trim().toLowerCase();
      if (!shop || !email) { setStatus("error"); return; }
      const { error } = await supabase.from("marketing_optouts").insert({ shop_id: shop, email });
      setStatus(error ? "error" : "done");
    }
    run();
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-center">
      <div className="max-w-sm">
        {status === "working" && <p className="text-stone-500">Unsubscribing…</p>}
        {status === "done" && <><h1 className="text-2xl font-bold text-stone-800">You're unsubscribed</h1><p className="mt-2 text-stone-500">You won't receive any more offer emails. You can still book anytime.</p></>}
        {status === "error" && <><h1 className="text-2xl font-bold text-stone-800">Something went wrong</h1><p className="mt-2 text-stone-500">Please try the link again, or contact the shop directly.</p></>}
      </div>
    </div>
  );
}

export default function Unsubscribe() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>}>
      <UnsubInner />
    </Suspense>
  );
}