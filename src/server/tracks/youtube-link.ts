/** A YouTube video ID: always 11 characters from this set. Also safe to use as a cache directory name. */
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Path prefixes whose next segment is the video ID, e.g. /shorts/<id>. */
const ID_PATH_PREFIXES = ["shorts", "embed", "live", "v"];

function isYouTubeHost(hostname: string): boolean {
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

/**
 * The video ID in a YouTube link, or null if the link isn't to a single YouTube video.
 * Accepts watch, youtu.be, shorts, embed and live links, with or without a scheme, ignoring
 * extra parameters such as timestamps and playlists.
 */
export function parseVideoId(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const trimmed = link.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;
  if (url.hostname === "youtu.be") {
    id = segments[0];
  } else if (isYouTubeHost(url.hostname)) {
    id = segments[0] === "watch" ? url.searchParams.get("v") : ID_PATH_PREFIXES.includes(segments[0]) ? segments[1] : null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}
