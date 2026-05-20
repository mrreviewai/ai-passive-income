import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function createWorkspace(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const sendingDomain = String(formData.get("sendingDomain") ?? "").trim();
  const fromEmail = String(formData.get("fromEmail") ?? "").trim();
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [ws] = await db
    .insert(workspace)
    .values({ name, slug, sendingDomain, fromEmail, fromName: user.name ?? null })
    .returning();
  await db.insert(workspaceMember).values({
    workspaceId: ws.id,
    userId: user.id,
    role: "owner",
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export default async function OnboardingPage() {
  const user = await requireUser();
  const existing = await db.query.workspaceMember.findFirst({
    where: eq(workspaceMember.userId, user.id),
  });
  if (existing) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>One workspace per brand. You can add domains later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" required placeholder="Acme Newsletter" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendingDomain">Sending domain (optional)</Label>
              <Input id="sendingDomain" name="sendingDomain" placeholder="mail.acme.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From email (optional)</Label>
              <Input id="fromEmail" name="fromEmail" type="email" placeholder="hello@acme.com" />
            </div>
            <Button type="submit" className="w-full">Create workspace</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
