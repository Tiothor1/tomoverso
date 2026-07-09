import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTomomusicPayload } from "@/lib/tomomusic/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getCurrentUser().catch(() => null);
  const payload = getTomomusicPayload(getDb(), user?.id || null, {
    q: url.searchParams.get("q") || undefined,
    mood: url.searchParams.get("mood") || undefined,
  });
  return NextResponse.json(payload);
}
