import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { broadcast } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/utils";

async function createBroadcast(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const name = String(formData.get("name") ?? "Untitled").trim();
  const [b] = await db
    .insert(broadcast)
    .values({
      workspaceId: workspace.id,
      name: name || "Untitled",
      subject: "",
      bodyHtml: "",
      fromEmail: workspace.fromEmail,
      fromName: workspace.fromName,
    })
    .returning();
  revalidatePath("/dashboard/broadcasts");
  redirect(`/dashboard/broadcasts/${b.id}`);
}

export default async function BroadcastsPage() {
  const { workspace } = await requireWorkspace();
  const rows = await db.query.broadcast.findMany({
    where: eq(broadcast.workspaceId, workspace.id),
    orderBy: [desc(broadcast.createdAt)],
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Broadcasts</h1>
        <form action={createBroadcast} className="flex gap-2">
          <Input name="name" placeholder="Broadcast name" />
          <Button type="submit">New broadcast</Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/dashboard/broadcasts/${b.id}`} className="font-medium underline-offset-2 hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{b.subject || "—"}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{b.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{relativeTime(b.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">No broadcasts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
