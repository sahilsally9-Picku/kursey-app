import Link from "next/link";

export const metadata = { title: "Privacy Policy — Kursey" };

export default function Privacy() {
  const updated = "July 2026";
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="text-sm font-medium text-[#13294b] hover:underline">← Back to Kursey</Link>
        <h1 className="mt-4 font-display text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <p>Kursey ("we", "us") provides booking software for appointment-based businesses. This policy explains what information we collect and how we use it. By using Kursey, you agree to this policy.</p>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Who we serve</h2>
            <p>Kursey has two types of users: <strong>businesses</strong> that create a booking page, and <strong>customers</strong> who book appointments through those pages. Each business is responsible for the personal information of its own customers.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Information we collect</h2>
            <p>For businesses: your name, email, business details, and staff information you enter. For customers booking an appointment: your name, phone number, email, appointment details, and any answers you give to the booking questions a business has set. We also collect basic technical data (such as log information) needed to run the service.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Payments</h2>
            <p>Payments and deposits are processed by <strong>Stripe</strong>. Card details are entered directly with Stripe and are <strong>never stored on Kursey's servers</strong>. When a business takes a deposit, the money goes directly to that business's own Stripe account. Stripe's handling of your data is governed by Stripe's privacy policy.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">How we use information</h2>
            <p>We use your information to operate the booking service: creating and managing appointments, sending appointment confirmations and reminders by email, processing deposits, and providing businesses with their own booking and customer data. We do not sell your personal information.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Email communications</h2>
            <p>Customers may receive appointment confirmations and reminders. If a customer opts in, a business may also send occasional offers; every marketing email includes an unsubscribe link, and you can opt out at any time.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Data storage and security</h2>
            <p>Data is stored using industry-standard providers (including Supabase and Vercel) with reasonable security measures. No system is perfectly secure, but we take steps to protect your information.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Your rights</h2>
            <p>You may request access to, correction of, or deletion of your personal information. Businesses can delete their account and all associated data at any time from their Settings page. To request deletion of your information, contact us using the details below.</p>
          </div>

          <div>
            <h2 className="mb-1 font-display text-lg font-semibold text-slate-900">Contact</h2>
            <p>Questions about this policy? Email us at <a href="mailto:support@kursey.com" className="text-[#13294b] underline">support@kursey.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}