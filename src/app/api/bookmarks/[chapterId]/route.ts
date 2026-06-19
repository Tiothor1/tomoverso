import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId } = await params;
  const db = getDb();

  const existing = db
    .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND chapter_id = ?")
    .get(user.id, chapterId);

  if (existing) {
    db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND chapter_id = ?").run(
      user.id,
      chapterId
    );
    return NextResponse.json({ bookmarked: false });
  } else {
    db.prepare("INSERT INTO bookmarks (user_id, chapter_id) VALUES (?, ?)").run(
      user.id,
      chapterId
    );
    return NextResponse.json({ bookmarked: true });
  }
}
