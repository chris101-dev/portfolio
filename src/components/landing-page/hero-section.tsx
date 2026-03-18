import { Suspense } from "react";
import { motion } from "framer-motion";
import { VisualizationPlaceholder } from "@/modules/data-visualization/visualization-placeholder";
import { TerminalTypedBlock } from "./terminal-typed-block";

type SkillCategory = {
  category: string;
  tags: string[];
};

const skillCategories: SkillCategory[] = [
  {
    category: "Data Engineering",
    tags: [
      "Real-time Streaming",
      "API Ingestion",
      "Time-Series Analysis",
      "Sliding Windows",
    ],
  },
  {
    category: "Web Dev & Design",
    tags: [
      "Responsive UI/UX",
      "Next.js",
      "Tailwind CSS",
      "State Management",
    ],
  },
  {
    category: "Systems & Quality",
    tags: [
      "Data Observability",
      "Incident Tracking",
      "Schema Validation",
      "WebSockets",
    ],
  },
  {
    category: "Core Stack",
    tags: ["Python", "JavaScript", "TypeScript", "HTML5/CSS3"],
  },
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

        <div id="skills" className="mt-5">
          <section className="w-full">
            <div className="space-y-1.5">
              {skillCategories.map((group) => (
                <p
                  key={group.category}
                  className="terminal-sequence-row font-ui w-full overflow-x-auto whitespace-nowrap px-0 py-0 leading-tight text-[11px] sm:text-xs"
                >
                  <span className="font-extrabold">{group.category}</span>
                  <span aria-hidden="true" className="mx-2 opacity-70">
                    |
                  </span>
                  <span className="font-medium opacity-90">
                    {group.tags.join(" • ")}
                  </span>
                </p>
              ))}
            </div>
          </section>
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
            <section className="terminal-panel terminal-panel-outer-triple-shadow p-5">
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
