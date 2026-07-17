"use client";

import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 font-bold text-white">K</div>
          <span className="text-lg font-bold">Kursey</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Get started</Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Booking software for barbers &amp; salons — <span className="text-emerald-600">without the hassle.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
          Take appointments 24/7, cut no-shows, and keep 100% of your bookings. Your own booking page, live in minutes.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 sm:w-auto">
            Start free — create your shop
          </Link>
          <Link href="/login" className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 hover:ring-stone-400 sm:w-auto">
            I already have a shop
          </Link>
        </div>
        <p className="mt-3 text-sm text-stone-400">No app to download. No contracts.</p>
      </section>

      {/* features */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Your own booking link", d: "Share kursey.com/yourshop on Instagram, Google, or your site. Clients book in seconds." },
            { t: "No double-bookings", d: "Smart scheduling knows each barber's hours, breaks, and appointments — automatically." },
            { t: "Keep 100% of bookings", d: "No marketplace commission, ever. Your clients, your money, your data." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
              <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">✓</div>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-stone-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* who it's for */}
      <section className="mx-auto max-w-4xl px-4 py-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-400">Built for</p>
        <p className="mt-2 text-lg text-stone-700">Barbershops · Hair salons · Nail studios · Waxing &amp; beauty</p>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-3xl bg-stone-900 px-6 py-10 text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to fill your chairs?</h2>
          <p className="mx-auto mt-2 max-w-md text-stone-300">Set up your booking page in minutes. Start taking appointments today.</p>
          <Link href="/signup" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700">
            Create your shop
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} Kursey · <Link href="/login" className="hover:text-stone-600">Owner login</Link>
      </footer>
    </div>
  );
}