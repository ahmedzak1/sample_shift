import { describe, expect, it } from "vitest";
import { classifyYtDlpError } from "./yt-dlp-errors";

describe("classifyYtDlpError", () => {
  it.each([
    ["ERROR: [youtube] abc123def45: Private video. Sign in if you've been granted access to this video", "private"],
    [
      "ERROR: [youtube] abc123def45: Sign in to confirm your age. This video may be inappropriate for some users.",
      "age-restricted",
    ],
    [
      "ERROR: [youtube] abc123def45: Video unavailable. The uploader has not made this video available in your country",
      "region-blocked",
    ],
    ["ERROR: [youtube] abc123def45: This video is not available in your country", "region-blocked"],
    ["[youtube] aaaaaaaaaaa: Downloading webpage\nERROR: [youtube] aaaaaaaaaaa: This video is unavailable", "unavailable"],
    ["ERROR: [youtube] abc123def45: Video unavailable. This video has been removed by the uploader", "unavailable"],
    [
      "ERROR: [youtube] abc123def45: This video has been removed for violating YouTube's Terms of Service",
      "unavailable",
    ],
  ] as const)("classifies %j as %s", (stderr, kind) => {
    expect(classifyYtDlpError(stderr).kind).toBe(kind);
  });

  it("names yt-dlp as the missing tool when Python can't find its module", () => {
    const failure = classifyYtDlpError("C:\\Python313\\python.exe: No module named yt_dlp");

    expect(failure).toMatchObject({ kind: "tool-missing", toolName: "yt-dlp" });
  });

  it("names ffmpeg as the missing tool when yt-dlp can't convert the audio", () => {
    const failure = classifyYtDlpError(
      "ERROR: Postprocessing: ffprobe and ffmpeg not found. Please install or provide the path using --ffmpeg-location",
    );

    expect(failure).toMatchObject({ kind: "tool-missing", toolName: "ffmpeg" });
  });

  it("reports the actual error, not an earlier warning about ffmpeg", () => {
    const failure = classifyYtDlpError(
      "WARNING: ffmpeg not found. The downloaded format may not be the best available.\n" +
        "ERROR: [youtube] abc123def45: Private video. Sign in if you've been granted access to this video",
    );

    expect(failure.kind).toBe("private");
  });

  it("keeps yt-dlp's own wording, without its prefix, for anything else", () => {
    const failure = classifyYtDlpError(
      "[youtube] abc123def45: Downloading webpage\nERROR: [youtube] abc123def45: HTTP Error 429: Too Many Requests\n",
    );

    expect(failure).toMatchObject({ kind: "failed", detail: "HTTP Error 429: Too Many Requests" });
  });
});
