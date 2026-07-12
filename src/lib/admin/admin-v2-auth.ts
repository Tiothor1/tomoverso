import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const ADMIN_SECRET_FALLBACK = "";

export function getAdminSecretPath() {
  return process.env.ADMIN_SECRET_PATH || "";
}

export async function getSecretAdminOrRedirect(secretPath = getAdminSecretPath()) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") {
    redirect(`/${secretPath}`);
  }

  return user;
}

export async function requireSecretAdminAction() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") return null;

  return user;
}
