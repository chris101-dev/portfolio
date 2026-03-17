"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NavigationBar } from "./navigation-bar";
import { HeroSection } from "./hero-section";
import { RainbowShadowRuntime } from "./rainbow-shadow-runtime";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute left-[-10rem] top-24 h-80 w-80 bg-white/8 blur-3xl" />
        <div className="absolute right-[-8rem] top-[-4rem] h-80 w-80 bg-white/8 blur-3xl" />
      </div>

      <div className="relative z-10">
        <RainbowShadowRuntime />
        <NavigationBar />
        <main className="space-y-12 pb-20">
          <HeroSection />

          <motion.section
            id="about"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="terminal-panel mx-auto w-[min(1120px,92%)] p-6 backdrop-blur"
          >
            <p className="font-data text-xs tracking-[0.25em] text-emerald-300/90">
              about this portfolio
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Focused on resilient data systems and measurable business impact.
            </h2>
            <p className="mt-4 max-w-3xl text-white">
              This landing page is intentionally modular. The visualization area
              is prepared as a plug-in slot so D3, Recharts, Vega-Lite, or a
              custom real-time chart can be integrated without changing the hero
              layout.
            </p>
          </motion.section>

          <motion.section
            id="contact"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="terminal-panel mx-auto w-[min(1120px,92%)] p-6"
          >
            <p className="font-data text-xs tracking-[0.3em] text-cyan-300/95">
              contact
            </p>
            <div className="mt-3 flex flex-col gap-5">
              <h2 className="font-display max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
                Looking for a Data Engineer for your next platform build?
              </h2>
              <Link
                href="mailto:chris.mollzahn@gmail.com"
                className="terminal-button terminal-button-green font-ui w-fit px-6 py-3 text-sm font-semibold"
              >
                chris.mollzahn@gmail.com
              </Link>
            </div>
          </motion.section>
        </main>

        <footer className="mx-auto w-[min(1120px,92%)] border-t border-white py-8 text-sm text-white">
          <p>© {new Date().getFullYear()} Chris Mollzahn</p>
        </footer>
      </div>
    </div>
  );
}
