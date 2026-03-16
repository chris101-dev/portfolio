import Link from "next/link";
import { motion } from "framer-motion";
import { VisualizationPlaceholder } from "@/modules/data-visualization/visualization-placeholder";

const skillTags = [
  "Cloud Data Platforms",
  "ETL & ELT Pipelines",
  "Streaming Workflows",
  "DataOps Automation",
];

const highlightMetrics = [
  { label: "Pipelines in Prod", value: "27+" },
  { label: "Data Quality Rules", value: "120" },
  { label: "Avg. SLA Uptime", value: "99.9%" },
];

export function HeroSection() {
  return (
    <section className="mx-auto grid w-[min(1120px,92%)] gap-12 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="font-data text-xs uppercase tracking-[0.3em] text-cyan-300/90">
          data engineer portfolio
        </p>

        <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl lg:text-6xl">
          Build robust pipelines that turn raw data into reliable decisions.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          I design and operate scalable data platforms across ingestion,
          transformation, orchestration, and observability.
        </p>

        <div id="skills" className="mt-8 flex flex-wrap gap-3">
          {skillTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-600/80 bg-slate-900/70 px-4 py-2 text-sm text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="#projekte"
            className="rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:scale-[1.02]"
          >
            Projekte ansehen
          </Link>
          <Link
            href="#kontakt"
            className="rounded-full border border-slate-500 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors duration-200 hover:border-cyan-300 hover:text-cyan-200"
          >
            Gespraech starten
          </Link>
        </div>

        <div id="projekte" className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {highlightMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-700/80 bg-slate-900/70 px-4 py-4"
            >
              <p className="text-2xl font-semibold text-slate-100">{metric.value}</p>
              <p className="mt-1 text-sm text-slate-400">{metric.label}</p>
            </article>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.55 }}
      >
        <VisualizationPlaceholder />
      </motion.div>
    </section>
  );
}
