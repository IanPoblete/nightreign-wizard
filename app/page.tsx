"use client";

import React, { useMemo, useState } from "react";
import { PATTERNS, type Pattern } from "@/lib/patterns";

type LandmarkCategoryKey = "majorBase" | "minorBase" | "evergaol" | "fieldBoss";

const LANDMARK_CATEGORIES: { label: string; key: LandmarkCategoryKey }[] = [
  { label: "Major Base", key: "majorBase" },
  { label: "Minor Base", key: "minorBase" },
  { label: "Evergaol", key: "evergaol" },
  { label: "Field Boss", key: "fieldBoss" },
];

type Landmark = {
  category: string;
  key: LandmarkCategoryKey;
  location: string;
  occupant: string;
};

const PATTERN_BASE =
  process.env.NEXT_PUBLIC_NR_PATTERN_BASE ??
  "https://thefifthmatt.com/nightreign/pattern";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function imageUrl(id: string) {
  const num = parseInt(id, 10);
  return `${PATTERN_BASE}/${num >= 1000 ? id : pad3(num)}.jpg`;
}

function OptionButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`optionBtn ${selected ? "optionBtnSelected" : ""}`}
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function QuadrantMap({
  shiftingEarth,
  selected,
  onSelect,
  availableQuadrants,
}: {
  shiftingEarth: string;
  selected: "TL" | "TR" | "BL" | "BR" | null;
  onSelect: (q: "TL" | "TR" | "BL" | "BR") => void;
  availableQuadrants: Set<string>;
}) {
  const mapImages: Record<string, string> = {
    Default: "/maps/base-map.png",
    Mountaintop: "/maps/mountaintop.png",
    Crater: "/maps/crater.png",
    "Rotted Woods": "/maps/rotted-woods.png",
    Noklateo: "/maps/noklateo.png",
    "Great Hollow": "/maps/great-hollow.png",
  };
  const mapSrc = mapImages[shiftingEarth] ?? "/maps/base-map.png";

  const quadrants: { key: "TL" | "TR" | "BL" | "BR"; label: string }[] = [
    { key: "TL", label: "Top Left" },
    { key: "TR", label: "Top Right" },
    { key: "BL", label: "Bottom Left" },
    { key: "BR", label: "Bottom Right" },
  ];

  return (
    <div className="mapContainer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mapImage" src={mapSrc} alt="Map" />
      <div className="quadrantOverlay">
        {quadrants.map((q) => {
          const available = availableQuadrants.has(q.key);
          return (
            <button
              key={q.key}
              className={`quadrant ${selected === q.key ? "quadrantSelected" : ""} ${!available ? "quadrantDisabled" : ""}`}
              onClick={() => available && onSelect(q.key)}
              type="button"
              disabled={!available}
            >
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [nightlord, setNightlord] = useState<string | null>(null);
  const [shiftingEarth, setShiftingEarth] = useState<string | null>(null);
  const [quadrant, setQuadrant] = useState<"TL" | "TR" | "BL" | "BR" | null>(null);
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [imgPos, setImgPos] = useState(0);

  const filtered = useMemo(() => {
    let p: Pattern[] = PATTERNS;
    if (nightlord) p = p.filter((x) => x.nightlord === nightlord);
    if (shiftingEarth) p = p.filter((x) => x.shiftingEarth === shiftingEarth);
    if (quadrant) p = p.filter((x) => x.quadrant === quadrant);
    if (landmark) {
      p = p.filter(
        (x) => x.details === null || x.details[landmark.key]?.[landmark.location] === landmark.occupant
      );
    }
    return p;
  }, [nightlord, shiftingEarth, quadrant, landmark]);

  const nightlords = useMemo(
    () => [...new Set(PATTERNS.map((p) => p.nightlord))],
    []
  );

  const availableShiftingEarths = useMemo(() => {
    if (!nightlord) return [];
    return [
      ...new Set(
        PATTERNS.filter((p) => p.nightlord === nightlord).map((p) => p.shiftingEarth)
      ),
    ];
  }, [nightlord]);

  const availableQuadrants = useMemo(() => {
    if (!nightlord || !shiftingEarth) return new Set<string>();
    return new Set(
      PATTERNS.filter(
        (p) => p.nightlord === nightlord && p.shiftingEarth === shiftingEarth
      ).map((p) => p.quadrant)
    );
  }, [nightlord, shiftingEarth]);

  const quadrantCandidates = useMemo(() => {
    if (!nightlord || !shiftingEarth || !quadrant) return [];
    return PATTERNS.filter(
      (p) =>
        p.nightlord === nightlord &&
        p.shiftingEarth === shiftingEarth &&
        p.quadrant === quadrant
    );
  }, [nightlord, shiftingEarth, quadrant]);

  const availableLandmarks = useMemo(() => {
    const seen = new Map<string, Landmark>();
    for (const p of quadrantCandidates) {
      if (!p.details) continue;
      for (const { label, key } of LANDMARK_CATEGORIES) {
        for (const [location, occupant] of Object.entries(p.details[key])) {
          if (!occupant) continue;
          const dedupeKey = `${key}|${location}|${occupant}`;
          if (!seen.has(dedupeKey)) {
            seen.set(dedupeKey, { category: label, key, location, occupant });
          }
        }
      }
    }
    return [...seen.values()].sort(
      (a, b) => a.category.localeCompare(b.category) || a.location.localeCompare(b.location)
    );
  }, [quadrantCandidates]);

  const hasLandmarkData = availableLandmarks.length > 0;

  const totalSteps = hasLandmarkData ? 4 : 3;
  const isLastStep = step === totalSteps - 1;
  const showResults = step >= totalSteps;

  const canNext = useMemo(() => {
    if (step === 0) return !!nightlord;
    if (step === 1) return !!shiftingEarth;
    if (step === 2) return !!quadrant;
    if (step === 3 && hasLandmarkData) return !!landmark;
    return false;
  }, [step, nightlord, shiftingEarth, quadrant, landmark, hasLandmarkData]);

  function next() {
    if (!canNext) return;
    if (step === 2 && !hasLandmarkData) {
      setStep(totalSteps);
    } else if (isLastStep) {
      setStep(totalSteps);
    } else {
      setStep((s) => s + 1);
    }
    setImgPos(0);
  }

  function back() {
    if (showResults) {
      if (hasLandmarkData) {
        setStep(3);
      } else {
        setStep(2);
      }
      return;
    }
    if (step === 3 && !hasLandmarkData) {
      setStep(2);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setStep(0);
    setNightlord(null);
    setShiftingEarth(null);
    setQuadrant(null);
    setLandmark(null);
    setImgPos(0);
  }

  const currentImage = filtered[imgPos];

  return (
    <div className="pixelWrap">
      <div className="frame">
        <h1 className="title">Nightreign Pattern Finder</h1>

        {showResults ? (
          <>
            <div className="answerBox">
              <div>Selected:</div>
              <div className="mini">
                Nightlord: {nightlord} <br />
                Shifting Earth: {shiftingEarth} <br />
                Spawn Quadrant: {quadrant} <br />
                {landmark && (
                  <>
                    {landmark.category}: {landmark.location} — {landmark.occupant} <br />
                  </>
                )}
              </div>
            </div>

            <div className="imgWrap">
              <div>
                Matches: {filtered.length}{" "}
                {filtered.length === 1 ? "pattern" : "patterns"}
              </div>

              {filtered.length === 0 ? (
                <div className="mini">No patterns found for this combination.</div>
              ) : (
                <>
                  <div className="mini">
                    Showing {imgPos + 1} / {filtered.length} — Pattern #
                    {currentImage?.id}
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="pixelImg"
                    src={imageUrl(currentImage?.id ?? "000")}
                    alt={`Pattern ${currentImage?.id}`}
                  />

                  {filtered.length > 1 && (
                    <div className="carousel">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setImgPos((p) => Math.max(0, p - 1))}
                        disabled={imgPos === 0}
                      >
                        Prev
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          setImgPos((p) =>
                            Math.min(filtered.length - 1, p + 1)
                          )
                        }
                        disabled={imgPos === filtered.length - 1}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="controls">
              <button className="btn" onClick={back} type="button">
                Back
              </button>
              <button className="btn" onClick={restart} type="button">
                Restart
              </button>
            </div>
          </>
        ) : (
          <>
            {step === 0 && (
              <>
                <div className="question">Step 1: Nightlord</div>
                <div className="optionsList">
                  {nightlords.map((n) => (
                    <OptionButton
                      key={n}
                      label={n}
                      selected={nightlord === n}
                      onClick={() => {
                        setNightlord(n);
                        setShiftingEarth(null);
                        setQuadrant(null);
                        setLandmark(null);
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="question">Step 2: Shifting Earth</div>
                <div className="optionsList">
                  {availableShiftingEarths.map((se) => (
                    <OptionButton
                      key={se}
                      label={se}
                      selected={shiftingEarth === se}
                      onClick={() => {
                        setShiftingEarth(se);
                        setQuadrant(null);
                        setLandmark(null);
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="question">Step 3: Spawn Point</div>
                <div className="mini" style={{ marginBottom: 12 }}>
                  Click the quadrant where you spawned
                </div>
                <QuadrantMap
                  shiftingEarth={shiftingEarth ?? "Default"}
                  selected={quadrant}
                  onSelect={(q) => {
                    setQuadrant(q);
                    setLandmark(null);
                  }}
                  availableQuadrants={availableQuadrants}
                />
              </>
            )}

            {step === 3 && hasLandmarkData && (
              <>
                <div className="question">Step 4: Nearby Landmark</div>
                <div className="mini" style={{ marginBottom: 12 }}>
                  What do you see near your spawn point?
                </div>
                <div className="optionsList">
                  {availableLandmarks.map((l) => {
                    const dedupeKey = `${l.key}|${l.location}|${l.occupant}`;
                    return (
                      <OptionButton
                        key={dedupeKey}
                        label={`${l.category}: ${l.location} — ${l.occupant}`}
                        selected={
                          landmark?.key === l.key &&
                          landmark?.location === l.location &&
                          landmark?.occupant === l.occupant
                        }
                        onClick={() => setLandmark(l)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div className="controls">
              <button
                className="btn"
                onClick={back}
                disabled={step === 0}
                type="button"
              >
                Back
              </button>
              <button
                className="btn"
                onClick={next}
                disabled={!canNext}
                type="button"
              >
                {isLastStep ? "Find Patterns" : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
