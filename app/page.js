"use client";

import Link from "next/link";
import { useState } from "react";

const btnGold = "rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-white shadow-lg transition hover:from-amber-700 hover:to-amber-600";

const steps = [
  { n: "01", t: "Create your shop", d: "Sign up and add your services, prices, and barbers in minutes. You get your own page at kursey.com/yourshop." },
  { n: "02", t: "Share your link", d: "Put it in your Instagram bio, Google profile, or website. Clients book themselves, 24/7 — no phone tag." },
  { n: "03", t: "Get booked & paid", d: "Appointments land on each barber's calendar. Take deposits up front, and reminders cut your no-shows." },
];

const features = [
  { t: "Your own booking page", d: "A branded page with your logo, services, staff, and photo galleries. Clients book in seconds — no app, no account required." },
  { t: "Smart scheduling", d: "Kursey knows each barber's days, hours, breaks, and appointments, and never double-books. Different hours on different days? Handled." },
  { t: "Deposits & payments", d: "Take a deposit to lock in the booking. Money goes straight to your Stripe — Kursey never touches it, and takes no commission." },
  { t: "Automatic reminders", d: "Clients get an email confirmation and a reminder before their visit, so fewer chairs sit empty from no-shows." },
  { t: "Staff logins", d: "Give each barber their own login to see just their own schedule and block their own time off — without seeing the whole business." },
  { t: "Reviews & rebooking", d: "Collect reviews after visits and automatically nudge clients to come back, so your chairs stay full week after week." },
];

const faqs = [
  { q: "How much does Kursey cost?", a: "One flat price: $34.99/month, with a 14-day free trial. No setup fees, no per-booking charges, and no commission on your appointments." },
  { q: "Do you take a cut of my bookings?", a: "Never. When you take a deposit, the money flows directly into your own Stripe account. Kursey only charges the monthly subscription — nothing per booking." },
  { q: "Do my clients need to download an app?", a: "No. They tap your link, pick a service and time, and they're booked. It works right in their phone's browser." },
  { q: "Can I set different hours for each barber?", a: "Yes. Every barber has their own working days, hours, and breaks — and you can even set different hours on different days (like a shorter Wednesday)." },
  { q: "What happens after the free trial?", a: "You choose whether to subscribe. Nothing is charged during the 14 days, and your booking page keeps everything you set up." },
  { q: "What kinds of businesses is this for?", a: "Barbershops, hair salons, nail studios, and waxing or beauty businesses — anywhere clients book time with a person." },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-stone-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#f7f3ee]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <img src="/logo.png" alt="Kursey" className="h-9 w-auto" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:text-stone-900">Log in</Link>
            <Link href="/signup" className={`px-4 py-2 text-sm ${btnGold}`}>Get started</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto mt-3 max-w-6xl overflow-hidden rounded-3xl sm:mt-5">
        <div className="absolute inset-0">
          <img src="/hero.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/85 via-stone-900/70 to-stone-950/90" />
        </div>
        <div className="relative px-6 py-20 text-center sm:py-28">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">Booking software for barbers &amp; salons</p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Fill your chairs, <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">not your voicemail.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-stone-200">
            Give clients a booking page that works 24/7. Take deposits, cut no-shows, and keep 100% of every appointment — no commission, ever.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={`w-full px-7 py-3.5 sm:w-auto ${btnGold}`}>Start your free trial</Link>
            <Link href="/login" className="w-full rounded-xl bg-white/95 px-7 py-3.5 font-semibold text-stone-800 shadow-lg backdrop-blur transition hover:bg-white sm:w-auto">I already have a shop</Link>
          </div>
          <p className="mt-4 text-sm text-stone-300">14 days free · No app to download · No contracts</p>
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Built for</p>
        <p className="mt-3 font-display text-lg font-medium text-stone-700">Barbershops · Hair salons · Nail studios · Waxing &amp; beauty</p>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">Up and running in an afternoon</h2>
          <p className="mx-auto mt-2 max-w-xl text-stone-500">No technical setup. If you can fill out a form, you can run your whole booking business on Kursey.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-white p-6 shadow-[0_10px_40px_-18px_rgba(120,80,20,0.25)] ring-1 ring-stone-200/70">
              <div className="font-display text-2xl font-bold text-amber-600">{s.n}</div>
              <h3 className="mt-2 font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">Everything a busy shop needs</h2>
          <p className="mx-auto mt-2 max-w-xl text-stone-500">All the tools the big platforms charge extra for — in one flat price.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl bg-white p-6 shadow-[0_10px_40px_-18px_rgba(120,80,20,0.2)] ring-1 ring-stone-200/70">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg text-white shadow-sm">✓</div>
              <h3 className="font-semibold tracking-tight">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY SWITCH */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 px-6 py-12 text-white shadow-xl sm:px-12">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight">Why shops choose Kursey</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-amber-300">0%</div>
              <div className="mt-1 text-sm text-stone-300">Commission on your bookings. What you earn is yours.</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-amber-300">100%</div>
              <div className="mt-1 text-sm text-stone-300">Your clients and your data — never a marketplace's.</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-amber-300">24/7</div>
              <div className="mt-1 text-sm text-stone-300">Bookings roll in while you're cutting, sleeping, or closed.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">Flat pricing that grows with you</h2>
          <p className="mx-auto mt-2 max-w-lg text-stone-500">Pick a plan by your team size. Add barbers up to your plan — the price never creeps per person, and there's never a commission.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "Solo", price: "$12.99", blurb: "For a single-chair barber.", features: ["1 barber", "Your own booking page", "Deposits & reminders", "Reviews & rebooking"] },
            { name: "Shop", price: "$29.99", blurb: "For a typical barbershop.", features: ["Up to 5 barbers", "Everything in Solo", "Per-barber logins", "Priority support"], popular: true },
            { name: "Studio", price: "$49.99", blurb: "For large shops & chains.", features: ["Unlimited barbers", "Everything in Shop", "Best for growing teams"] },
          ].map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(120,80,20,0.35)] ring-1 ${p.popular ? "ring-2 ring-amber-400" : "ring-stone-200/70"}`}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white shadow">Most popular</div>}
              <div className="font-display text-xl font-semibold text-stone-900">{p.name}</div>
              <div className="mt-1 flex items-end gap-1"><span className="font-display text-4xl font-bold text-amber-700">{p.price}</span><span className="mb-1 text-sm text-stone-400">/mo</span></div>
              <p className="mt-2 text-sm text-stone-500">{p.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`mt-6 block w-full py-3 text-center ${btnGold}`}>Start free</Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">Every plan includes a <span className="font-semibold text-stone-700">14-day free trial</span>, all features, and <span className="font-semibold text-stone-700">0% commission</span>. Cancel anytime.</p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="mb-8 text-center font-display text-3xl font-bold tracking-tight">Questions, answered</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/70">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium tracking-tight">{f.q}</span>
                <span className={`shrink-0 text-amber-600 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>＋</span>
              </button>
              {openFaq === i && <div className="px-5 pb-4 text-sm leading-relaxed text-stone-500">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 px-6 py-12 text-white shadow-xl">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Ready to fill your chairs?</h2>
          <p className="mx-auto mt-3 max-w-md text-stone-300">Set up your booking page today and start taking appointments this week.</p>
          <Link href="/signup" className="mt-7 inline-block rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-amber-700">
            Start your free trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-200/70">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <img src="/logo.png" alt="Kursey" className="mx-auto h-8 w-auto sm:mx-0" />
              <p className="mt-3 max-w-xs text-sm text-stone-500">Booking software for barbershops, salons, and beauty pros.</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm sm:items-end">
              <Link href="/signup" className="text-stone-600 hover:text-amber-700">Get started</Link>
              <Link href="/login" className="text-stone-600 hover:text-amber-700">Owner login</Link>
              <a href="mailto:hello@kursey.com" className="text-stone-600 hover:text-amber-700">hello@kursey.com</a>
            </div>
          </div>
          <div className="mt-8 border-t border-stone-200/70 pt-6 text-center text-xs text-stone-400">
            © {new Date().getFullYear()} Kursey. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}