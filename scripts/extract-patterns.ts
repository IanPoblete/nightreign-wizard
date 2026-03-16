import * as fs from "fs";
import * as path from "path";

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

const MINOR_BASE_COLUMNS: Record<string, number> = {
  "Far Southwest": 27,
  Lake: 28,
  "Stormhill South of Gate": 29,
  "Above Stormhill Tunnel Entrance": 30,
  "West of Warmaster's Shack": 31,
  "Southeast of Lake": 32,
  "East of Cavalry Bridge": 33,
  "Minor Erdtree": 34,
  "Below Summonwater Hawk": 35,
  "Third Church": 36,
  "Northeast of Saintsbridge": 37,
};

type Pattern = {
  id: string;
  nightlord: string;
  spawnPoint: string;
  shiftingEarth: string;
  quadrant: "TL" | "TR" | "BL" | "BR";
  camp: string | null;
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
        });
      }
    }
  }

  return patterns;
}

function parseCsvSimple(csvPath: string): string[][] {
  const text = fs.readFileSync(csvPath, "utf-8");
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function mergeCampData(
  patterns: Pattern[],
  csvPath: string
): void {
  if (!fs.existsSync(csvPath)) {
    console.warn(`CSV not found: ${csvPath}, skipping camp data`);
    return;
  }

  const rows = parseCsvSimple(csvPath);
  if (rows.length < 3) {
    console.warn("CSV has fewer than 3 rows");
    return;
  }

  const subHeaders = rows[1];

  const patternById = new Map<string, Pattern>();
  for (const p of patterns) {
    patternById.set(p.id, p);
  }

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const indexStr = row[0]?.trim();
    if (!indexStr) continue;

    const spawnPoint = row[3]?.trim();
    if (!spawnPoint) continue;

    const { base } = parseShiftingEarth(spawnPoint);

    const colIdx = MINOR_BASE_COLUMNS[base];
    if (colIdx === undefined) continue;

    const campValue = row[colIdx]?.trim();
    if (!campValue) continue;

    const pattern = patternById.get(indexStr);
    if (pattern) {
      pattern.camp = campValue;
    } else {
      const padded = indexStr.padStart(3, "0");
      const patternPadded = patternById.get(padded);
      if (patternPadded) {
        patternPadded.camp = campValue;
      }
    }
  }
}

function generateOutput(patterns: Pattern[]): string {
  const nightlords = [...new Set(patterns.map((p) => p.nightlord))];
  const shiftingEarths = [...new Set(patterns.map((p) => p.shiftingEarth))];
  const camps = [
    ...new Set(patterns.map((p) => p.camp).filter((c): c is string => c !== null)),
  ];

  const patternLines = patterns
    .map(
      (p) =>
        `  { id: ${JSON.stringify(p.id)}, nightlord: ${JSON.stringify(p.nightlord)}, spawnPoint: ${JSON.stringify(p.spawnPoint)}, shiftingEarth: ${JSON.stringify(p.shiftingEarth)}, quadrant: ${JSON.stringify(p.quadrant)}, camp: ${p.camp === null ? "null" : JSON.stringify(p.camp)} }`
    )
    .join(",\n");

  return `export type Pattern = {
  id: string;
  nightlord: string;
  spawnPoint: string;
  shiftingEarth: string;
  quadrant: "TL" | "TR" | "BL" | "BR";
  camp: string | null;
};

export const PATTERNS: Pattern[] = [
${patternLines},
];

export const NIGHTLORDS = ${JSON.stringify(nightlords)} as const;
export const SHIFTING_EARTHS = ${JSON.stringify(shiftingEarths)} as const;
export const CAMPS = ${JSON.stringify(camps)} as const;
`;
}

// --- Main ---
const args = process.argv.slice(2);
const nightreignDir = args[0];
const csvFlag = args.indexOf("--csv");
const csvPath = csvFlag !== -1 ? args[csvFlag + 1] : undefined;

if (!nightreignDir) {
  console.error(
    "Usage: npx tsx scripts/extract-patterns.ts <nightreign-dir> [--csv <csv-path>]"
  );
  process.exit(1);
}

console.log(`Parsing NRPatterns HTML from: ${nightreignDir}`);
const patterns = parseHtmlPatterns(nightreignDir);
console.log(`Extracted ${patterns.length} patterns from HTML`);

if (csvPath) {
  console.log(`Merging camp data from: ${csvPath}`);
  mergeCampData(patterns, csvPath);
  const withCamp = patterns.filter((p) => p.camp !== null).length;
  console.log(`Camp data merged: ${withCamp}/${patterns.length} patterns have camp data`);
}

patterns.sort((a, b) => {
  const aNum = parseInt(a.id, 10);
  const bNum = parseInt(b.id, 10);
  return aNum - bNum;
});

const output = generateOutput(patterns);
const outPath = path.join(__dirname, "..", "lib", "patterns.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf-8");
console.log(`Written to: ${outPath}`);
console.log(`  Nightlords: ${[...new Set(patterns.map((p) => p.nightlord))].length}`);
console.log(`  Shifting Earths: ${[...new Set(patterns.map((p) => p.shiftingEarth))].length}`);
console.log(`  Unique camps: ${[...new Set(patterns.filter((p) => p.camp).map((p) => p.camp))].length}`);
