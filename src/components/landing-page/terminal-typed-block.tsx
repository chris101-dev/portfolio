import { useEffect, useMemo, useState } from "react";

const TOTAL_TYPING_MS = 5000;

type TypedLine = {
  id: string;
  as: "p" | "h1";
  text: string;
  className: string;
};

const typedLines: TypedLine[] = [
  {
    id: "headline",
    as: "h1",
    text: "Build robust pipelines that turn raw data into reliable decisions.",
    className:
      "font-display max-w-2xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl",
  },
  {
    id: "summary",
    as: "p",
    text: "I design and operate scalable data platforms across ingestion, transformation, orchestration, and observability.",
    className: "max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg",
  },
];

function toTypedLengths(lines: TypedLine[], visibleChars: number): number[] {
  let remainingChars = visibleChars;

  return lines.map((line) => {
    const typedCount = Math.min(Math.max(remainingChars, 0), line.text.length);
    remainingChars -= line.text.length;
    return typedCount;
  });
}

export function TerminalTypedBlock() {
  const [visibleChars, setVisibleChars] = useState(0);

  const totalChars = useMemo(
    () => typedLines.reduce((sum, line) => sum + line.text.length, 0),
    [],
  );

  useEffect(() => {
    let rafId = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / TOTAL_TYPING_MS, 1);
      setVisibleChars(Math.floor(totalChars * progress));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [totalChars]);

  const typedLengths = useMemo(
    () => toTypedLengths(typedLines, visibleChars),
    [visibleChars],
  );

  const activeLineIndex = typedLengths.findIndex(
    (typedLength, index) => typedLength < typedLines[index].text.length,
  );

  return (
    <div>
      <div
        aria-hidden="true"
        className="mb-5 h-px w-full bg-emerald-300/90"
      />

      <div className="space-y-4">
        {typedLines.map((line, index) => {
          const Element = line.as;
          const typedText = line.text.slice(0, typedLengths[index]);
          const showCursor =
            activeLineIndex === -1
              ? index === typedLines.length - 1
              : index === activeLineIndex;

          return (
            <Element key={line.id} className={`${line.className} relative`}>
              <span aria-hidden="true" className="invisible select-none">
                {line.text}
                _
              </span>

              <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                <span>{typedText}</span>
                <span
                  className={showCursor ? "terminal-cursor-trailing" : "terminal-cursor-trailing invisible"}
                >
                  _
                </span>
              </span>
            </Element>
          );
        })}
      </div>

      <p className="sr-only">
        Build robust pipelines that turn raw data into reliable decisions. I
        design and operate scalable data platforms across ingestion,
        transformation, orchestration, and observability.
      </p>
    </div>
  );
}
