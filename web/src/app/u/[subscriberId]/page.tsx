import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriber, suppression, messageEvent } from "@/db/schema";
import { Button } from "@/components/ui/button";

async function unsubscribe(formData: FormData) {
  "use server";
  const id = String(formData.get("subscriberId"));
  const messageId = String(formData.get("messageId") ?? "");
  const sub = await db.query.subscriber.findFirst({ where: eq(subscriber.id, id) });
  if (!sub) return;
  await db
    .update(subscriber)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscriber.id, id));
  await db
    .insert(suppression)
    .values({ workspaceId: sub.workspaceId, email: sub.email, reason: "user_unsubscribed" })
    .onConflictDoNothing();
  if (messageId) {
    await db
      .insert(messageEvent)
      .values({ messageId, type: "unsubscribed" })
      .catch(() => {});
  }
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ subscriberId: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { subscriberId } = await params;
  const { m } = await searchParams;
  const sub = await db.query.subscriber.findFirst({ where: eq(subscriber.id, subscriberId) });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border p-6 text-center">
        <h1 className="text-xl font-semibold">Unsubscribe</h1>
        {sub?.status === "unsubscribed" ? (
          <p className="text-muted-foreground">You've been unsubscribed.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Unsubscribe <strong>{sub?.email}</strong> from all future emails?
            </p>
            <form action={unsubscribe}>
              <input type="hidden" name="subscriberId" value={subscriberId} />
              <input type="hidden" name="messageId" value={m ?? ""} />
              <Button type="submit" variant="destructive">Unsubscribe me</Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
