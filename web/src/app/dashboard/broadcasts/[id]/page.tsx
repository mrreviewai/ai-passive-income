import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcast, subscriber, message } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { sendQueue } from "@/lib/queue";
import { injectTracking } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function saveBroadcast(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const id = String(formData.get("id"));
  await db
    .update(broadcast)
    .set({
      name: String(formData.get("name") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      previewText: String(formData.get("previewText") ?? "") || null,
      bodyHtml: String(formData.get("bodyHtml") ?? ""),
      fromName: String(formData.get("fromName") ?? "") || null,
      fromEmail: String(formData.get("fromEmail") ?? "") || null,
    })
    .where(and(eq(broadcast.id, id), eq(broadcast.workspaceId, workspace.id)));
  revalidatePath(`/dashboard/broadcasts/${id}`);
}

async function sendBroadcast(formData: FormData) {
  "use server";
  const { workspace } = await requireWorkspace();
  const id = String(formData.get("id"));
  const b = await db.query.broadcast.findFirst({
    where: and(eq(broadcast.id, id), eq(broadcast.workspaceId, workspace.id)),
  });
  if (!b || !b.subject || !b.bodyHtml) return;

  await db
    .update(broadcast)
    .set({ status: "sending", sentAt: new Date() })
    .where(eq(broadcast.id, id));

  const audience = await db.query.subscriber.findMany({
    where: and(eq(subscriber.workspaceId, workspace.id), eq(subscriber.status, "active")),
  });

  const from = b.fromEmail
    ? `${b.fromName ?? ""} <${b.fromEmail}>`.trim()
    : process.env.SMTP_FROM ?? "noreply@localhost";

  for (const sub of audience) {
    const [m] = await db
      .insert(message)
      .values({
        workspaceId: workspace.id,
        subscriberId: sub.id,
        broadcastId: b.id,
        subject: b.subject,
      })
      .returning();
    const html = injectTracking(b.bodyHtml, m.id, sub.id);
    await sendQueue.add(
      "send",
      {
        messageId: m.id,
        to: sub.email,
        from,
        subject: b.subject,
        html,
        headers: {
          "List-Unsubscribe": `<${process.env.APP_URL}/u/${sub.id}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  }

  await db.update(broadcast).set({ status: "sent" }).where(eq(broadcast.id, id));
  revalidatePath(`/dashboard/broadcasts/${id}`);
  redirect("/dashboard/broadcasts");
}

export default async function BroadcastEditor({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  const b = await db.query.broadcast.findFirst({
    where: and(eq(broadcast.id, id), eq(broadcast.workspaceId, workspace.id)),
  });
  if (!b) notFound();

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">{b.name}</h1>
        <p className="text-sm text-muted-foreground">Status: {b.status}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveBroadcast} className="space-y-4">
            <input type="hidden" name="id" value={b.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={b.name} />
              </div>
              <div className="space-y-2">
                <Label>From name</Label>
                <Input name="fromName" defaultValue={b.fromName ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input name="subject" defaultValue={b.subject} required />
              </div>
              <div className="space-y-2">
                <Label>From email</Label>
                <Input name="fromEmail" type="email" defaultValue={b.fromEmail ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preview text</Label>
              <Input name="previewText" defaultValue={b.previewText ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML)</Label>
              <Textarea name="bodyHtml" rows={16} defaultValue={b.bodyHtml} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline">Save draft</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={sendBroadcast}>
            <input type="hidden" name="id" value={b.id} />
            <p className="mb-3 text-sm text-muted-foreground">
              Send to all <strong>active</strong> subscribers in this workspace.
            </p>
            <Button type="submit" disabled={b.status === "sent" || b.status === "sending"}>
              {b.status === "sent" ? "Sent" : "Send now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
