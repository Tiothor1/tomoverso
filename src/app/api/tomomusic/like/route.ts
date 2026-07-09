import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toggleTomomusicLike } from "@/lib/tomomusic/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Faça login para curtir músicas." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const trackId = typeof body.trackId === "string" ? body.trackId : "";
  if (!trackId) return NextResponse.json({ error: "trackId obrigatório" }, { status: 400 });
  return NextResponse.json(toggleTomomusicLike(getDb(), user.id, trackId));
}
