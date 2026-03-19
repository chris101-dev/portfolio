"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { NavigationBar } from "./navigation-bar";
import { HeroSection } from "./hero-section";
import { RainbowShadowRuntime } from "./rainbow-shadow-runtime";
import { SmoothScrollRuntime } from "./smooth-scroll-runtime";
import { DevFpsOverlay } from "./dev-fps-overlay";

export function LandingPage() {
  useLayoutEffect(() => {
    const canControlRestoration = "scrollRestoration" in window.history;
    const previousScrollRestoration = canControlRestoration
      ? window.history.scrollRestoration
      : null;

    if (canControlRestoration) {
      window.history.scrollRestoration = "manual";
    }

    const resetToTop = () => {
      if (window.location.hash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetToTop();
    window.addEventListener("pageshow", resetToTop);

    return () => {
      window.removeEventListener("pageshow", resetToTop);

      if (previousScrollRestoration !== null) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10">
        <DevFpsOverlay />
        <SmoothScrollRuntime />
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
            className="mx-auto w-[min(1120px,92%)] p-6"
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
            className="mx-auto w-[min(1120px,92%)] p-6"
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
                className="terminal-button terminal-button-green terminal-lift-button font-ui w-fit px-6 py-3 text-sm font-semibold"
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
