import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0, isAuthor: false });

  const db = getDb();

  const { total } = db.prepare(`
    SELECT (SELECT COUNT(*) FROM novels WHERE author_id = ?) +
           (SELECT COUNT(*) FROM mangas WHERE author_id = ?) AS total
  `).get(user.id, user.id) as { total: number };

  const isAuthor = !!db.prepare(`
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing') AND sp.role_granted = 'author'
  `).get(user.id);

  return NextResponse.json({ count: total, isAuthor });
}
