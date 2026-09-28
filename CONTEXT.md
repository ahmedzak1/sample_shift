# Sample Shift

A personal tool, run on your own machine, that pulls a song's audio from a YouTube link so you can cut a part out, change its key and tempo, and download the result.

## Language

**Source Track**:
The audio pulled from one YouTube link: the whole video, or, for videos over 15 minutes, just the Fetch Window you asked for.
_Avoid_: Song, video, original

**Fetch Window**:
A rough start and end time you give when fetching a long video, so that only that part becomes the Source Track. It's a different thing from a Region.
_Avoid_: Trim, section

**Sample**:
A region of a Source Track together with its key and tempo settings; it's what you download. With no region selected, the region is the whole Source Track.
_Avoid_: Clip, snippet, loop, cut

**Region**:
The start and end time of a Sample within its Source Track.
_Avoid_: Selection, range

**Beat Grid**:
Evenly spaced beat and bar lines laid over the Source Track, worked out from the Original Tempo and the Downbeat. The Region's edges snap to it.
_Avoid_: Grid (on its own), quantize

**Downbeat**:
The point in the Source Track that you mark as the first beat of a bar; the Beat Grid is anchored to it.
_Avoid_: Offset, anchor, beat one

### Key and tempo

**Estimate**:
The key and tempo the app detected, first for the whole Source Track and then again for the Region. It's only a suggestion.
_Avoid_: Detected value, guess

**Original Key / Original Tempo**:
The key and tempo you've confirmed for the Region. They start as the Estimate, and your manual corrections stick until you ask for a new Estimate.
_Avoid_: Source key, current key, BPM (on its own)

**Target Key / Target Tempo**:
The key and tempo you want the Sample to have. The app changes key and tempo independently, so changing one never changes the other. The Target Key is always in the same mode (major or minor) as the Original Key.
_Avoid_: New key, output BPM

**Pitch Shift**:
The number of semitones between the Original Key and the Target Key. By default it's the smaller of the two possible moves; at exactly 6 semitones (a tritone) it goes down. You can move it an octave (±12) either way.
_Avoid_: Transpose amount, semitones (on its own)
