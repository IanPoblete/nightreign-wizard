const SHEET_ID = "1qZX3MfipvtPbKwPjElyx9Rler4RXLd9CPrOv7c2XOWI";
const SHEET_TAB = "Patterns";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;

const CATEGORIES = [
  "Castle",
  "Major Base",
  "Minor Base",
  "Evergaol",
  "Arena Boss",
  "Field Boss",
  "Rotted Woods",
] as const;
type Category = (typeof CATEGORIES)[number];

export type SheetLocationMap = Record<string, string>;

export type SheetPattern = {
  id: string;
  nightlord: string;
  shiftingEarth: string;
  spawnPoint: string;
  specialEvent: string | null;
  night1Boss: string | null;
  night2Boss: string | null;
  extraNightBoss: string | null;
  night1Circle: string | null;
  night2Circle: string | null;
  castle: string | null;
  majorBase: SheetLocationMap;
  minorBase: SheetLocationMap;
  evergaol: SheetLocationMap;
  arenaBoss: string | null;
  fieldBoss: SheetLocationMap;
  rottedWoods: SheetLocationMap;
  rotBlessing: string | null;
  frenzyTower: string | null;
  scaleBearingMerchant: string | null;
};

export type SheetData = {
  patterns: SheetPattern[];
  locationNamesByCategory: Record<Category, string[]>;
};

function parseCsv(text: string): string[][] {
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

type ColumnSpec =
  | { kind: "id" }
  | { kind: "simple"; field: string }
  | { kind: "location"; category: Category };

const SIMPLE_FIELDS: Record<string, string> = {
  Nightlord: "nightlord",
  "Shifting Earth": "shiftingEarth",
  "Spawn Point": "spawnPoint",
  "Special Event": "specialEvent",
  "Night 1 Boss": "night1Boss",
  "Night 2 Boss": "night2Boss",
  "Extra Night Boss": "extraNightBoss",
  "Night 1 Circle": "night1Circle",
  "Night 2 Circle": "night2Circle",
  "Rot Blessing": "rotBlessing",
  "Frenzy Tower": "frenzyTower",
  "Scale-Bearing Merchant": "scaleBearingMerchant",
};

function classifyColumn(rawHeader: string, index: number): ColumnSpec | null {
  const header = rawHeader.trim();
  if (index === 0) return { kind: "id" };
  if (!header) return null;
  if (header in SIMPLE_FIELDS) return { kind: "simple", field: SIMPLE_FIELDS[header] };

  for (const category of CATEGORIES) {
    if (header.startsWith(category)) return { kind: "location", category };
  }

  console.warn(`Unrecognized sheet column: ${JSON.stringify(rawHeader)}`);
  return null;
}

function parseHeaderRow(headerRow: string[]): { specs: (ColumnSpec | null)[]; locationNamesByCategory: Record<Category, string[]> } {
  const locationNamesByCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, [] as string[]])
  ) as Record<Category, string[]>;

  const specs = headerRow.map((rawHeader, index) => {
    const spec = classifyColumn(rawHeader, index);
    if (spec?.kind === "location") {
      const location = rawHeader.trim().slice(spec.category.length).trim();
      locationNamesByCategory[spec.category].push(location);
    }
    return spec;
  });

  return { specs, locationNamesByCategory };
}

function buildPattern(
  row: string[],
  specs: (ColumnSpec | null)[],
  headerRow: string[]
): SheetPattern | null {
  const idRaw = row[0]?.trim();
  if (!idRaw) return null;

  const pattern: SheetPattern = {
    id: idRaw.padStart(3, "0"),
    nightlord: "",
    shiftingEarth: "",
    spawnPoint: "",
    specialEvent: null,
    night1Boss: null,
    night2Boss: null,
    extraNightBoss: null,
    night1Circle: null,
    night2Circle: null,
    castle: null,
    majorBase: {},
    minorBase: {},
    evergaol: {},
    arenaBoss: null,
    fieldBoss: {},
    rottedWoods: {},
    rotBlessing: null,
    frenzyTower: null,
    scaleBearingMerchant: null,
  };

  const locationFieldByCategory: Record<Category, "majorBase" | "minorBase" | "evergaol" | "fieldBoss" | "rottedWoods" | null> = {
    Castle: null,
    "Major Base": "majorBase",
    "Minor Base": "minorBase",
    Evergaol: "evergaol",
    "Arena Boss": null,
    "Field Boss": "fieldBoss",
    "Rotted Woods": "rottedWoods",
  };

  for (let col = 0; col < specs.length; col++) {
    const spec = specs[col];
    if (!spec) continue;
    const value = row[col]?.trim();
    if (!value) continue;

    if (spec.kind === "simple") {
      (pattern as unknown as Record<string, string>)[spec.field] = value;
    } else if (spec.kind === "location") {
      if (spec.category === "Castle") {
        pattern.castle = value;
      } else if (spec.category === "Arena Boss") {
        pattern.arenaBoss = value;
      } else {
        const field = locationFieldByCategory[spec.category];
        if (field) {
          const location = headerRow[col].trim().slice(spec.category.length).trim();
          pattern[field][location] = value;
        }
      }
    }
  }

  return pattern;
}

export function parseSheetCsv(csvText: string): SheetData {
  const rows = parseCsv(csvText).filter((r) => r.length > 1 || r[0] !== "");
  if (rows.length < 2) {
    throw new Error("Sheet CSV has no data rows");
  }

  const headerRow = rows[0];
  const { specs, locationNamesByCategory } = parseHeaderRow(headerRow);

  const patterns: SheetPattern[] = [];
  for (let i = 1; i < rows.length; i++) {
    const pattern = buildPattern(rows[i], specs, headerRow);
    if (pattern) patterns.push(pattern);
  }

  return { patterns, locationNamesByCategory };
}

export async function fetchSheetData(): Promise<SheetData> {
  const res = await fetch(SHEET_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  return parseSheetCsv(csvText);
}

if (require.main === module) {
  fetchSheetData().then((data) => {
    console.log(`Fetched ${data.patterns.length} patterns from sheet`);
    console.log("Sample:", JSON.stringify(data.patterns[0], null, 2));
    for (const category of CATEGORIES) {
      console.log(`${category}: ${data.locationNamesByCategory[category].length} locations`);
    }
  });
}
