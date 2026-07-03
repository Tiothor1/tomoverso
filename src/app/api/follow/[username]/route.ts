import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  const { username } = await params;
  if (user.username === username) return NextResponse.json({ ok: false, error: "Não pode seguir você mesmo" }, { status: 400 });

  const db = getDb();
  const target = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined;
  if (!target) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });

  const existing = db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(user.id, target.id);

  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(user.id, target.id);
    return NextResponse.json({ ok: true, following: false });
  } else {
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(user.id, target.id);
    return NextResponse.json({ ok: true, following: true });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const user = await getCurrentUser();
  const { username } = await params;

  const db = getDb();
  const target = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined;
  if (!target) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });

  const followerCount = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(target.id) as { c: number }).c;
  const followingCount = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?").get(target.id) as { c: number }).c;
  const isFollowing = user ? !!db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(user.id, target.id) : false;

  return NextResponse.json({ ok: true, followerCount, followingCount, isFollowing });
}
