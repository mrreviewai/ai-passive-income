import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tag } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

async function createTag(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(tag).values({ workspaceId: workspace.id, name }).onConflictDoNothing();
  revalidatePath("/dashboard/tags");
}

export default async function TagsPage() {
  const { workspace } = await requireWorkspace();
  const rows = await db.query.tag.findMany({
    where: eq(tag.workspaceId, workspace.id),
    orderBy: [desc(tag.createdAt)],
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <form action={createTag} className="flex gap-2">
          <Input name="name" placeholder="customer" />
          <Button type="submit">Add tag</Button>
        </form>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
            {rows.map((t) => (
              <span key={t.id} className="rounded-full bg-muted px-3 py-1 text-sm">
                {t.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
