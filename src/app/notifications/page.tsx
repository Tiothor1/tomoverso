import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { NotificationList } from "./notification-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notificações — Tomo Verso Editora",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe novidades dos seus autores favoritos.</p>
        </div>
      </div>
      <NotificationList />
    </main>
  );
}
