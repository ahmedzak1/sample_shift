import { tracksApi } from "@/server/tracks/default-api";

export const runtime = "nodejs";

export function POST(request: Request) {
  return tracksApi.createTrack(request);
}
