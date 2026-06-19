import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";

export async function POST() {
  await logoutAction();
  return NextResponse.json({ ok: true });
}
