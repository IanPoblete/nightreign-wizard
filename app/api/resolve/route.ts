import { NextResponse } from "next/server";
import Papa from "papaparse";
import { getRedis } from "@/lib/redis";

type CsvRow = Record<string, string>;

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

async function getCsvRows(csvUrl: string): Promise<CsvRow[]> {
  const redis = await getRedis();
  const cacheKey = "nr:csv:rows:v1";

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as CsvRow[];

  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);

  const text = await res.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0);

  // Cache rows for 1 hour
  await redis.set(cacheKey, JSON.stringify(rows), { EX: 60 * 60 });

  return rows;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const unique: string = body?.unique;

    if (!unique || typeof unique !== "string") {
      return NextResponse.json({ error: "Missing unique" }, { status: 400 });
    }

    const csvUrl = process.env.NR_CSV_URL!;
    const patternBase = process.env.NR_PATTERN_BASE!;

    const rows = await getCsvRows(csvUrl);

    // If your CSV headers differ, change these:
    const UNIQUE_COL = "Unique";
    const INDEX_COL = "Index";

    const matches = rows
      .filter((r) => String(r[UNIQUE_COL]).trim() === unique.trim())
      .map((r) => Number(String(r[INDEX_COL]).trim()))
      .filter((n) => Number.isFinite(n));

    const images = matches.map((idx) => {
      const file = `${pad3(idx)}.jpg`;
      return { idx, file, url: `${patternBase}/${file}` };
    });

    // Store submission
    const redis = await getRedis();
    await redis.lPush("nr:submissions", JSON.stringify({ t: Date.now(), unique }));
    await redis.lTrim("nr:submissions", 0, 999);

    return NextResponse.json({
      unique,
      matches,
      images,
      count: images.length,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}