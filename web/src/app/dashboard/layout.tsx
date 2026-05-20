import { requireWorkspace } from "@/lib/session";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { workspace, user } = await requireWorkspace();
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r bg-muted/30">
        <div className="border-b p-4">
          <div className="text-sm font-semibold">{workspace.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        <DashboardNav />
      </aside>
      <main className="overflow-auto">{children}</main>
    </div>
  );
}
