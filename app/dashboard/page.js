"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // 1. check if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setChecking(false);

      // 2. load bookings
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setBookings(data);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fade &amp; Co — Dashboard</h1>
            <p className="text-sm text-stone-500">Every booking that comes in.</p>
          </div>
          <button onClick={handleLogout}
            className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Log out
          </button>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <div className="text-3xl font-bold">{bookings.length}</div>
            <div className="text-sm text-stone-500">Total bookings</div>
          </div>
          <div className="rounded-2xl bg-stone-900 p-4 text-white">
            <div className="text-3xl font-bold text-emerald-400">${revenue}</div>
            <div className="text-sm text-stone-300">Booked revenue</div>
          </div>
        </div>

        {/* list */}
        <h2 className="mt-6 mb-2 text-lg font-semibold">Bookings</h2>
        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">
            No bookings yet. Make one on the booking page and refresh.
          </p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{b.customer_name}</div>
                    <div className="text-sm text-stone-500">{b.service} · {b.barber}</div>
                    <div className="text-sm text-stone-500">{b.day} at {b.slot}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${b.price}</div>
                    <div className="text-xs text-stone-400">{b.phone}</div>
                  </div>
                </div>
                {b.wants_offers && (
                  <div className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">on offers list</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}