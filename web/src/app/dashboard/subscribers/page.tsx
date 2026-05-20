import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriber } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";

async function addSubscriber(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  await db
    .insert(subscriber)
    .values({
      workspaceId: workspace.id,
      email,
      firstName: String(formData.get("firstName") ?? "") || null,
      status: "active",
      source: "manual",
      confirmedAt: new Date(),
    })
    .onConflictDoNothing();
  revalidatePath("/dashboard/subscribers");
}

async function unsubscribe(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const id = String(formData.get("id"));
  await db
    .update(subscriber)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(and(eq(subscriber.id, id), eq(subscriber.workspaceId, workspace.id)));
  revalidatePath("/dashboard/subscribers");
}

export default async function SubscribersPage() {
  const { workspace } = await requireWorkspace();
  const rows = await db.query.subscriber.findMany({
    where: eq(subscriber.workspaceId, workspace.id),
    orderBy: [desc(subscriber.createdAt)],
    limit: 100,
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscribers</h1>
          <p className="text-sm text-muted-foreground">{rows.length} most recent.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action={addSubscriber} className="flex gap-2">
            <Input name="firstName" placeholder="First name (optional)" className="max-w-[200px]" />
            <Input name="email" type="email" placeholder="email@domain.com" required className="flex-1" />
            <Button type="submit">Add subscriber</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Source</th>
                <th className="p-3">Added</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-mono text-xs">{s.email}</td>
                  <td className="p-3">{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{s.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{s.source ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{relativeTime(s.createdAt)}</td>
                  <td className="p-3">
                    {s.status !== "unsubscribed" && (
                      <form action={unsubscribe}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button variant="ghost" size="sm" type="submit">Unsub</Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No subscribers yet. Add one above or share a form.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
