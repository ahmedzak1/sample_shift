import { tracksApi } from "@/server/tracks/default-api";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return tracksApi.getAudio(id);
}
