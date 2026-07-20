import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata = {
  title: "Kursey — Booking software for barbers & salons",
  description: "Give clients a booking page that works 24/7. Take deposits, cut no-shows, and keep 100% of every appointment — no commission.",
  icons: { icon: "/icon.png" },
  openGraph: {
    title: "Kursey — Booking software for barbers & salons",
    description: "Give clients a booking page that works 24/7. Take deposits, cut no-shows, and keep 100% of every appointment.",
    url: "https://www.kursey.com",
    siteName: "Kursey",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {/* Global barbershop background — sits behind every page */}
        <div className="fixed inset-0 -z-10">
          <img src="/hero.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-stone-950/80" />
        </div>
        {children}
      </body>
    </html>
  );
}