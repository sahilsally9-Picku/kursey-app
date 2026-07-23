import Link from "next/link";

export const metadata = { title: "Terms of Service — Kursey" };

export default function Terms() {
  const updated = "July 2026";
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="text-sm font-medium text-[#13294b] hover:underline">← Back to Kursey</Link>
        <h1 className="mt-4 font-display text-3xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <p>These terms govern your use of Kursey. By creating an account or using the service, you agree to them.</p>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">The service</h2>
            <p>Kursey provides booking-page software for appointment-based businesses, including scheduling, deposits, reminders, reviews, and related tools. We may update or change features over time.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Accounts</h2>
            <p>You are responsible for keeping your login secure and for all activity under your account. You must provide accurate information and use Kursey only for lawful purposes.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Subscriptions and free trial</h2>
            <p>Kursey is offered on a subscription basis with a 14-day free trial. After the trial, continued use requires an active paid plan; if you do not subscribe, your booking page will be paused and will stop accepting new bookings. Subscription fees are billed on a recurring basis until cancelled. You can cancel at any time, and cancellation stops future billing.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Payments and deposits</h2>
            <p>Payments are processed by Stripe. Deposits taken from a business's customers go directly to that business's Stripe account — Kursey does not hold those funds. Each business sets and is responsible for its own pricing, deposit, cancellation, and refund policies with its customers.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Business responsibilities</h2>
            <p>Businesses using Kursey are responsible for honouring the appointments they accept, for their own customer communications, and for complying with laws that apply to their business, including handling their customers' personal information appropriately.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Availability</h2>
            <p>We work to keep Kursey running reliably but do not guarantee uninterrupted service. The service is provided "as is" without warranties of any kind.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Limitation of liability</h2>
            <p>To the fullest extent permitted by law, Kursey is not liable for indirect or consequential damages, or for lost bookings, revenue, or data arising from use of the service. Our total liability is limited to the amount you paid us in the prior three months.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Termination</h2>
            <p>You may stop using Kursey at any time, and you can delete your account and data from your Settings page. We may suspend or end access for accounts that violate these terms.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Contact</h2>
            <p>Questions? Email <a href="mailto:kursey686@gmail.com" className="text-[#13294b] underline">kursey686@gmail.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}