import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAuthorPlusStatus } from "@/lib/author-plus";
import { buildAssetFile } from "@/lib/author-plus-content";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  const db = getDb();
  const status = getAuthorPlusStatus(db, user.id);
  if (!status.active) return NextResponse.json({ ok: false, error: "author_plus_required" }, { status: 403 });
  const { assetId } = await params;
  const file = buildAssetFile(assetId);
  return new NextResponse(file.content, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "x-asset-filename": file.filename,
    },
  });
}
