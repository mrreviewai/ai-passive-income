import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function saveSettings(formData: FormData) {
  "use server";
  const { workspace: ws } = await requireWorkspace();
  await db
    .update(workspace)
    .set({
      name: String(formData.get("name") ?? ws.name),
      sendingDomain: String(formData.get("sendingDomain") ?? "") || null,
      fromName: String(formData.get("fromName") ?? "") || null,
      fromEmail: String(formData.get("fromEmail") ?? "") || null,
    })
    .where(eq(workspace.id, ws.id));
  revalidatePath("/dashboard/settings");
}

export default async function SettingsPage() {
  const { workspace: ws } = await requireWorkspace();
  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={ws.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From name</Label>
                <Input name="fromName" defaultValue={ws.fromName ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>From email</Label>
                <Input name="fromEmail" type="email" defaultValue={ws.fromEmail ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sending domain</Label>
              <Input name="sendingDomain" defaultValue={ws.sendingDomain ?? ""} placeholder="mail.yourdomain.com" />
              <p className="text-xs text-muted-foreground">
                Must have SPF, DKIM, and DMARC configured. See docs/postal-setup.md.
              </p>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
