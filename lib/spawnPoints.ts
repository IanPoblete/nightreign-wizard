// Exact landing zones for each spawn point, as percentages of the blank map
// images in public/maps (x = left→right, y = top→bottom).
//
// Derived from thefifthmatt's pattern images: the blue spawn arrows were
// detected in every pattern, intersected to find where they converge, then
// projected onto our blank maps via a feature-matched homography. The five
// surface maps share the same geometry (within ~0.2%), so one table covers
// them all; Great Hollow uses its own map.

export type MapPoint = { x: number; y: number };

const SURFACE: Record<string, MapPoint> = {
  "Northeast of Saintsbridge": { x: 53.5, y: 20.0 },
  "West of Warmaster's Shack": { x: 18.1, y: 36.8 },
  "Below Summonwater Hawk": { x: 70.4, y: 36.6 },
  "Above Stormhill Tunnel Entrance": { x: 34.1, y: 41.6 },
  "Stormhill South of Gate": { x: 18.1, y: 58.3 },
  "Minor Erdtree": { x: 84.0, y: 59.4 },
  "East of Cavalry Bridge": { x: 54.4, y: 67.6 },
  "Far Southwest": { x: 16.2, y: 75.0 },
  "Southeast of Lake": { x: 57.5, y: 85.6 },
};

const GREAT_HOLLOW: Record<string, MapPoint> = {
  Northeast: { x: 86.0, y: 23.0 },
  Southwest: { x: 26.1, y: 71.7 },
  South: { x: 49.2, y: 84.8 },
};

export const MAP_IMAGES: Record<string, string> = {
  Default: "/maps/base-map.png",
  Mountaintop: "/maps/mountaintop.png",
  Crater: "/maps/crater.png",
  "Rotted Woods": "/maps/rotted-woods.png",
  Noklateo: "/maps/noklateo.png",
  "Great Hollow": "/maps/great-hollow.png",
};

export function mapImageFor(shiftingEarth: string): string {
  return MAP_IMAGES[shiftingEarth] ?? MAP_IMAGES.Default;
}

export function spawnPointPosition(
  shiftingEarth: string,
  spawnPoint: string
): MapPoint | null {
  const table = shiftingEarth === "Great Hollow" ? GREAT_HOLLOW : SURFACE;
  return table[spawnPoint] ?? null;
}
