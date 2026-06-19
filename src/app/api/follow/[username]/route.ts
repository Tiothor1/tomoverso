import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const db = getDb();
  const target = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined;
  if (!target) return NextResponse.json({ error: "Usuário não existe" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "Você não pode seguir a si mesmo" }, { status: 400 });

  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(user.id, target.id);

  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(user.id, target.id);
    return NextResponse.json({ following: false });
  } else {
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(user.id, target.id);
    return NextResponse.json({ following: true });
  }
}
