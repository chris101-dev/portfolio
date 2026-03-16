import Link from "next/link";
import { motion } from "framer-motion";
import { navigationLinks } from "@/lib/navigation-links";

export function NavigationBar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40"
    >
      <nav className="font-ui mx-auto mt-4 flex w-[min(1100px,92%)] items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-950/65 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur md:px-6">
        <Link href="/" className="flex items-center gap-3 text-slate-100">
          <span className="rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-300 px-2 py-1 text-sm font-bold text-slate-950">
            DE
          </span>
          <span className="font-ui text-sm font-semibold tracking-[0.12em] uppercase sm:text-base">
            data engineer
          </span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="transition-colors duration-200 hover:text-cyan-300"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="#contact"
          className="rounded-full border border-cyan-300/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-200 transition-colors duration-200 hover:bg-cyan-400/10"
        >
          Contact
        </Link>
      </nav>
    </motion.header>
  );
}
