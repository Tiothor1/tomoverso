import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { username, days } = await request.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Informe o username do usuário." }, { status: 400 });
    }
    const planDays = typeof days === "number" && days > 0 ? days : 30;

    const db = getDb();
    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined;
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Find the 'pro-monthly' plan (Plano Leitor)
    const plan = db.prepare("SELECT id FROM subscription_plans WHERE id = 'pro-monthly'").get() as { id: string } | undefined;
    if (!plan) {
      return NextResponse.json({ error: "Plano Leitor não encontrado no sistema." }, { status: 500 });
    }

    // Cancel existing active subscription for this user
    db.prepare("UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE user_id = ? AND status IN ('active', 'trialing')").run(user.id);

    // Create new subscription
    const id = crypto.randomUUID();
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(
      "INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))"
    ).run(id, user.id, plan.id, startsAt, endsAt);

    // Log grant
    db.prepare(
      "INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).run(`grant_log_${id}`, `Granted ${planDays}d plan to @${username} at ${startsAt}`);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      username,
      plan: plan.id,
      days: planDays,
      expiresAt: endsAt,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT key, value, updated_at FROM site_config WHERE key LIKE 'grant_log_%' ORDER BY updated_at DESC LIMIT 50"
    ).all() as { key: string; value: string; updated_at: string }[];
    
    // Get total count
    const count = db.prepare("SELECT COUNT(*) as c FROM site_config WHERE key LIKE 'grant_log_%'").get() as { c: number };
    
    return NextResponse.json({ grants: rows, total: count.c });
  } catch {
    return NextResponse.json({ grants: [], total: 0 });
  }
}
