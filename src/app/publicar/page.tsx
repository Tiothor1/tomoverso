import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PublicarPage() {
  const user = await getCurrentUser().catch(() => null);
  redirect(user ? "/dashboard/novels/new" : "/auth/signup");
}
