import type { ReactNode } from "react";
import { requireStaff } from "@/lib/auth/rbac";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/sidebar";
import { QuickSearch } from "@/components/admin/quick-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AdminShell({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar permissions={[...staff.permissions]} siteName={siteName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-x-0 border-t-0 px-3 sm:px-5">
          <AdminMobileNav permissions={[...staff.permissions]} siteName={siteName} />
          <QuickSearch permissions={[...staff.permissions]} />
          <span className="min-w-0 flex-1 truncate text-right text-[14px] text-fg-muted">{staff.name ?? staff.email}</span>
          <ThemeToggle />
        </header>
        {/* overflow-x-clip is a safety net: nothing inside can ever make the whole admin scroll sideways */}
        <main className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
