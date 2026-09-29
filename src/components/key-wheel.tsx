"use client";

import { useEffect, useRef, useState } from "react";
import { keyName, keysInMode, relativeKey, sameKey, shortKeyName, type Mode, type MusicalKey } from "@/audio/musical-key";
import { withOriginalKey, type KeyTempoSettings } from "@/audio/sample-plan";
import { PencilIcon } from "./icons";
import { hueColour, tonicHue } from "./key-colour";

interface KeyWheelProps {
  settings: KeyTempoSettings;
  onChange: (settings: KeyTempoSettings) => void;
  /** The Sample Plan's Pitch Shift in semitones, octave offset included. */
  pitchShift: number;
  /** The latest Estimate's key, pencilled onto the wheel when it differs from the Original Key. */
  estimateKey: MusicalKey | null;
  /** Whether the wheel sets the Original Key (a correction) instead of the Target Key. */
  correcting: boolean;
  onCorrectingChange: (correcting: boolean) => void;
  /** Shown in the middle while there's no Original Key yet. */
  pendingText: string;
}

// Radii in SVG units; the wheel is drawn around 0,0.
const OUTER = 198;
const RING = 150;
const INNER = 112;
const ARC = 98;
const VIEW = 214;

/** Angle of a tonic in degrees, C at the top and a semitone every 30° clockwise. */
const tonicAngle = (tonic: number) => tonic * 30 - 90;

const round = (n: number) => Math.round(n * 1000) / 1000;

function polar(r: number, degrees: number): [number, number] {
  const a = (degrees * Math.PI) / 180;
  // Rounded so server and browser render identical coordinates.
  return [round(r * Math.cos(a)), round(r * Math.sin(a))];
}

/** An annular sector between two radii and two angles. */
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

/** The Pitch Shift as an arc from the Original Key, clockwise for up and anticlockwise for down. */
function shiftArc(from: number, semitones: number): string {
  const a0 = tonicAngle(from);
  const a1 = a0 + semitones * 30;
  const [x0, y0] = polar(ARC, a0);
  const [x1, y1] = polar(ARC, a1);
  return `M${x0} ${y0}A${ARC} ${ARC} 0 0 ${semitones > 0 ? 1 : 0} ${x1} ${y1}`;
}

/** The tonic under a point, from its angle around the wheel's centre. */
function tonicAt(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const rect = svg.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return ((Math.round(degrees / 30) % 12) + 12) % 12;
}

function formatPitchShift(semitones: number): string {
  const n = Math.abs(semitones);
  return `${semitones > 0 ? "+" : "−"}${n} semitone${n === 1 ? "" : "s"}`;
}

/**
 * Follows `value`, easing towards each new one so the Pitch Shift arc sweeps round the wheel
 * instead of jumping. Snaps straight there when reduced motion is asked for.
 */
function useSweep(value: number): number {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 280);
      current.current = from + (value - from) * (1 - (1 - t) ** 3);
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

/** Splits "F# minor" into its tonic and mode, so the tonic can be set large. */
function keyParts(key: MusicalKey): [string, string] {
  const [tonic, mode] = keyName(key).split(" ");
  return [tonic, mode];
}

/**
 * The key wheel: the twelve keys in the Original Key's mode round the outside, their relative keys
 * inside, and the Pitch Shift drawn as the arc from the Original Key to the Target Key. Click or drag
 * round the ring (or use the arrow keys) to turn the Target Key; the octave offset stays as it was.
 */
export function KeyWheel({
  settings,
  onChange,
  pitchShift,
  estimateKey,
  correcting,
  onCorrectingChange,
  pendingText,
}: KeyWheelProps) {
  const { original, target, octaveOffset } = settings;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  /** The mode to correct into when there's no Original Key yet. */
  const [draftMode, setDraftMode] = useState<Mode>("major");
  const mode = original.key?.mode ?? draftMode;
  const withinOctave = pitchShift - 12 * octaveOffset;
  const sweep = useSweep(withinOctave);

  function setTonic(tonic: number) {
    if (correcting || !original.key) {
      if (!correcting) return;
      const key = { tonic, mode };
      if (!sameKey(key, original.key)) onChange(withOriginalKey(settings, key));
      return;
    }
    if (target.key?.tonic === tonic) return;
    onChange({ ...settings, target: { ...target, key: { tonic, mode: original.key.mode } } });
  }

  function setMode(next: Mode) {
    setDraftMode(next);
    if (original.key && original.key.mode !== next) onChange(withOriginalKey(settings, { tonic: original.key.tonic, mode: next }));
  }

  const activeTonic = correcting ? original.key?.tonic : target.key?.tonic;

  function onKeyDown(event: React.KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (step && activeTonic !== undefined) {
      event.preventDefault();
      setTonic((activeTonic + step + 12) % 12);
    } else if (event.key === "Home" && original.key && !correcting) {
      event.preventDefault();
      onChange({ ...settings, target: { ...target, key: original.key }, octaveOffset: 0 });
    }
  }

  const interactive = correcting || original.key !== null;
  const valueText = correcting
    ? `Original Key ${original.key ? keyName(original.key) : "not set"}`
    : target.key
      ? `${keyName(target.key)}, Pitch Shift ${pitchShift === 0 ? "none" : formatPitchShift(pitchShift)}`
      : "not set";

  return (
    <div className="wheel-block">
      <div className={`wheel${correcting ? " correcting" : ""}`}>
        <svg
          ref={svgRef}
          className="wheel-ring"
          viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
          role="slider"
          tabIndex={interactive ? 0 : -1}
          aria-label={correcting ? "Original Key" : "Target Key"}
          aria-valuemin={0}
          aria-valuemax={11}
          aria-valuenow={activeTonic ?? 0}
          aria-valuetext={valueText}
          aria-disabled={!interactive}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            if (!interactive) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = true;
            setTonic(tonicAt(event.currentTarget, event.clientX, event.clientY));
          }}
          onPointerMove={(event) => {
            if (dragging.current) setTonic(tonicAt(event.currentTarget, event.clientX, event.clientY));
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {keysInMode(mode).map((key) => {
            const a = tonicAngle(key.tonic);
            const hue = tonicHue(key.tonic);
            const isActive = activeTonic === key.tonic && (correcting || original.key !== null);
            const isOriginal = !correcting && original.key?.tonic === key.tonic;
            const [lx, ly] = polar((OUTER + RING) / 2, a);
            const [rx, ry] = polar((RING + INNER) / 2 - 2, a);
            return (
              <g key={key.tonic} className={`wheel-key${isActive ? " active" : ""}`}>
                <path
                  d={sector(RING, OUTER, a - 15, a + 15)}
                  fill={hueColour(hue, isActive ? "fill" : "tint")}
                  className="wheel-segment"
                />
                <path d={sector(INNER, RING - 3, a - 15, a + 15)} fill={hueColour(hue, "wash", 0.55)} className="wheel-segment" />
                <text x={lx} y={ly} className="wheel-label" dominantBaseline="central" textAnchor="middle">
                  {shortKeyName(key)}
                </text>
                <text x={rx} y={ry} className="wheel-relative" dominantBaseline="central" textAnchor="middle">
                  {shortKeyName(relativeKey(key))}
                </text>
                {isOriginal && (
                  <path d={sector(RING + 3, OUTER - 3, a - 12.5, a + 12.5)} className="wheel-original" />
                )}
              </g>
            );
          })}

          {estimateKey && estimateKey.mode === mode && !sameKey(estimateKey, original.key) && (
            <path
              d={sector(RING + 3, OUTER - 3, tonicAngle(estimateKey.tonic) - 12.5, tonicAngle(estimateKey.tonic) + 12.5)}
              className="wheel-estimate"
            />
          )}

          <circle r={ARC} className="wheel-track" />
          {[...Array(12).keys()].map((tonic) => {
            const [x0, y0] = polar(ARC - 12, tonicAngle(tonic));
            const [x1, y1] = polar(ARC - 6, tonicAngle(tonic));
            return <line key={tonic} x1={x0} y1={y0} x2={x1} y2={y1} className="wheel-tick" />;
          })}
          {!correcting && original.key && Math.abs(sweep) > 0.02 && (
            <path d={shiftArc(original.key.tonic, sweep)} className="wheel-arc" />
          )}
          {!correcting && original.key && (
            <circle
              cx={polar(ARC, tonicAngle(original.key.tonic))[0]}
              cy={polar(ARC, tonicAngle(original.key.tonic))[1]}
              r={6}
              className="wheel-arc-start"
            />
          )}
          {!correcting && original.key && target.key && (
            <circle
              cx={polar(ARC, tonicAngle(original.key.tonic) + sweep * 30)[0]}
              cy={polar(ARC, tonicAngle(original.key.tonic) + sweep * 30)[1]}
              r={9}
              className="wheel-arc-end"
            />
          )}
        </svg>

        <div className="wheel-centre">
          {correcting ? (
            <>
              <span className="wheel-caption">Original Key</span>
              {original.key ? (
                <KeyName musicalKey={original.key} />
              ) : (
                <span className="wheel-hint">Pick a key on the wheel</span>
              )}
              <span className="segmented small" role="radiogroup" aria-label="Mode">
                {(["major", "minor"] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
                    {m === "major" ? "Major" : "Minor"}
                  </button>
                ))}
              </span>
              <button type="button" className="text-button" onClick={() => onCorrectingChange(false)} disabled={!original.key}>
                Done
              </button>
            </>
          ) : original.key && target.key ? (
            <>
              <KeyName musicalKey={target.key} />
              <span className="wheel-shift" aria-live="polite">
                {pitchShift === 0 ? (
                  "No Pitch Shift"
                ) : (
                  <>
                    <span className="wheel-caption">Pitch Shift</span>
                    {formatPitchShift(pitchShift)}
                  </>
                )}
              </span>
            </>
          ) : (
            <>
              <span className="wheel-hint">{pendingText}</span>
              <button type="button" className="text-button" onClick={() => onCorrectingChange(true)}>
                Set the Original Key
              </button>
            </>
          )}
        </div>
      </div>
      {!correcting && original.key && (
        <button type="button" className="text-button wheel-from" onClick={() => onCorrectingChange(true)}>
          Original Key: {keyName(original.key)}
          <PencilIcon className="icon-sm" />
          <span className="visually-hidden">(correct it)</span>
        </button>
      )}
    </div>
  );
}

function KeyName({ musicalKey }: { musicalKey: MusicalKey }) {
  const [tonic, mode] = keyParts(musicalKey);
  return (
    <span className="wheel-key-name">
      <span className="wheel-tonic">{tonic}</span>
      <span className="wheel-mode">{mode}</span>
    </span>
  );
}

/** The wheel as a picture, before there's a Source Track to set keys for. */
export function WheelPoster() {
  return (
    <svg className="wheel-poster" viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`} aria-hidden="true">
      {keysInMode("minor").map((key) => {
        const a = tonicAngle(key.tonic);
        const hue = tonicHue(key.tonic);
        const [lx, ly] = polar((OUTER + RING) / 2, a);
        const [rx, ry] = polar((RING + INNER) / 2 - 2, a);
        return (
          <g key={key.tonic}>
            <path d={sector(RING, OUTER, a - 15, a + 15)} fill={hueColour(hue, "fill")} className="wheel-segment" />
            <path d={sector(INNER, RING - 3, a - 15, a + 15)} fill={hueColour(hue, "wash")} className="wheel-segment" />
            <text x={lx} y={ly} className="wheel-label" dominantBaseline="central" textAnchor="middle">
              {shortKeyName(key)}
            </text>
            <text x={rx} y={ry} className="wheel-relative" dominantBaseline="central" textAnchor="middle">
              {shortKeyName(relativeKey(key))}
            </text>
          </g>
        );
      })}
      <path d={shiftArc(9, 5)} className="wheel-arc poster-arc" pathLength={1} />
      <circle cx={polar(ARC, tonicAngle(9))[0]} cy={polar(ARC, tonicAngle(9))[1]} r={6} className="wheel-arc-start" />
      <circle cx={polar(ARC, tonicAngle(2))[0]} cy={polar(ARC, tonicAngle(2))[1]} r={9} className="wheel-arc-end poster-end" />
    </svg>
  );
}
