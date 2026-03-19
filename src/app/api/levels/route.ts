import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CsvLevelRow = {
  id: string;
  rangeLow: number;
  rangeHigh: number;
  center: number;
  score: number;
  levelKind: string;
};

const LEVELS_CSV_PATH = path.join(
  process.cwd(),
  "src",
  "res",
  "15M_BTCUSDC_levels.csv",
);

function toNumber(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseCsv(content: string): CsvLevelRow[] {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].split(",").map((header) => header.trim());
  const indexByHeader = new Map<string, number>();
  headers.forEach((header, index) => {
    indexByHeader.set(header, index);
  });

  const rangeLowIndex = indexByHeader.get("range_low");
  const rangeHighIndex = indexByHeader.get("range_high");
  const centerIndex = indexByHeader.get("center");
  const scoreIndex = indexByHeader.get("score");
  const levelKindIndex = indexByHeader.get("level_kind");

  if (
    rangeLowIndex === undefined ||
    rangeHighIndex === undefined ||
    centerIndex === undefined
  ) {
    return [];
  }

  const parsedLevels: CsvLevelRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const columns = rows[rowIndex].split(",");

    const rangeLow = toNumber(columns[rangeLowIndex]);
    const rangeHigh = toNumber(columns[rangeHighIndex]);
    const center = toNumber(columns[centerIndex]);

    if (rangeLow === null || rangeHigh === null || center === null) {
      continue;
    }

    const normalizedLow = Math.min(rangeLow, rangeHigh);
    const normalizedHigh = Math.max(rangeLow, rangeHigh);

    parsedLevels.push({
      id: `csv-level-${rowIndex}`,
      rangeLow: normalizedLow,
      rangeHigh: normalizedHigh,
      center,
      score: toNumber(scoreIndex === undefined ? undefined : columns[scoreIndex]) ?? 0,
      levelKind:
        (levelKindIndex === undefined ? "" : columns[levelKindIndex] ?? "").trim() ||
        "unknown",
    });
  }

  parsedLevels.sort((left, right) => right.score - left.score);

  return parsedLevels;
}

export async function GET() {
  try {
    const csvContent = await readFile(LEVELS_CSV_PATH, "utf-8");
    return NextResponse.json({ levels: parseCsv(csvContent) });
  } catch (error) {
    return NextResponse.json(
      {
        levels: [],
        error: error instanceof Error ? error.message : "Failed to load levels CSV.",
      },
      { status: 500 },
    );
  }
}
