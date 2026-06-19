import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Configurações — Tomoverso",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
      </div>
      <SettingsForm user={user} />
    </div>
  );
}
