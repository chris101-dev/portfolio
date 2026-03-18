import { useEffect, useMemo, useState } from "react";

const TOTAL_TYPING_MS = 6500;
const HEADLINE_SUFFIX_DELAY_MS = 500;
const SUMMARY_START_DELAY_MS = 200;
const HEADLINE_BASE_TEXT =
  "I build robust pipelines that turn raw data into reliable decisions.";
const HEADLINE_SUFFIX_TEXT = "PS, and it looks good :)";
const SUMMARY_TEXT =
  "I bridge the gap between robust data architecture and high-performance web development. I design scalable data platforms and craft intuitive, responsive digital experiences.";

type TypedLine = {
  id: string;
  as: "p" | "h1";
  text: string;
  className: string;
};

type TypedState = {
  headlineBaseLength: number;
  headlineSuffixLength: number;
  summaryLength: number;
};

const typedLines: TypedLine[] = [
  {
    id: "headline",
    as: "h1",
    text: `${HEADLINE_BASE_TEXT}${HEADLINE_SUFFIX_TEXT}`,
    className:
      "font-display w-full text-3xl font-semibold text-white sm:text-4xl lg:text-5xl",
  },
  {
    id: "summary",
    as: "p",
    text: SUMMARY_TEXT,
    className: "w-full text-base leading-relaxed text-white sm:text-lg",
  },
];

const TOTAL_TYPED_CHARS =
  HEADLINE_BASE_TEXT.length + HEADLINE_SUFFIX_TEXT.length + SUMMARY_TEXT.length;
const TOTAL_PAUSE_MS = HEADLINE_SUFFIX_DELAY_MS + SUMMARY_START_DELAY_MS;
const TYPING_WINDOW_MS = Math.max(1, TOTAL_TYPING_MS - TOTAL_PAUSE_MS);

function toTypedState(elapsedMs: number): TypedState {
  const charsPerMs = TOTAL_TYPED_CHARS / TYPING_WINDOW_MS;
  let remainingMs = Math.max(0, elapsedMs);

  let headlineBaseLength = 0;
  let headlineSuffixLength = 0;
  let summaryLength = 0;

  const headlineBaseDurationMs = HEADLINE_BASE_TEXT.length / charsPerMs;
  const headlineSuffixDurationMs = HEADLINE_SUFFIX_TEXT.length / charsPerMs;
  const summaryDurationMs = SUMMARY_TEXT.length / charsPerMs;

  if (remainingMs < headlineBaseDurationMs) {
    headlineBaseLength = Math.floor(remainingMs * charsPerMs);
    return { headlineBaseLength, headlineSuffixLength, summaryLength };
  }

  headlineBaseLength = HEADLINE_BASE_TEXT.length;
  remainingMs -= headlineBaseDurationMs;

  if (remainingMs < HEADLINE_SUFFIX_DELAY_MS) {
    return { headlineBaseLength, headlineSuffixLength, summaryLength };
  }

  remainingMs -= HEADLINE_SUFFIX_DELAY_MS;

  if (remainingMs < headlineSuffixDurationMs) {
    headlineSuffixLength = Math.floor(remainingMs * charsPerMs);
    return { headlineBaseLength, headlineSuffixLength, summaryLength };
  }

  headlineSuffixLength = HEADLINE_SUFFIX_TEXT.length;
  remainingMs -= headlineSuffixDurationMs;

  if (remainingMs < SUMMARY_START_DELAY_MS) {
    return { headlineBaseLength, headlineSuffixLength, summaryLength };
  }

  remainingMs -= SUMMARY_START_DELAY_MS;

  if (remainingMs < summaryDurationMs) {
    summaryLength = Math.floor(remainingMs * charsPerMs);
  } else {
    summaryLength = SUMMARY_TEXT.length;
  }

  return { headlineBaseLength, headlineSuffixLength, summaryLength };
}

const INITIAL_TYPED_STATE: TypedState = {
  headlineBaseLength: 0,
  headlineSuffixLength: 0,
  summaryLength: 0,
};

export function TerminalTypedBlock() {
  const [typedState, setTypedState] = useState<TypedState>(INITIAL_TYPED_STATE);

  useEffect(() => {
    let rafId = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const elapsed = Math.min(now - startedAt, TOTAL_TYPING_MS);
      setTypedState(toTypedState(elapsed));

      if (elapsed < TOTAL_TYPING_MS) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const typedHeadlineBase = useMemo(
    () => HEADLINE_BASE_TEXT.slice(0, typedState.headlineBaseLength),
    [typedState.headlineBaseLength],
  );

  const typedHeadlineSuffix = useMemo(
    () => HEADLINE_SUFFIX_TEXT.slice(0, typedState.headlineSuffixLength),
    [typedState.headlineSuffixLength],
  );

  const typedHeadlineSuffixChars = useMemo(
    () => typedHeadlineSuffix.split(""),
    [typedHeadlineSuffix],
  );

  const typedSummary = useMemo(
    () => SUMMARY_TEXT.slice(0, typedState.summaryLength),
    [typedState.summaryLength],
  );

  const isHeadlineComplete =
    typedState.headlineBaseLength === HEADLINE_BASE_TEXT.length &&
    typedState.headlineSuffixLength === HEADLINE_SUFFIX_TEXT.length;

  const activeCursorLineId = isHeadlineComplete && typedState.summaryLength > 0
    ? "summary"
    : "headline";

  return (
    <div>
      <div
        aria-hidden="true"
        className="mb-5 h-px w-full bg-white"
      />

      <div className="space-y-4">
        {typedLines.map((line) => {
          const Element = line.as;
          const showCursor = activeCursorLineId === line.id;

          return (
            <Element key={line.id} className={`${line.className} relative`}>
              <span aria-hidden="true" className="invisible select-none">
                {line.id === "headline" ? (
                  <>
                    {HEADLINE_BASE_TEXT}
                    <br />
                    {HEADLINE_SUFFIX_TEXT}
                  </>
                ) : (
                  line.text
                )}
                _
              </span>

              <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                {line.id === "headline" ? (
                  <>
                    <span>{typedHeadlineBase}</span>
                    {typedHeadlineSuffixChars.length > 0 && (
                      <span className="block">
                        {typedHeadlineSuffixChars.map((char, index) => (
                          <span
                            key={`headline-suffix-char-${index}`}
                            className="terminal-sequence-row"
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{typedSummary}</span>
                )}
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
        I build robust pipelines that turn raw data into reliable decisions. PS, and it
        looks good :) I bridge the gap between robust data architecture and
        high-performance web development. I design scalable data platforms and
        craft intuitive, responsive digital experiences.
      </p>
    </div>
  );
}
