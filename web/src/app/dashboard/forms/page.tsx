import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { form } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

async function createForm(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const name = String(formData.get("name") ?? "Untitled form").trim();
  await db.insert(form).values({
    workspaceId: workspace.id,
    name,
    slug: nanoid(10),
    status: "published",
    config: { headline: "Join the list", description: "Get updates in your inbox." },
  });
  revalidatePath("/dashboard/forms");
}

export default async function FormsPage() {
  const { workspace } = await requireWorkspace();
  const rows = await db.query.form.findMany({
    where: eq(form.workspaceId, workspace.id),
    orderBy: [desc(form.createdAt)],
  });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <form action={createForm} className="flex gap-2">
          <Input name="name" placeholder="Form name" />
          <Button type="submit">New form</Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Hosted URL</th>
                <th className="p-3">Embed</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="p-3 font-medium">{f.name}</td>
                  <td className="p-3">
                    <Link href={`/f/${f.slug}`} className="font-mono text-xs underline">
                      {appUrl}/f/{f.slug}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {`<iframe src="${appUrl}/f/${f.slug}/embed" width="100%" height="320" frameborder="0"></iframe>`}
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{f.status}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No forms yet.
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
