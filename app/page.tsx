"use client";

import React, { useMemo, useState } from "react";
import { PATTERNS, type Pattern } from "@/lib/patterns";
import { mapImageFor, spawnPointPosition } from "@/lib/spawnPoints";

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

function SpawnMap({
  shiftingEarth,
  spawnPoints,
  selected,
  onSelect,
}: {
  shiftingEarth: string;
  spawnPoints: string[];
  selected: string | null;
  onSelect: (spawnPoint: string) => void;
}) {
  return (
    <div className="mapContainer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mapImage" src={mapImageFor(shiftingEarth)} alt={`${shiftingEarth} map`} />
      <div className="spawnOverlay">
        {spawnPoints.map((sp) => {
          const pos = spawnPointPosition(shiftingEarth, sp);
          if (!pos) return null;
          return (
            <button
              key={sp}
              type="button"
              className={`spawnCircle ${selected === sp ? "spawnCircleSelected" : ""}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onSelect(sp)}
              title={sp}
              aria-label={`Spawned at ${sp}`}
            >
              <span className="spawnLabel">{sp}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function campOptionsFor(
  nightlord: string | null,
  shiftingEarth: string | null,
  spawnPoint: string | null
): string[] {
  if (!nightlord || !shiftingEarth || !spawnPoint) return [];
  return [
    ...new Set(
      PATTERNS.filter(
        (p) =>
          p.nightlord === nightlord &&
          p.shiftingEarth === shiftingEarth &&
          p.spawnPoint === spawnPoint
      )
        .map((p) => p.camp)
        .filter((c): c is string => c !== null)
    ),
  ].sort();
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [nightlord, setNightlord] = useState<string | null>(null);
  const [shiftingEarth, setShiftingEarth] = useState<string | null>(null);
  const [spawnPoint, setSpawnPoint] = useState<string | null>(null);
  const [camp, setCamp] = useState<string | null>(null);
  const [imgPos, setImgPos] = useState(0);

  const filtered = useMemo(() => {
    let p: Pattern[] = PATTERNS;
    if (nightlord) p = p.filter((x) => x.nightlord === nightlord);
    if (shiftingEarth) p = p.filter((x) => x.shiftingEarth === shiftingEarth);
    if (spawnPoint) p = p.filter((x) => x.spawnPoint === spawnPoint);
    if (camp) p = p.filter((x) => x.camp === camp);
    return p;
  }, [nightlord, shiftingEarth, spawnPoint, camp]);

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

  const availableSpawnPoints = useMemo(() => {
    if (!nightlord || !shiftingEarth) return [];
    return [
      ...new Set(
        PATTERNS.filter(
          (p) => p.nightlord === nightlord && p.shiftingEarth === shiftingEarth
        ).map((p) => p.spawnPoint)
      ),
    ];
  }, [nightlord, shiftingEarth]);

  const availableCamps = useMemo(
    () => campOptionsFor(nightlord, shiftingEarth, spawnPoint),
    [nightlord, shiftingEarth, spawnPoint]
  );

  // The First Camp step only appears when it can tell patterns apart.
  // DLC patterns have no camp data yet, and some spawn points only have
  // one possible camp, so those go straight to results.
  const hasCampStep = availableCamps.length > 1;

  const totalSteps = hasCampStep ? 4 : 3;
  const isLastStep = step === totalSteps - 1;
  const showResults = step >= totalSteps;

  const canNext = useMemo(() => {
    if (step === 0) return !!nightlord;
    if (step === 1) return !!shiftingEarth;
    if (step === 2) return !!spawnPoint;
    if (step === 3 && hasCampStep) return !!camp;
    return false;
  }, [step, nightlord, shiftingEarth, spawnPoint, camp, hasCampStep]);

  function next() {
    if (!canNext) return;
    if (isLastStep) {
      setStep(totalSteps);
    } else {
      setStep((s) => s + 1);
    }
    setImgPos(0);
  }

  function selectSpawnPoint(sp: string) {
    setSpawnPoint(sp);
    setCamp(null);
    setImgPos(0);
    // Step 3 is First Camp when that step applies, otherwise it's results,
    // so a tap on the map always moves the player forward.
    setStep(3);
  }

  function back() {
    if (showResults) {
      setStep(hasCampStep ? 3 : 2);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setStep(0);
    setNightlord(null);
    setShiftingEarth(null);
    setSpawnPoint(null);
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
                Spawn Point: {spawnPoint} <br />
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
                        setSpawnPoint(null);
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
                        setSpawnPoint(null);
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
                  Tap the circle where you landed
                </div>
                <SpawnMap
                  shiftingEarth={shiftingEarth ?? "Default"}
                  spawnPoints={availableSpawnPoints}
                  selected={spawnPoint}
                  onSelect={selectSpawnPoint}
                />
              </>
            )}

            {step === 3 && hasCampStep && (
              <>
                <div className="question">Step 4: First Camp</div>
                <div className="mini" style={{ marginBottom: 12 }}>
                  Which camp is at your landing spot?
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
