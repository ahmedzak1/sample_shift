---
name: Sample Shift
description: A printed harmonic-mixing chart. Graphite ink on a cool sheet, where the Target Key's hue is the only colour.
colors:
  sheet: "#f1f2f4"
  paper: "#ffffff"
  ink: "#15171c"
  ink-2: "#454a55"
  ink-3: "#626874"
  ink-faint: "#b4b9c2"
  rule: "#d8dbe0"
  warning: "#9a4700"
  error: "#b3261e"
  key-fill: "oklch(0.74 0.15 20)"
  key-tint: "oklch(0.87 0.08 20)"
  key-wash: "oklch(0.95 0.035 20)"
  key-strong: "oklch(0.52 0.16 20)"
typography:
  display:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.2vw, 56px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 112"
  key-name:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(34px, 15cqi, 72px)"
    fontWeight: 850
    lineHeight: 0.95
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 125"
  figure:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(44px, 7vh, 64px)"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(20px, 2.1vw, 28px)"
    fontWeight: 800
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 110"
  body:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
    fontFeature: "'tnum'"
  label:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter: "24px"
  xl: "40px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-ink-hover:
    backgroundColor: "#2c3039"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 11px"
    height: "30px"
  text-button:
    textColor: "{colors.ink-2}"
    padding: "4px 2px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "40px"
  segmented-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "4px 12px"
  play:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "52px"
  rail:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 24px"
  rail-flooded:
    backgroundColor: "{colors.key-fill}"
  listen-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 14px"
---

# Design System: Sample Shift

## Overview

**Creative North Star: "The Harmonic-Mixing Chart"**

Sample Shift is a printed DJ chart that happens to be playable. The page is a cool sheet of paper ruled with graphite hairlines; the only colour on it belongs to the twelve keys, laid evenly round a wheel. The chosen Target Key's hue soaks through the working surface: it tints the Region on the waveform, draws the Pitch Shift arc, underlines the Target Tempo and floods the transport rail. Switch to the Source Track and the colour drains out, leaving plain ink, so what you see always says what you hear.

Density is a working instrument's: one screen, no scrolling to reach key, tempo, Pitch Shift, play, A/B and download, with the wheel and the tempo figures set large enough to read across a desk. Type is Archivo on its width axis. Names of keys and numbers are cut expanded and heavy, like a chart's legend; everything else is ordinary width. The build is light only, for a producer at a desk by daylight beside a DAW; there is no dark theme.

The world rejects the SaaS dashboard (cards on soft shadows), fake hardware, the dark and moody DAW inspector, and the plain or toy-like utility.

**Key Characteristics:**
- An achromatic sheet and ink; colour comes only from the key hues.
- Twelve even OKLCH hues, one per tonic, fixed by position on the wheel.
- The Target Key's hue floods the editor and drains to ink for the Source Track.
- Hairline rules instead of cards or shadows.
- Expanded, heavy Archivo for key names and figures, tabular numerals everywhere.
- One motion: a sweep round the wheel and a hue fade, eased out, instant under reduced motion.

## Colors

A cool, near-neutral paper-and-graphite palette with twelve key hues as its only chroma.

### Primary
- **Key Fill** (`key-fill`; hue varies per tonic): the key's full voice. The active segment on the wheel, the end marker of the Pitch Shift arc, the flooded transport rail, the Target Tempo underline, text selection.
- **Key Strong** (`key-strong`): the key's ink-weight tone for thin marks and text on paper. The Pitch Shift arc, the Pitch Shift readout in the wheel's centre, Region edges on the waveform, the Download button's render progress, the text caret.
- **Key Tint** (`key-tint`): the inactive segments of the wheel's outer ring.
- **Key Wash** (`key-wash`): the Region's fill on the waveform and, at 55% alpha, the wheel's inner ring of relative keys.

Every key tone is `oklch(L C h)` with **h = 20 + 30 × tonic** (C = 20, C# = 50 ... B = 350). The frontmatter records C; the other eleven tonics share the same lightness and chroma. Inside the editor the flooded tones are driven by two registered custom properties, `--key-h` (hue) and `--key-c` (chroma, 0.15 when flooded and 0 when drained), resolved on the editor root.

### Neutral
- **Cool Sheet** (`sheet`): the page ground, and the gap stroke between wheel segments.
- **Paper** (`paper`): anything you write on or press: inputs, chips, the waveform, the wheel's centre, the unflooded rail, popovers.
- **Graphite Ink** (`ink`): primary text, primary buttons, the play button, selected segments of a switch, the Original Key marker, the waveform inside the Region, the playhead.
- **Ink 2** (`ink-2`): secondary text: lede copy, text buttons at rest, the key mode, relative-key labels.
- **Ink 3** (`ink-3`): captions and meta: track metadata, field captions, units, ruler labels, shortcut descriptions.
- **Faint Ink** (`ink-faint`): non-text marks only: the waveform outside the Region, ruler ticks, wheel ticks, underline colour of text buttons, the resting underline of time fields and figures.
- **Hairline** (`rule`): 1px borders and dividers; the Region fill when drained.
- **Warning** (`warning`) and **Error** (`error`): status text only, never a surface.

### Named Rules
**The Key Owns the Colour Rule.** Chroma on the page comes from the key hues and nowhere else. Chrome, controls and text are ink on sheet or paper. Warning and error are the only exceptions, and they are text.

**The Twelve Even Hues Rule.** A tonic's hue is fixed by its place on the wheel (20 + 30 × tonic) and its tone by role (fill, tint, wash, strong). Never pick a key colour by eye; derive it.

**The Drain Rule.** While the Source Track is heard, key chroma goes to zero rather than switching to another colour: the rail goes paper under its ink rule, the Region goes hairline grey with ink edges, the arc goes grey. The wheel itself keeps its twelve hues; it is the chart.

## Typography

**Display Font:** Archivo (variable, with the `wdth` axis), via next/font, falling back to Segoe UI, system-ui, sans-serif
**Body Font:** Archivo at normal width

**Character:** One grotesque in two cuts. Expanded and heavy for the chart's legend (key names, tempos, the wordmark), plain and medium for the working text. Numerals are tabular throughout so figures do not jitter as they change.

### Hierarchy
- **Key Name** (850, clamp(34px, 15cqi, 72px) against the wheel's container, 0.95, width 125%, -0.04em): the Target Key's tonic in the wheel's centre, the largest thing on screen.
- **Figure** (850, clamp(44px, 7vh, 64px) for the Target Tempo, 36px for the Original Tempo, width 118%, -0.03em, line-height 1): scrubbable tempo figures.
- **Display** (800, clamp(34px, 4.2vw, 56px), 1.02, width 112%, -0.03em, balanced): the empty-state headline only.
- **Headline** (800, clamp(20px, 2.1vw, 28px), width 110%, -0.02em, one line with ellipsis): the Source Track title.
- **Body** (500, 15px, 1.45): working text. Lede copy steps up to 17px in Ink 2 at 44ch.
- **Label** (650, 12 to 13px): field captions, units, meta, chips, text buttons, shortcut lists. Buttons use 700 at 14px.
- Wheel legends: key labels 700 at 19px (21px, 850 when active), relative keys 650 at 15px, both width 112%; a container query raises them when the wheel is under 380px wide so they stay legible.

### Named Rules
**The Width Axis Rule.** Width expands only for key names, figures and the wordmark (110 to 125%). Running text, labels and buttons stay at normal width.

**The Tabular Figures Rule.** Numerals are tabular everywhere (set on the body), so times, tempos and percentages hold still while they change.

## Layout

A single full-height screen: a top strip (wordmark, link field, keyboard shortcuts), a track head (title and meta), a two-column workbench, and a transport rail pinned to the bottom. Page gutter is 24px, 16px at 980px and below.

- **Full window:** the workbench is `minmax(300px, 0.8fr) | minmax(0, 1.2fr)` with 40px between columns: the key wheel (up to 56vh or 500px) and its actions on the left; the waveform (clamp(140px, 34vh, 340px) tall), Region bar and tempo figures on the right, the tempo block set off by a hairline above it.
- **At 1180px and below:** the inline shortcut list collapses into a keyboard button that opens a popover.
- **Beside a DAW (980px and below):** the waveform, scroller and Region bar run full width on top; the wheel (up to 34vh or 340px) and the tempo figures sit side by side beneath; the rail keeps to one row and hides the position and filename (the filename stays on the Download button's tooltip).
- **At 600px and below:** one column; the link field takes the top strip's full width, the rail wraps and Download spans the width.
- **Empty state:** the wheel poster and the headline with the link field sit side by side, stacking at 980px.

Spacing runs on 4 / 8 / 12 / 16 / 24 / 40px, with small gaps (6, 10, 14, 18px) where controls are optically grouped.

The build lands the direction contract with two deliberate shifts: the wheel may grow to 56vh rather than 44vh, and the flood lives on the rail while the play button stays ink.

## Elevation & Depth

Flat, like print. There are no drop shadows. Depth is carried by hairline rules (1px Hairline) between regions, a single heavier ink rule where the pinned rail meets the page, and paper surfaces set on the sheet. The only `box-shadow` values in the build are functional: a 4px ink ring for focus on the rail, and a 1.5px inset ink line that draws the A/B switch's border.

### Named Rules
**The Printed Sheet Rule.** Separate things with rules and paper, never with shadows, blur or glass. If a surface needs to stand forward, give it an ink border (as the shortcut popover has).

## Shapes

Small, even corners on everything you press, and true circles only where the wheel's geometry lives.

- 4px: chips and keycaps (keycaps carry a 2px bottom border, like a key's edge).
- 6px: the waveform, segmented switches, the A/B switch's inner buttons (the outer track is 9px, 6 plus its 3px inset).
- 8px: buttons, inputs, the zoom button group, the shortcut popover, rail toggles.
- Circles: the play button, the wheel and its markers (a paper ring for the Original Key, a key-filled disc for the Target Key), the spinner.

The wheel is drawn as annular sectors with a 3px sheet-coloured gap between segments; the arc of the Pitch Shift is a 10px round-capped stroke. Icons are one 20px grid, 1.75 stroke, round caps and joins, `currentColor`.

## Components

### Buttons
Ink and firm; they press in by a pixel.
- **Shape:** gently rounded (8px), 40px high (48px in the empty state).
- **Ink:** Graphite Ink ground with Paper text, 700 at 14px, 0 16px padding. Hover lifts to a lighter graphite (#2c3039); active shifts down 1px.
- **Download:** the ink button doubles as its own progress bar, filling left to right in Key Strong as the Sample renders.
- **Text button:** no box; Ink 2 with a Faint Ink underline offset 3px, both going to Ink on hover. For secondary actions (Reset, Clear Region, New Estimate, correcting the Original Key).
- **Icon button:** transparent, 34px square, hover to a pale grey; grouped zoom buttons share a paper box with hairline dividers.
- **Focus:** a 2px ink outline, offset 2px, everywhere. On the rail the outline turns paper inside a 4px ink ring so it reads on any key hue.
- **Disabled:** 40% opacity.

### Chips
- **Style:** Paper ground, 1px Hairline border, 4px corners, 650 at 13px, 30px high. For small discrete steps (the octave offset, halving and doubling the Original Tempo).
- **State:** the border darkens to Ink 3 on hover.

### Inputs / Fields
- **Link field:** Paper, 1px Hairline border, 8px corners, 40px high, Ink 3 placeholder.
- **Time fields:** no box; a 1.5px Faint Ink underline under 700 15px figures, turning Ink on focus.
- **Tempo figures:** no box; a 3px underline under the figure. The Target Tempo's underline is Key Fill; while scrubbing it turns Key Strong; on focus, Ink. Drag vertically to change (ns-resize cursor).

### Navigation
The top strip is the only chrome: the wordmark (a ring of twelve key-hued dots with one lit, then "Sample Shift" in 800, width 118%), the link field, and the shortcut list set as keycaps with Ink 3 descriptions. There is no other navigation.

### Key Wheel (signature)
The main control. Twelve outer sectors in the Original Key's mode, each in its own Key Tint (Key Fill when active), with relative keys on an inner washed ring. The Original Key is outlined in a 2.5px ink sector; a differing Estimate is pencilled in as a dashed Ink 2 outline. The inner paper track carries twelve faint ticks inside it, and the Pitch Shift arc sweeps from a paper marker at the Original Key to a key-filled marker at the Target Key. The centre sets the Target Key's tonic huge, its mode beneath, and the Pitch Shift in Key Strong. Correcting the Original Key dashes the track in ink. Drag, click, arrow keys or [ and ] turn the Target Key; the arc eases over 280ms.

### Waveform and Region (signature)
A paper canvas with a 6px corner and hairline border. The waveform is Ink inside the Region and Faint Ink outside it, over a faint centre line. The Region is filled in Key Wash with 2px Key Strong edges, each with a small grab tab at the top; drained, it is Hairline grey with Ink edges. A time ruler runs along the bottom in Ink 3 labels (650, 11px) with faint ticks, leaving out any label a Region edge would cross. The playhead is a thin ink line.

### Transport Rail (signature)
Pinned to the bottom under a 1px Ink rule. Paper at rest; flooded with Key Fill while the Target is heard. It holds a 52px circular ink play button, the Loop toggle (an ink border and a translucent paper ground when on), the Target | Source Track switch (a translucent paper track with an inset ink line; the heard side is solid ink), the position in 750 15px, and the Download button with the filename beneath it.

## Do's and Don'ts

### Do:
- **Do** derive every key colour from its tonic: hue 20 + 30 × tonic, with the fill, tint, wash and strong tones.
- **Do** let the Target Key's hue flood the working surface (rail, Region, arc, Target Tempo underline) and drain it to ink and paper while the Source Track is heard.
- **Do** separate regions with 1px Hairline rules, and use an ink rule or ink border when something must stand forward.
- **Do** set key names and figures in heavy Archivo expanded on the width axis (110 to 125%), with tabular numerals.
- **Do** keep motion to the wheel's sweep and the hue fade (hue 520ms, chroma 280ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`), and make both instant under reduced motion.
- **Do** keep Faint Ink for marks, not for text a reader needs.

### Don't:
- **Don't** put chroma on chrome, buttons or text; the key hues are the only colour.
- **Don't** use cards, drop shadows, blur or glass.
- **Don't** add a dark theme; the use scene is a desk by daylight.
- **Don't** give the Source Track a colour of its own; it is plain ink.
- **Don't** expand running text or labels on the width axis.
