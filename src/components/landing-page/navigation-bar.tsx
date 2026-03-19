import Link from "next/link";
import { motion } from "framer-motion";
import { navigationLinks } from "@/lib/navigation-links";

type LenisLike = {
  scrollTo: (
    target: Element | string | number,
    options?: { duration?: number; offset?: number; immediate?: boolean },
  ) => void;
};

function handleSectionClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
): void {
  if (!href.startsWith("#")) {
    return;
  }

  event.preventDefault();

  const targetId = href.slice(1);
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
  if (lenis) {
    lenis.scrollTo(target, { duration: 1, offset: -16 });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

export function NavigationBar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40"
    >
      <nav className="terminal-panel terminal-panel-outer-triple-shadow font-ui mx-auto mt-4 flex w-[min(1120px,92%)] items-center justify-between px-5 py-4 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="terminal-chip px-2 py-1 text-sm font-bold text-cyan-200">
            IT
          </span>
          <span className="font-ui text-sm font-semibold tracking-[0.12em] uppercase text-white sm:text-base">
            T-Shaped Engineer
          </span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm text-white md:flex">
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={(event) => handleSectionClick(event, link.href)}
                className="transition-colors duration-200 hover:text-cyan-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="#contact"
          onClick={(event) => handleSectionClick(event, "#contact")}
          className="terminal-button terminal-button-green terminal-lift-button px-4 py-2 text-xs font-semibold uppercase tracking-widest"
        >
          Contact
        </Link>
      </nav>
    </motion.header>
  );
}
