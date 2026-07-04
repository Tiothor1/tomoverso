import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Criar conta — Tomo Verso Editora",
};

export default async function SignupPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/dashboard/novels/new");
  return <SignupForm />;
}
