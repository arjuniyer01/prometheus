import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "../components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Prometheus | Financial Intelligence Platform",
  description: "Institutional-grade financial research powered by Gemini 3 Flash. Synthesize fundamentals, sentiment, and regulatory filings in a single view.",
  icons: {
    icon: [
      { url: "/engineer.svg", type: "image/svg+xml" },
    ],
    apple: "/engineer.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          inter.variable,
          outfit.variable,
          "font-sans bg-[#020617] text-slate-50 antialiased overflow-x-hidden"
        )}
      >
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-[-1] pointer-events-none opacity-50">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full animate-pulse-slow" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-slate-400/5 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-slate-500/5 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>

        {/* Navigation / Header */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
          <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <img src="/engineer.svg" alt="Prometheus Logo" className="w-full h-full logo-shadow object-contain" />
              </div>
              <span className="text-xl font-bold font-outfit tracking-tight">PROMETHEUS</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">In development, information may be incomplete or incorrect</span>
            </div>

          </div>
        </header>

        <main className="w-full px-4 sm:px-6 py-6 max-w-[1920px] mx-auto">
          {children}
        </main>
        <Toaster />

        <footer className="border-t border-white/5 py-12 bg-slate-950/50">
          <div className="w-full px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-sm text-slate-500">
              © 2026 <Link href="/" className="hover:text-white transition-colors">Prometheus Intelligence</Link>.
            </div>
            <div className="text-[10px] text-slate-600 max-w-md text-center md:text-right italic">
              AI-generated content. Not financial advice. Use as a research aid only.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
