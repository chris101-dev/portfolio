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
      <nav className="terminal-panel font-ui mx-auto mt-4 flex w-[min(1120px,92%)] items-center justify-between px-5 py-4 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="terminal-chip px-2 py-1 text-sm font-bold text-cyan-200">
            DE
          </span>
          <span className="font-ui text-sm font-semibold tracking-[0.12em] uppercase text-white sm:text-base">
            data engineer
          </span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm text-white md:flex">
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="transition-colors duration-200 hover:text-cyan-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="#contact"
          className="terminal-button terminal-button-green px-4 py-2 text-xs font-semibold uppercase tracking-widest"
        >
          Contact
        </Link>
      </nav>
    </motion.header>
  );
}
