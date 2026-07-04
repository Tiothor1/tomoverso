import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAuthorPlusStatus } from "@/lib/author-plus";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ count: 0, isAuthor: false, unlimited: true });

  const db = getDb();
  const { total } = db.prepare(`
    SELECT COUNT(*) AS total
    FROM novels
    WHERE author_id = ?
  `).get(user.id) as { total: number };

  const status = getAuthorPlusStatus(db, user.id);
  return NextResponse.json({ count: total, isAuthor: status.active, unlimited: true, message: "Publicação gratuita liberada" });
}
