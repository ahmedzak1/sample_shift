"use client";

import { keyName, keysInMode, targetKeyOptions, type Mode, type MusicalKey } from "@/audio/musical-key";
import { MIN_ESTIMATE_SECONDS, type Estimate, type EstimateScope } from "@/audio/estimate";
import { withOriginalKey, withOriginalTempo, type KeyTempoSettings, type SamplePlan } from "@/audio/sample-plan";

/** Where the Estimate is up to, and what it was made from. */
export type EstimateStatus =
  | { state: "none" }
  | { state: "running"; scope: EstimateScope; tooShort: boolean }
  | { state: "done"; scope: EstimateScope; tooShort: boolean; estimate: Estimate }
  | { state: "failed"; scope: EstimateScope; message: string };

interface KeyTempoControlsProps {
  settings: KeyTempoSettings;
  onChange: (settings: KeyTempoSettings) => void;
  /** The Sample Plan for these settings, so the panel shows exactly what the export will do. */
  plan: Pick<SamplePlan, "changesKey" | "changesTempo" | "pitchShift" | "tempoPercent">;
  estimate: EstimateStatus;
  /** Estimates again, throwing away your corrections to the Original Key and Tempo. */
  onNewEstimate: () => void;
}

function EstimateLine({ status, onNewEstimate }: { status: EstimateStatus; onNewEstimate: () => void }) {
  if (status.state === "none") return null;
  let text: string;
  if (status.state === "running") text = `Estimating the ${status.scope}'s key and tempo…`;
  else if (status.state === "failed") text = `Couldn't estimate key and tempo: ${status.message}`;
  else {
    const { key, tempo } = status.estimate;
    const parts = [key ? keyName(key) : "key unclear", tempo ? `${tempo} BPM` : "tempo unclear"];
    text = `Estimate for the ${status.scope}: ${parts.join(", ")}`;
  }
  return (
    <div className="estimate" aria-live="polite">
      <span className={status.state === "failed" ? "error-text" : undefined}>{text}</span>
      {"tooShort" in status && status.tooShort && (
        <span className="warning">The Region is under {MIN_ESTIMATE_SECONDS} seconds, so this Estimate may be off.</span>
      )}
      <button type="button" onClick={onNewEstimate} disabled={status.state === "running"}>
        New Estimate
      </button>
    </div>
  );
}

/** Option values for key selects: "<tonic>-<mode>", e.g. "9-minor". */
const keyValue = (key: MusicalKey | null) => (key ? `${key.tonic}-${key.mode}` : "");
const KEYS_BY_VALUE = new Map([...keysInMode("major"), ...keysInMode("minor")].map((key) => [keyValue(key), key]));

function TempoInput({ label, value, onChange }: { label: string; value: number | null; onChange: (tempo: number | null) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="bpm">
        <input
          type="number"
          min={1}
          max={999}
          step="any"
          inputMode="decimal"
          value={value ?? ""}
          placeholder="—"
          onChange={(e) => {
            const tempo = Number(e.target.value);
            onChange(e.target.value.trim() && Number.isFinite(tempo) && tempo > 0 ? tempo : null);
          }}
        />
        BPM
      </span>
    </label>
  );
}

function formatPitchShift(pitchShift: number): string {
  if (pitchShift === 0) return "0 semitones";
  const n = Math.abs(pitchShift);
  return `${pitchShift > 0 ? "+" : "−"}${n} semitone${n === 1 ? "" : "s"}`;
}

const MODES: { mode: Mode; label: string }[] = [
  { mode: "major", label: "Major" },
  { mode: "minor", label: "Minor" },
];

/** Original and Target Key and Tempo, the Pitch Shift and its octave offset. */
export function KeyTempoControls({ settings, onChange, plan, estimate, onNewEstimate }: KeyTempoControlsProps) {
  const { original, target, octaveOffset } = settings;

  const setOriginalKey = (key: MusicalKey | null) => onChange(withOriginalKey(settings, key));
  const setOriginalTempo = (tempo: number | null) => onChange(withOriginalTempo(settings, tempo));

  /** ×2 and ÷2: an estimated tempo often lands on half or double the real one. */
  function scaleOriginalTempo(factor: number) {
    if (original.tempo) setOriginalTempo(Math.round(original.tempo * factor * 100) / 100);
  }

  return (
    <fieldset className="key-tempo">
      <legend>Key &amp; tempo</legend>
      <EstimateLine status={estimate} onNewEstimate={onNewEstimate} />

      <div className="row">
        <label className="field">
          <span>Original Key</span>
          <select value={keyValue(original.key)} onChange={(e) => setOriginalKey(KEYS_BY_VALUE.get(e.target.value) ?? null)}>
            <option value="">Not set</option>
            {MODES.map(({ mode, label }) => (
              <optgroup key={mode} label={label}>
                {keysInMode(mode).map((key) => (
                  <option key={keyValue(key)} value={keyValue(key)}>
                    {keyName(key)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Target Key</span>
          <select
            value={keyValue(target.key)}
            disabled={!original.key}
            onChange={(e) => onChange({ ...settings, target: { ...target, key: KEYS_BY_VALUE.get(e.target.value) ?? null } })}
          >
            {!original.key && <option value="">Set the Original Key first</option>}
            {original.key &&
              targetKeyOptions(original.key).map((option) => (
                <option key={keyValue(option.key)} value={keyValue(option.key)}>
                  {option.label} (relative: {option.relative})
                </option>
              ))}
          </select>
        </label>
        <div className="readout" aria-live="polite">
          <span>Pitch Shift</span>
          <strong>{plan.changesKey ? formatPitchShift(plan.pitchShift) : "—"}</strong>
        </div>
        <span className="octave" role="group" aria-label="Octave offset">
          <button
            type="button"
            disabled={!plan.changesKey || octaveOffset <= -1}
            onClick={() => onChange({ ...settings, octaveOffset: octaveOffset - 1 })}
          >
            −1 octave
          </button>
          <button
            type="button"
            disabled={!plan.changesKey || octaveOffset >= 1}
            onClick={() => onChange({ ...settings, octaveOffset: octaveOffset + 1 })}
          >
            +1 octave
          </button>
        </span>
      </div>

      <div className="row">
        <TempoInput label="Original Tempo" value={original.tempo} onChange={setOriginalTempo} />
        <span className="halve-double" role="group" aria-label="Fix half or double tempo">
          <button type="button" disabled={!original.tempo} onClick={() => scaleOriginalTempo(0.5)}>
            ÷2
          </button>
          <button type="button" disabled={!original.tempo} onClick={() => scaleOriginalTempo(2)}>
            ×2
          </button>
        </span>
        <TempoInput
          label="Target Tempo"
          value={target.tempo}
          onChange={(tempo) => onChange({ ...settings, target: { ...target, tempo } })}
        />
        <div className="readout" aria-live="polite">
          <span>Tempo</span>
          <strong>{plan.changesTempo ? `${plan.tempoPercent}%` : "—"}</strong>
        </div>
      </div>

      <div className="row reset">
        <button
          type="button"
          onClick={() => onChange({ original, target: { ...original }, octaveOffset: 0 })}
          disabled={!original.key && !original.tempo}
        >
          Reset to Original Key &amp; Tempo
        </button>
      </div>
    </fieldset>
  );
}
