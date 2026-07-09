import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordTomomusicPlay } from "@/lib/tomomusic/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const trackId = typeof body.trackId === "string" ? body.trackId : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 120) : null;
  const secondsListened = Number(body.secondsListened || 0);
  if (!trackId) return NextResponse.json({ error: "trackId obrigatório" }, { status: 400 });
  const user = await getCurrentUser().catch(() => null);
  const result = recordTomomusicPlay(getDb(), { trackId, sessionId, secondsListened, userId: user?.id || null });
  return NextResponse.json(result);
}
