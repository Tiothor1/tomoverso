import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/auth";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// POST /api/likes/[chapterId] — toggle like
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
  const chapter = db.prepare("SELECT id FROM chapters WHERE id = ?").get(chapterId);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const existing = db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND chapter_id = ?")
    .get(user.id, chapterId);

  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND chapter_id = ?").run(
      user.id,
      chapterId
    );
    return NextResponse.json({ liked: false });
  } else {
    db.prepare("INSERT INTO likes (user_id, chapter_id) VALUES (?, ?)").run(
      user.id,
      chapterId
    );
    return NextResponse.json({ liked: true });
  }
}
