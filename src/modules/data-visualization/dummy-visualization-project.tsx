import type { VisualizationProject } from "./visualization-mock";

type DummyVisualizationProjectProps = {
  project: VisualizationProject;
};

export function DummyVisualizationProject({
  project,
}: DummyVisualizationProjectProps) {
  return (
    <div className="terminal-panel-soft px-5 py-5">
      <div className="flex min-h-[320px] flex-col justify-center gap-4 text-center">
        <p className="font-data text-xs tracking-[0.28em] text-emerald-300/90">
          Placeholder Project
        </p>

        <h3 className="font-ui text-xl font-semibold text-white">{project.title}</h3>

        <p className="mx-auto max-w-xl text-sm text-white/70">{project.summary}</p>

        <p className="font-ui text-xs text-cyan-200/90">
          This slot is intentionally empty and ready to be replaced.
        </p>
      </div>
    </div>
  );
}
