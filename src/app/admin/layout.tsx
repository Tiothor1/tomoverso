import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");

  // 2FA enforcement — check if admin has validated OTP in this session
  const cookieStore = await cookies();
  const validated = cookieStore.get("admin_2fa_validated")?.value;

  if (validated !== "1") {
    redirect("/admin/security?verify=1");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-6">
        {children}
      </main>
    </div>
  );
}
