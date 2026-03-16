"use client";

import React, { useMemo, useState } from "react";
import { PATTERNS, type Pattern } from "@/lib/patterns";

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
  const mapSrc =
    shiftingEarth === "Great Hollow"
      ? "/maps/great-hollow.png"
      : "/maps/base-map.png";

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
  const [camp, setCamp] = useState<string | null>(null);
  const [imgPos, setImgPos] = useState(0);

  const filtered = useMemo(() => {
    let p: Pattern[] = PATTERNS;
    if (nightlord) p = p.filter((x) => x.nightlord === nightlord);
    if (shiftingEarth) p = p.filter((x) => x.shiftingEarth === shiftingEarth);
    if (quadrant) p = p.filter((x) => x.quadrant === quadrant);
    if (camp) p = p.filter((x) => x.camp === camp || x.camp === null);
    return p;
  }, [nightlord, shiftingEarth, quadrant, camp]);

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

  const hasCampData = useMemo(() => {
    if (!nightlord || !shiftingEarth || !quadrant) return false;
    return PATTERNS.filter(
      (p) =>
        p.nightlord === nightlord &&
        p.shiftingEarth === shiftingEarth &&
        p.quadrant === quadrant
    ).some((p) => p.camp !== null);
  }, [nightlord, shiftingEarth, quadrant]);

  const availableCamps = useMemo(() => {
    if (!nightlord || !shiftingEarth || !quadrant) return [];
    return [
      ...new Set(
        PATTERNS.filter(
          (p) =>
            p.nightlord === nightlord &&
            p.shiftingEarth === shiftingEarth &&
            p.quadrant === quadrant &&
            p.camp !== null
        ).map((p) => p.camp as string)
      ),
    ].sort();
  }, [nightlord, shiftingEarth, quadrant]);

  const totalSteps = hasCampData ? 4 : 3;
  const isLastStep = step === totalSteps - 1;
  const showResults = step >= totalSteps;

  const canNext = useMemo(() => {
    if (step === 0) return !!nightlord;
    if (step === 1) return !!shiftingEarth;
    if (step === 2) return !!quadrant;
    if (step === 3 && hasCampData) return !!camp;
    return false;
  }, [step, nightlord, shiftingEarth, quadrant, camp, hasCampData]);

  function next() {
    if (!canNext) return;
    if (step === 2 && !hasCampData) {
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
      if (hasCampData) {
        setStep(3);
      } else {
        setStep(2);
      }
      return;
    }
    if (step === 3 && !hasCampData) {
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
    setCamp(null);
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
                {camp && (
                  <>
                    First Camp: {camp} <br />
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
                        setCamp(null);
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
                        setCamp(null);
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
                    setCamp(null);
                  }}
                  availableQuadrants={availableQuadrants}
                />
              </>
            )}

            {step === 3 && hasCampData && (
              <>
                <div className="question">Step 4: First Camp</div>
                <div className="mini" style={{ marginBottom: 12 }}>
                  What is near your spawn point?
                </div>
                <div className="optionsList">
                  {availableCamps.map((c) => (
                    <OptionButton
                      key={c}
                      label={c}
                      selected={camp === c}
                      onClick={() => setCamp(c)}
                    />
                  ))}
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
