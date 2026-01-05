"use client";

import React, { useMemo, useState } from "react";

type Choice = { label: string; index: number };

const Q1: Choice[] = [
  { label: "Tricephalos", index: 1 },
  { label: "Gaping Jaw", index: 2 },
  { label: "Sentient Pest", index: 3 },
  { label: "Augur", index: 4 },
  { label: "Equilibrious Beast", index: 5 },
  { label: "Darkdrift Knight", index: 6 },
  { label: "Fissure in the Fog", index: 7 },
];

const Q2: Choice[] = [
  { label: "Default", index: 1 },
  { label: "Mountaintop", index: 2 },
  { label: "Crater", index: 3 },
  { label: "Rotted Woods", index: 4 },
  { label: "Noklateo", index: 5 },
];

const Q3: Choice[] = [
  { label: "1", index: 1 },
  { label: "2", index: 2 },
  { label: "3", index: 3 },
  { label: "4", index: 4 },
];

const Q4: Choice[] = [
  { label: "Demi-Humans", index: 1 },
  { label: "Caravans and Nobles", index: 2 },
  { label: "Wandering Nobles", index: 3 },
  { label: "Foot Soldiers", index: 4 },
  { label: "Rats and Demi-Humans", index: 5 },
  { label: "Church", index: 6 },
  { label: "Nobles and Soldiers", index: 7 },
  { label: "Shack", index: 8 },
];

type Result = {
  unique: string;
  matches: number[];
  images: { idx: number; file: string; url: string }[];
  count: number;
};

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`optionBtn ${selected ? "optionBtnSelected" : ""}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);

  const [a1, setA1] = useState<Choice | null>(null);
  const [a2, setA2] = useState<Choice | null>(null);
  const [a3, setA3] = useState<Choice | null>(null);
  const [a4, setA4] = useState<Choice | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [imgPos, setImgPos] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const unique = useMemo(() => {
    if (!a1 || !a2 || !a3 || !a4) return "";
    return `${a1.index}${a2.index}${a3.index}${a4.index}`;
  }, [a1, a2, a3, a4]);

  const canNext = useMemo(() => {
    if (step === 0) return !!a1;
    if (step === 1) return !!a2;
    if (step === 2) return !!a3;
    if (step === 3) return !!a4;
    return false;
  }, [step, a1, a2, a3, a4]);

  const selectedSummary = useMemo(() => {
    return {
      nightlord: a1 ? `${a1.label} (${a1.index})` : "—",
      shifting: a2 ? `${a2.label} (${a2.index})` : "—",
      spawn: a3 ? `${a3.label} (${a3.index})` : "—",
      camp: a4 ? `${a4.label} (${a4.index})` : "—",
    };
  }, [a1, a2, a3, a4]);

  async function resolve() {
    setLoading(true);
    setError(null);
    setResult(null);
    setImgPos(0);

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unique }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");

      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!canNext) return;
    if (step < 3) setStep((s) => s + 1);
    else resolve();
  }

  function back() {
    setResult(null);
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setStep(0);
    setA1(null);
    setA2(null);
    setA3(null);
    setA4(null);
    setLoading(false);
    setResult(null);
    setImgPos(0);
    setError(null);
  }

  const currentImage = result?.images?.[imgPos];

  return (
    <div className="pixelWrap">
      <div className="frame">
        <h1 className="title">Nightreign Pattern Finder</h1>

        {/* RESULTS VIEW (after Find Pattern) */}
        {result ? (
          <>
            <div className="answerBox">
              <div>Selected:</div>
              <div className="mini">
                Nightlord: {selectedSummary.nightlord} <br />
                Shifting Earth: {selectedSummary.shifting} <br />
                Spawn Point: {selectedSummary.spawn} <br />
                First Camp: {selectedSummary.camp} <br />
                <br />
                Unique: {unique || result.unique || "—"}
              </div>
            </div>

            <div className="imgWrap">
              <div>
                Matches: {result.count} {result.count === 1 ? "image" : "images"}
              </div>

              {result.count === 0 ? (
                <div className="mini">No Index found for Unique {result.unique}.</div>
              ) : (
                <>
                  <div className="mini">
                    Showing {imgPos + 1} / {result.count} — Index {currentImage?.idx} →{" "}
                    {currentImage?.file}
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="pixelImg" src={currentImage?.url} alt={currentImage?.file} />

                  {result.count > 1 && (
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
                        onClick={() => setImgPos((p) => Math.min(result.count - 1, p + 1))}
                        disabled={imgPos === result.count - 1}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="controls">
              <button className="btn" onClick={restart} type="button">
                Restart
              </button>
            </div>
          </>
        ) : (
          <>
            {/* WIZARD VIEW (questions only, no "Selected" box) */}
            {step === 0 && (
              <>
                <div className="question">Question 1: Nightlord</div>
                <div className="optionsList">
                  {Q1.map((c) => (
                    <OptionButton
                      key={c.index}
                      label={c.label}
                      selected={a1?.index === c.index}
                      onClick={() => setA1(c)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="question">Question 2: Shifting Earth</div>
                <div className="optionsList">
                  {Q2.map((c) => (
                    <OptionButton
                      key={c.index}
                      label={c.label}
                      selected={a2?.index === c.index}
                      onClick={() => setA2(c)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="question">Question 3: Spawn Point</div>
                <div className="grid2x2">
                  {Q3.map((c) => (
                    <OptionButton
                      key={c.index}
                      label={c.label}
                      selected={a3?.index === c.index}
                      onClick={() => setA3(c)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="question">Question 4: First Camp</div>
                <div className="optionsList">
                  {Q4.map((c) => (
                    <OptionButton
                      key={c.index}
                      label={c.label}
                      selected={a4?.index === c.index}
                      onClick={() => setA4(c)}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="controls">
              <button className="btn" onClick={back} disabled={step === 0} type="button">
                Back
              </button>

              <button className="btn" onClick={next} disabled={!canNext || loading} type="button">
                {step < 3 ? "Next" : loading ? "Loading..." : "Find Pattern"}
              </button>
            </div>

            {error && (
              <div className="answerBox" style={{ marginTop: 16 }}>
                Error: {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}