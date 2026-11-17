import * as fs from "fs";
import * as path from "path";
import { fetchSheetData, type SheetData, type SheetPattern } from "./fetch-sheet";

const NIGHTLORD_MAP: Record<string, string> = {
  gladius: "Tricephalos",
  adel: "Gaping Jaw",
  gnoster: "Sentient Pest",
  maris: "Augur",
  libra: "Equilibrious Beast",
  fulghor: "Darkdrift Knight",
  caligo: "Fissure in the Fog",
  heolstor: "Night Aspect",
  harmonia: "Balancers",
  straghess: "Dreglord",
};

// Sheet rows identify nightlords by folder-style name (e.g. "Gladius"), not
// the in-game display name (e.g. "Tricephalos") used elsewhere in this file.
const SHEET_NIGHTLORD_TO_DISPLAY: Record<string, string> = Object.fromEntries(
  Object.entries(NIGHTLORD_MAP).map(([folder, display]) => [
    folder[0].toUpperCase() + folder.slice(1),
    display,
  ])
);

const QUADRANT_MAP: Record<string, "TL" | "TR" | "BL" | "BR"> = {
  "Southeast of Lake": "TL",
  "Stormhill South of Gate": "TL",
  "Above Stormhill Tunnel Entrance": "TL",
  "West of Warmaster's Shack": "TL",
  "Below Summonwater Hawk": "TR",
  "Minor Erdtree": "TR",
  "East of Cavalry Bridge": "TR",
  "Far Southwest": "BL",
  "Northeast of Saintsbridge": "BR",
  Northeast: "TR",
  Southwest: "BL",
  South: "BR",
};

export type LocationMap = Partial<Record<string, string>>;

export type PatternDetails = {
  specialEvent: string | null;
  night1Boss: string | null;
  night2Boss: string | null;
  extraNightBoss: string | null;
  night1Circle: string | null;
  night2Circle: string | null;
  castle: string | null;
  majorBase: LocationMap;
  minorBase: LocationMap;
  evergaol: LocationMap;
  fieldBoss: LocationMap;
  arenaBoss: string | null;
  rottedWoods: LocationMap | null;
  rotBlessing: string | null;
  frenzyTower: string | null;
  scaleBearingMerchant: string | null;
};

type Pattern = {
  id: string;
  nightlord: string;
  spawnPoint: string;
  shiftingEarth: string;
  quadrant: "TL" | "TR" | "BL" | "BR";
  camp: string | null;
  details: PatternDetails | null;
};

function parseShiftingEarth(spawnPoint: string): {
  base: string;
  shiftingEarth: string;
} {
  const match = spawnPoint.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return { base: match[1].trim(), shiftingEarth: match[2].trim() };
  }
  return { base: spawnPoint, shiftingEarth: "Default" };
}

function getQuadrant(baseSpawn: string): "TL" | "TR" | "BL" | "BR" {
  if (QUADRANT_MAP[baseSpawn]) return QUADRANT_MAP[baseSpawn];

  const lower = baseSpawn.toLowerCase();
  if (lower.includes("northeast")) return "TR";
  if (lower.includes("southwest")) return "BL";
  if (lower.includes("southeast")) return "BR";
  if (lower.includes("northwest")) return "TL";
  if (lower.includes("south")) return "BR";
  if (lower.includes("north")) return "TR";
  if (lower.includes("east")) return "TR";
  if (lower.includes("west")) return "TL";

  console.warn(`Unknown spawn point for quadrant: "${baseSpawn}", defaulting to TL`);
  return "TL";
}

function parseHtmlPatterns(nightreignDir: string): Pattern[] {
  const patterns: Pattern[] = [];
  const folders = Object.keys(NIGHTLORD_MAP);

  for (const folder of folders) {
    const indexPath = path.join(nightreignDir, folder, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.warn(`Missing: ${indexPath}`);
      continue;
    }

    const html = fs.readFileSync(indexPath, "utf-8");
    const nightlord = NIGHTLORD_MAP[folder];

    const spawngridMatch = html.match(
      /id="spawngrid"[^>]*>([\s\S]*?)(?:<\/div>\s*<script|<\/div>\s*$)/
    );
    if (!spawngridMatch) {
      console.warn(`No spawngrid found in ${indexPath}`);
      continue;
    }

    const spawngrid = spawngridMatch[1];
    const fieldsetRegex =
      /<fieldset\s+class="spawnset">\s*<legend>(.*?)<\/legend>([\s\S]*?)<\/fieldset>/g;
    let fsMatch;

    while ((fsMatch = fieldsetRegex.exec(spawngrid)) !== null) {
      const spawnPoint = fsMatch[1].trim();
      const content = fsMatch[2];
      const { base, shiftingEarth } = parseShiftingEarth(spawnPoint);
      const quadrant = getQuadrant(base);

      const hrefRegex = /href="(\d+)\.html"/g;
      let hrefMatch;
      while ((hrefMatch = hrefRegex.exec(content)) !== null) {
        const id = hrefMatch[1];
        patterns.push({
          id,
          nightlord,
          spawnPoint: base,
          shiftingEarth,
          quadrant,
          camp: null,
          details: null,
        });
      }
    }
  }

  return patterns;
}

function toDetails(sheetPattern: SheetPattern): PatternDetails {
  return {
    specialEvent: sheetPattern.specialEvent,
    night1Boss: sheetPattern.night1Boss,
    night2Boss: sheetPattern.night2Boss,
    extraNightBoss: sheetPattern.extraNightBoss,
    night1Circle: sheetPattern.night1Circle,
    night2Circle: sheetPattern.night2Circle,
    castle: sheetPattern.castle,
    majorBase: sheetPattern.majorBase,
    minorBase: sheetPattern.minorBase,
    evergaol: sheetPattern.evergaol,
    fieldBoss: sheetPattern.fieldBoss,
    arenaBoss: sheetPattern.arenaBoss,
    rottedWoods:
      Object.keys(sheetPattern.rottedWoods).length > 0 ? sheetPattern.rottedWoods : null,
    rotBlessing: sheetPattern.rotBlessing,
    frenzyTower: sheetPattern.frenzyTower,
    scaleBearingMerchant: sheetPattern.scaleBearingMerchant,
  };
}

function mergeSheetData(patterns: Pattern[], sheet: SheetData): void {
  const sheetById = new Map<string, SheetPattern>();
  for (const sp of sheet.patterns) sheetById.set(sp.id, sp);

  let matched = 0;
  for (const pattern of patterns) {
    const sheetPattern = sheetById.get(pattern.id);
    if (!sheetPattern) continue;

    const expectedNightlord = SHEET_NIGHTLORD_TO_DISPLAY[sheetPattern.nightlord];
    if (
      expectedNightlord !== pattern.nightlord ||
      sheetPattern.shiftingEarth !== pattern.shiftingEarth ||
      sheetPattern.spawnPoint !== pattern.spawnPoint
    ) {
      console.warn(
        `Sheet/HTML mismatch for id ${pattern.id}: ` +
          `HTML(${pattern.nightlord}, ${pattern.shiftingEarth}, ${pattern.spawnPoint}) vs ` +
          `sheet(${expectedNightlord}, ${sheetPattern.shiftingEarth}, ${sheetPattern.spawnPoint})`
      );
    }

    pattern.details = toDetails(sheetPattern);
    pattern.camp = sheetPattern.minorBase[pattern.spawnPoint] ?? null;
    matched++;
  }

  console.log(`Merged sheet data into ${matched}/${patterns.length} patterns`);

  const EXPECTED_WITH_DETAILS = 320;
  const EXPECTED_WITHOUT_DETAILS = 200;
  const withDetails = patterns.filter((p) => p.details !== null).length;
  const withoutDetails = patterns.length - withDetails;
  if (withDetails !== EXPECTED_WITH_DETAILS || withoutDetails !== EXPECTED_WITHOUT_DETAILS) {
    console.warn(
      `Unexpected details split: ${withDetails} with details, ${withoutDetails} without ` +
        `(expected ${EXPECTED_WITH_DETAILS}/${EXPECTED_WITHOUT_DETAILS}). ` +
        `The sheet or HTML source may have changed shape.`
    );
  }
}

function generateOutput(
  patterns: Pattern[],
  locationNamesByCategory: SheetData["locationNamesByCategory"]
): string {
  const nightlords = [...new Set(patterns.map((p) => p.nightlord))];
  const shiftingEarths = [...new Set(patterns.map((p) => p.shiftingEarth))];
  const camps = [
    ...new Set(patterns.map((p) => p.camp).filter((c): c is string => c !== null)),
  ];

  const patternLines = patterns
    .map((p) => `  ${JSON.stringify(p)}`)
    .join(",\n");

  return `export type LocationMap = Partial<Record<string, string>>;

export type PatternDetails = {
  specialEvent: string | null;
  night1Boss: string | null;
  night2Boss: string | null;
  extraNightBoss: string | null;
  night1Circle: string | null;
  night2Circle: string | null;
  castle: string | null;
  majorBase: LocationMap;
  minorBase: LocationMap;
  evergaol: LocationMap;
  fieldBoss: LocationMap;
  arenaBoss: string | null;
  rottedWoods: LocationMap | null;
  rotBlessing: string | null;
  frenzyTower: string | null;
  scaleBearingMerchant: string | null;
};

export type Pattern = {
  id: string;
  nightlord: string;
  spawnPoint: string;
  shiftingEarth: string;
  quadrant: "TL" | "TR" | "BL" | "BR";
  camp: string | null;
  details: PatternDetails | null;
};

export const PATTERNS: Pattern[] = [
${patternLines},
];

export const NIGHTLORDS = ${JSON.stringify(nightlords)} as const;
export const SHIFTING_EARTHS = ${JSON.stringify(shiftingEarths)} as const;
export const CAMPS = ${JSON.stringify(camps)} as const;

export const LOCATION_NAMES_BY_CATEGORY: Record<string, string[]> = ${JSON.stringify(
    locationNamesByCategory,
    null,
    2
  )};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const nightreignDir = args[0];

  if (!nightreignDir) {
    console.error("Usage: npx tsx scripts/extract-patterns.ts <nightreign-dir>");
    process.exit(1);
  }

  console.log(`Parsing NRPatterns HTML from: ${nightreignDir}`);
  const patterns = parseHtmlPatterns(nightreignDir);
  console.log(`Extracted ${patterns.length} patterns from HTML`);

  console.log("Fetching pattern sheet...");
  const sheet = await fetchSheetData();
  console.log(`Fetched ${sheet.patterns.length} patterns from sheet`);
  mergeSheetData(patterns, sheet);

  patterns.sort((a, b) => {
    const aNum = parseInt(a.id, 10);
    const bNum = parseInt(b.id, 10);
    return aNum - bNum;
  });

  const output = generateOutput(patterns, sheet.locationNamesByCategory);
  const outPath = path.join(__dirname, "..", "lib", "patterns.ts");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, "utf-8");
  console.log(`Written to: ${outPath}`);
  console.log(`  Nightlords: ${new Set(patterns.map((p) => p.nightlord)).size}`);
  console.log(`  Shifting Earths: ${new Set(patterns.map((p) => p.shiftingEarth)).size}`);
  console.log(`  Patterns with details: ${patterns.filter((p) => p.details !== null).length}`);
}

main();
