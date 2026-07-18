"use client";

import Link from "next/link";

export default function Landing() {
  const btnPrimary = "rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-white shadow-lg transition hover:from-amber-700 hover:to-amber-600";
  return (
    <div className="relative min-h-screen w-full text-white">
      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <img src="/logo.png" alt="Kursey" className="h-14 w-auto rounded-xl sm:h-16" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-stone-200 hover:text-white">Log in</Link>
          <Link href="/signup" className={`px-4 py-2 text-sm ${btnPrimary}`}>Get started</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">Booking, beautifully done</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Booking software for barbers &amp; salons — <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">without the hassle.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-stone-200">
          Take appointments 24/7, cut no-shows, and keep 100% of your bookings. Your own booking page, live in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={`w-full px-6 py-3.5 sm:w-auto ${btnPrimary}`}>
            Start free — create your shop
          </Link>
          <Link href="/login" className="w-full rounded-xl bg-white/95 px-6 py-3.5 font-semibold text-stone-800 shadow-lg backdrop-blur transition hover:bg-white sm:w-auto">
            I already have a shop
          </Link>
        </div>
        <p className="mt-4 text-sm text-stone-300">No app to download. No contracts.</p>
      </section>

      {/* features */}
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Your own booking link", d: "Share kursey.com/yourshop on Instagram, Google, or your site. Clients book in seconds." },
            { t: "No double-bookings", d: "Smart scheduling knows each barber's hours, breaks, and appointments — automatically." },
            { t: "Keep 100% of bookings", d: "No marketplace commission, ever. Your clients, your money, your data." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/15 backdrop-blur-md">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg text-white shadow-sm">✓</div>
              <h3 className="font-semibold tracking-tight text-white">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-200">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* who it's for */}
      <section className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">Built for</p>
        <p className="mt-3 text-lg font-medium text-stone-100">Barbershops · Hair salons · Nail studios · Waxing &amp; beauty</p>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-amber-600/90 to-amber-800/90 px-6 py-12 shadow-xl ring-1 ring-amber-400/30 backdrop-blur">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to fill your chairs?</h2>
          <p className="mx-auto mt-3 max-w-md text-amber-50">Set up your booking page in minutes. Start taking appointments today.</p>
          <Link href="/signup" className="mt-7 inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-amber-800 shadow-lg transition hover:bg-amber-50">
            Create your shop
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-stone-300">
        © {new Date().getFullYear()} Kursey · <Link href="/login" className="hover:text-amber-300">Owner login</Link>
      </footer>
    </div>
  );
}