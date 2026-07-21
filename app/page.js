import Link from "next/link";

const navy = "#13294b";

export default function Home() {
  const feature = (title, body) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );

  const PLANS = [
    { name: "Solo", price: "$12.99", tag: "For a single chair", features: ["1 staff member", "Your own booking page", "Deposits & reminders", "Reviews & rebooking"], popular: false },
    { name: "Shop", price: "$29.99", tag: "For a typical salon or shop", features: ["Up to 5 staff", "Everything in Solo", "Individual staff logins", "Priority support"], popular: true },
    { name: "Studio", price: "$49.99", tag: "For larger teams", features: ["Unlimited staff", "Everything in Shop", "Best for growing businesses"], popular: false },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAV */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <img src="/logo.png" alt="Kursey" className="h-9 w-auto" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">Log in</Link>
            <Link href="/signup" className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: navy }}>Start free trial</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              For salons, barbershops, studios & more
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Beautiful booking for<br className="hidden sm:block" /> appointment businesses
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
              Give clients a booking page that works 24/7. Take deposits, cut no-shows, and keep 100% of every appointment — no commission, ever.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-xl px-6 py-3 text-center text-base font-semibold text-white shadow-md transition hover:opacity-90" style={{ backgroundColor: navy }}>
                Start your 14-day free trial
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-300 px-6 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-50">
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">No card required · 0% commission · Cancel anytime</p>
          </div>

          {/* product preview mockup (pure CSS, no image) */}
          <div className="relative">
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center gap-1.5 px-4 py-3" style={{ backgroundColor: navy }}>
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                <span className="ml-2 text-xs text-white/80">kursey.com/yourname</span>
              </div>
              <div className="p-5">
                <div className="font-display text-lg font-bold text-slate-900">Your Salon</div>
                <div className="text-xs text-slate-500">Choose a service</div>
                <div className="mt-3 space-y-2">
                  {["Haircut — $30", "Color — $85", "Beard trim — $18"].map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      {s}<span className="text-slate-400">›</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-slate-500">Pick a time</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {["9:00", "9:30", "10:00", "10:30", "11:00", "1:00", "1:30", "2:00"].map((t, i) => (
                    <div key={t} className={`rounded-md py-1.5 text-center text-xs font-medium ${i === 3 ? "text-white" : "border border-slate-200 text-slate-600"}`} style={i === 3 ? { backgroundColor: navy } : {}}>{t}</div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg py-2.5 text-center text-sm font-semibold text-white" style={{ backgroundColor: navy }}>Book appointment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">Everything you need to run bookings</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">One simple, flat price. Every feature included on every plan.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feature("24/7 online booking", "Clients book themselves any time of day, from any phone or computer — no app to download.")}
            {feature("Deposits that stop no-shows", "Take a deposit at the time of booking so your calendar and your time are protected.")}
            {feature("Automatic reminders", "Email reminders go out before every appointment, so clients actually show up.")}
            {feature("Reviews & rebooking", "Collect client reviews and automatically nudge them to book their next visit.")}
            {feature("0% commission", "You keep every dollar. Client payments go straight to your own account, not ours.")}
            {feature("Your own branded page", "Your logo, staff, services, and work photos — all on kursey.com/yourname.")}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">Up and running in minutes</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              ["1", "Create your page", "Sign up and add your services and staff. It takes a few minutes."],
              ["2", "Share your link", "Put kursey.com/yourname in your bio, texts, and posts."],
              ["3", "Get booked", "Appointments, deposits, and reminders run on autopilot."],
            ].map(([n, t, b]) => (
              <div key={n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold text-white" style={{ backgroundColor: navy }}>{n}</div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-slate-600">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">Simple, flat pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">14-day free trial. No commission. Cancel anytime.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${p.popular ? "border-2" : "border-slate-200"}`} style={p.popular ? { borderColor: navy } : {}}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: navy }}>Most popular</div>}
                <div className="font-display text-xl font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-slate-500">{p.tag}</div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold" style={{ color: navy }}>{p.price}</span>
                  <span className="mb-1 text-sm text-slate-500">/mo</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><span className="mt-0.5" style={{ color: navy }}>✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-6 rounded-xl py-2.5 text-center text-sm font-semibold transition ${p.popular ? "text-white hover:opacity-90" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`} style={p.popular ? { backgroundColor: navy } : {}}>
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to fill your calendar?</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-600">Set up your booking page today and let clients book themselves — around the clock.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-90" style={{ backgroundColor: navy }}>
            Start your 14-day free trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <img src="/logo.png" alt="Kursey" className="h-8 w-auto" />
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Kursey. Booking software for appointment businesses.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600">
            <Link href="/login" className="hover:text-slate-900">Log in</Link>
            <Link href="/signup" className="hover:text-slate-900">Sign up</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}