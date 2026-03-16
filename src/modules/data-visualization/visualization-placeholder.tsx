import { motion } from "framer-motion";

const barHeights = [24, 38, 54, 46, 72, 60, 88, 76, 66, 92, 80, 70];

export function VisualizationPlaceholder() {
  return (
    <section
      aria-label="Data visualization placeholder"
      className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.28em] text-cyan-300/80">
            Interactive Data Layer
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            Pipeline Throughput Monitor
          </h2>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200">
          Live Slot
        </span>
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4">
        <div className="grid h-44 grid-cols-12 items-end gap-2">
          {barHeights.map((height, index) => (
            <motion.div
              key={`${height}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.04, duration: 0.35 }}
              className="h-full"
            >
              <motion.div
                initial={{ height: "12%" }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.2 + index * 0.04, duration: 0.8 }}
                className="h-full w-full rounded-t-md bg-gradient-to-t from-cyan-500/40 to-emerald-300/90"
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2">
            <p className="font-data uppercase tracking-wider text-slate-400">source</p>
            <p className="mt-1">API + Data Lake</p>
          </article>
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2">
            <p className="font-data uppercase tracking-wider text-slate-400">processing</p>
            <p className="mt-1">Spark + dbt + Airflow</p>
          </article>
          <article className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2">
            <p className="font-data uppercase tracking-wider text-slate-400">output</p>
            <p className="mt-1">Warehouse + BI Layer</p>
          </article>
        </div>
      </div>
    </section>
  );
}
