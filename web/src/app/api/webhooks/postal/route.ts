import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { message, messageEvent, subscriber, suppression } from "@/db/schema";

type PostalEvent = {
  event: string;
  payload: {
    message: { id: number; token: string; to: string };
    status?: string;
    details?: string;
    bounce?: boolean;
  };
};

function verifyPostalSignature(body: string, signature: string | null) {
  const secret = process.env.POSTAL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha1", secret).update(body).digest("hex");
  return expected === signature;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPostalSignature(raw, req.headers.get("x-postal-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as PostalEvent;

  const toEmail = event.payload.message.to.toLowerCase();
  const target = await db.query.subscriber.findFirst({
    where: eq(subscriber.email, toEmail),
  });
  if (!target) return NextResponse.json({ ok: true });

  switch (event.event) {
    case "MessageDelivered":
      await markEvent(target.workspaceId, toEmail, "delivered");
      break;
    case "MessageBounced":
      await db
        .update(subscriber)
        .set({ status: "bounced", bouncedAt: new Date() })
        .where(eq(subscriber.id, target.id));
      await db
        .insert(suppression)
        .values({ workspaceId: target.workspaceId, email: toEmail, reason: "bounce" })
        .onConflictDoNothing();
      await markEvent(target.workspaceId, toEmail, "bounced");
      break;
    case "MessageHeldInQueue":
      break;
    case "MessageSpamComplaint":
      await db
        .update(subscriber)
        .set({ status: "complained" })
        .where(eq(subscriber.id, target.id));
      await db
        .insert(suppression)
        .values({ workspaceId: target.workspaceId, email: toEmail, reason: "complaint" })
        .onConflictDoNothing();
      await markEvent(target.workspaceId, toEmail, "complained");
      break;
  }
  return NextResponse.json({ ok: true });
}

async function markEvent(
  workspaceId: string,
  email: string,
  type: "delivered" | "bounced" | "complained",
) {
  const m = await db.query.message.findFirst({
    where: eq(message.workspaceId, workspaceId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
  if (!m) return;
  await db.insert(messageEvent).values({ messageId: m.id, type, meta: { email } });
}
