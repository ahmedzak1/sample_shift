"use client";

import { keyName, keysInMode, targetKeyOptions, type Mode, type MusicalKey } from "@/audio/musical-key";
import type { KeyTempoSettings, SamplePlan } from "@/audio/sample-plan";

interface KeyTempoControlsProps {
  settings: KeyTempoSettings;
  onChange: (settings: KeyTempoSettings) => void;
  /** The Sample Plan for these settings, so the panel shows exactly what the export will do. */
  plan: Pick<SamplePlan, "changesKey" | "changesTempo" | "pitchShift" | "tempoPercent">;
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
export function KeyTempoControls({ settings, onChange, plan }: KeyTempoControlsProps) {
  const { original, target, octaveOffset } = settings;

  function setOriginalKey(key: MusicalKey | null) {
    // The Target Key must stay in the Original Key's mode; start it at the Original Key.
    const keepTarget = key !== null && target.key?.mode === key.mode;
    onChange({
      ...settings,
      original: { ...original, key },
      target: { ...target, key: keepTarget ? target.key : key },
      octaveOffset: keepTarget ? octaveOffset : 0,
    });
  }

  function setOriginalTempo(tempo: number | null) {
    onChange({ ...settings, original: { ...original, tempo }, target: { ...target, tempo: target.tempo ?? tempo } });
  }

  return (
    <fieldset className="key-tempo">
      <legend>Key &amp; tempo</legend>

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
