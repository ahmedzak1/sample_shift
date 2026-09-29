"use client";

import { useEffect, useRef, useState } from "react";
import { keyName } from "@/audio/musical-key";
import { MIN_ESTIMATE_SECONDS, type Estimate, type EstimateScope } from "@/audio/estimate";
import { withOriginalTempo, type KeyTempoSettings, type SamplePlan } from "@/audio/sample-plan";

/** Where the Estimate is up to, and what it was made from. */
export type EstimateStatus =
  | { state: "none" }
  | { state: "running"; scope: EstimateScope; tooShort: boolean }
  | { state: "done"; scope: EstimateScope; tooShort: boolean; estimate: Estimate }
  | { state: "failed"; scope: EstimateScope; message: string };

export function EstimateLine({ status, onNewEstimate }: { status: EstimateStatus; onNewEstimate: () => void }) {
  if (status.state === "none") return null;
  let text: React.ReactNode;
  if (status.state === "running") text = `Estimating the ${status.scope}'s key and tempo…`;
  else if (status.state === "failed") text = <span className="error-text">Couldn&apos;t estimate key and tempo: {status.message}</span>;
  else {
    const { key, tempo } = status.estimate;
    text = (
      <>
        Estimate for the {status.scope}: <b>{key ? keyName(key) : "key unclear"}</b>,{" "}
        <b>{tempo ? `${tempo} BPM` : "tempo unclear"}</b>
      </>
    );
  }
  return (
    <div className={`estimate${status.state === "running" ? " running" : ""}`} aria-live="polite">
      <p>
        {text}
        {"tooShort" in status && status.tooShort && (
          <span className="warning"> The Region is under {MIN_ESTIMATE_SECONDS} seconds, so this Estimate may be off.</span>
        )}
      </p>
      <button type="button" className="text-button" onClick={onNewEstimate} disabled={status.state === "running"}>
        New Estimate
      </button>
    </div>
  );
}

/** BPM with at most two decimals, trailing zeros dropped. */
const formatTempo = (tempo: number | null) => (tempo === null ? "" : String(Math.round(tempo * 100) / 100));

const clampTempo = (tempo: number) => Math.min(999, Math.max(1, Math.round(tempo * 100) / 100));

/** Width of a typed tempo in ch: tabular digits are 1ch each, the decimal point about half. */
function figureWidth(text: string): number {
  const points = (text.match(/\./g) ?? []).length;
  return Math.max(2, text.length - points * 0.55) + 0.15;
}

/** Pixels of vertical drag per BPM when scrubbing a tempo. */
const SCRUB_PX_PER_BPM = 4;

interface TempoFigureProps {
  label: string;
  value: number | null;
  onChange: (tempo: number | null) => void;
  size: "large" | "medium";
}

/**
 * A tempo you can type, or scrub by dragging up and down (Shift for tenths).
 * The arrow keys step it by 1 BPM, or 0.1 with Shift.
 */
function TempoFigure({ label, value, onChange, size }: TempoFigureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(formatTempo(value));
  const [scrubbing, setScrubbing] = useState(false);
  const scrub = useRef<{ y: number; from: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(formatTempo(value));
  }, [value]);

  function commitText(next: string) {
    setText(next);
    const tempo = Number(next);
    onChange(next.trim() && Number.isFinite(tempo) && tempo > 0 ? tempo : null);
  }

  return (
    <label className={`tempo-figure ${size}${scrubbing ? " scrubbing" : ""}`}>
      <span className="caption">{label}</span>
      <span className="figure">
        <input
          ref={inputRef}
          value={text}
          placeholder="—"
          inputMode="decimal"
          spellCheck={false}
          autoComplete="off"
          aria-describedby="tempo-scrub-hint"
          // Sized to what's typed, so a tempo like 142.65 is never cut off.
          style={{ width: `${figureWidth(text)}ch` }}
          onChange={(e) => commitText(e.target.value)}
          onBlur={() => setText(formatTempo(value))}
          onKeyDown={(e) => {
            const step = { ArrowUp: 1, ArrowDown: -1 }[e.key];
            if (step && value !== null) {
              e.preventDefault();
              const next = clampTempo(value + step * (e.shiftKey ? 0.1 : 1));
              setText(formatTempo(next));
              onChange(next);
            } else if (e.key === "Enter" || e.key === "Escape") {
              setText(formatTempo(value));
              inputRef.current?.blur();
            }
          }}
          onPointerDown={(e) => {
            if (document.activeElement === e.currentTarget || value === null || e.button !== 0) return;
            // Hold off focusing: a drag scrubs, and only a plain click starts typing.
            e.preventDefault();
            scrub.current = { y: e.clientY, from: value, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const s = scrub.current;
            if (!s) return;
            const dy = s.y - e.clientY;
            if (!s.moved && Math.abs(dy) < 3) return;
            if (!s.moved) setScrubbing(true);
            s.moved = true;
            const next = clampTempo(s.from + (dy / SCRUB_PX_PER_BPM) * (e.shiftKey ? 0.1 : 1));
            setText(formatTempo(next));
            onChange(next);
          }}
          onPointerUp={(e) => {
            const s = scrub.current;
            scrub.current = null;
            setScrubbing(false);
            if (s && !s.moved) {
              e.currentTarget.focus();
              e.currentTarget.select();
            }
          }}
          onPointerCancel={() => {
            scrub.current = null;
            setScrubbing(false);
          }}
        />
        <span className="unit">BPM</span>
      </span>
    </label>
  );
}

interface TempoControlsProps {
  settings: KeyTempoSettings;
  onChange: (settings: KeyTempoSettings) => void;
  plan: Pick<SamplePlan, "changesTempo" | "tempoPercent">;
}

/** The Original Tempo with its ÷2 and ×2 fixes, the Target Tempo, and the resulting stretch. */
export function TempoControls({ settings, onChange, plan }: TempoControlsProps) {
  const { original, target } = settings;
  const setOriginalTempo = (tempo: number | null) => onChange(withOriginalTempo(settings, tempo));

  /** ×2 and ÷2: an estimated tempo often lands on half or double the real one. */
  function scaleOriginalTempo(factor: number) {
    if (original.tempo) setOriginalTempo(Math.round(original.tempo * factor * 100) / 100);
  }

  return (
    <div className="tempo">
      <div className="tempo-original">
        <TempoFigure label="Original Tempo" value={original.tempo} onChange={setOriginalTempo} size="medium" />
        <span className="halve-double" role="group" aria-label="Fix half or double tempo">
          <button type="button" className="chip" disabled={!original.tempo} onClick={() => scaleOriginalTempo(0.5)}>
            ÷2
          </button>
          <button type="button" className="chip" disabled={!original.tempo} onClick={() => scaleOriginalTempo(2)}>
            ×2
          </button>
        </span>
      </div>
      <div className="tempo-target">
        <TempoFigure
          label="Target Tempo"
          value={target.tempo}
          onChange={(tempo) => onChange({ ...settings, target: { ...target, tempo } })}
          size="large"
        />
        <p className="stretch" aria-live="polite">
          <strong>{plan.changesTempo ? `${plan.tempoPercent}%` : "—"}</strong>
          <span>of the Original Tempo</span>
        </p>
      </div>
      <p id="tempo-scrub-hint" className="hint">
        Drag a tempo up or down to change it; Shift for tenths.
      </p>
    </div>
  );
}
