import { Suspense } from "react";
import { motion } from "framer-motion";
import { VisualizationPlaceholder } from "@/modules/data-visualization/visualization-placeholder";
import { TerminalTypedBlock } from "./terminal-typed-block";

const skillTags = [
  "Cloud Data Platforms",
  "ETL & ELT Pipelines",
  "Streaming Workflows",
  "DataOps Automation",
];

export function HeroSection() {
  return (
    <section className="mx-auto flex w-[min(1120px,92%)] flex-col gap-8 pt-14">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <TerminalTypedBlock />

        <div id="skills" className="mt-8 flex flex-wrap gap-3">
          {skillTags.map((tag) => (
            <span
              key={tag}
              className="terminal-chip font-ui px-4 py-2 text-sm text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        id="projects"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.55 }}
      >
        <Suspense
          fallback={
            <section className="terminal-panel p-5">
              <div className="terminal-panel-soft px-5 py-10 text-center">
                <p className="font-ui text-sm text-white">
                  Loading visualization module...
                </p>
              </div>
            </section>
          }
        >
          <VisualizationPlaceholder />
        </Suspense>
      </motion.div>
    </section>
  );
}
