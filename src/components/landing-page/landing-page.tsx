"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NavigationBar } from "./navigation-bar";
import { HeroSection } from "./hero-section";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute left-[-10rem] top-24 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute right-[-8rem] top-[-4rem] h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <NavigationBar />
        <main>
          <HeroSection />

          <motion.section
            id="ueber-mich"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-10 w-[min(1100px,92%)] rounded-3xl border border-slate-700/80 bg-slate-950/70 px-6 py-8 backdrop-blur sm:px-8"
          >
            <p className="font-data text-xs uppercase tracking-[0.25em] text-emerald-300/80">
              about this portfolio
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-slate-100 sm:text-3xl">
              Focused on resilient data systems and measurable business impact.
            </h2>
            <p className="mt-4 max-w-3xl text-slate-300">
              This landing page is intentionally modular. The visualization area
              is prepared as a plug-in slot so D3, Recharts, Vega-Lite, or a
              custom real-time chart can be integrated without changing the hero
              layout.
            </p>
          </motion.section>

          <motion.section
            id="kontakt"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-20 w-[min(1100px,92%)] rounded-3xl border border-cyan-300/20 bg-gradient-to-r from-slate-900/80 to-slate-950/70 px-6 py-8 sm:px-8"
          >
            <p className="font-data text-xs uppercase tracking-[0.3em] text-cyan-300/90">
              contact
            </p>
            <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <h2 className="font-display max-w-2xl text-2xl font-semibold text-slate-100 sm:text-3xl">
                Looking for a Data Engineer for your next platform build?
              </h2>
              <Link
                href="mailto:hello@example.com"
                className="w-fit rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors duration-200 hover:bg-emerald-300"
              >
                hello@example.com
              </Link>
            </div>
          </motion.section>
        </main>

        <footer className="mx-auto w-[min(1100px,92%)] border-t border-slate-800/90 py-8 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Data Engineer Portfolio</p>
        </footer>
      </div>
    </div>
  );
}
