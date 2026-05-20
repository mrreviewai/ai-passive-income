import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sequence } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

async function createSequence(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const name = String(formData.get("name") ?? "New sequence").trim();
  await db.insert(sequence).values({ workspaceId: workspace.id, name });
  revalidatePath("/dashboard/sequences");
}

export default async function SequencesPage() {
  const { workspace } = await requireWorkspace();
  const rows = await db.query.sequence.findMany({
    where: eq(sequence.workspaceId, workspace.id),
    orderBy: [desc(sequence.createdAt)],
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sequences</h1>
        <form action={createSequence} className="flex gap-2">
          <Input name="name" placeholder="Welcome series" />
          <Button type="submit">New sequence</Button>
        </form>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{s.status}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-muted-foreground">
                    No sequences yet. Create one to drip emails to new subscribers.
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
