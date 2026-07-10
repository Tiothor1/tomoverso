import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto p-5 lg:p-6">
        {children}
      </main>
    </div>
  );
}
