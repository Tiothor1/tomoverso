import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export const ADMIN_SECRET_FALLBACK = "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

export function getAdminSecretPath() {
  return process.env.ADMIN_SECRET_PATH || ADMIN_SECRET_FALLBACK;
}

export async function getSecretAdminOrRedirect(secretPath = getAdminSecretPath()) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") {
    redirect(`/${secretPath}`);
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") {
    redirect(`/${secretPath}`);
  }

  return user;
}

export async function requireSecretAdminAction() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") return null;

  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") return null;

  return user;
}
