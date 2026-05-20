import { and, eq, lte, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  message,
  sequence,
  sequenceEnrollment,
  sequenceStep,
  subscriber,
  workspace,
} from "@/db/schema";
import { sendQueue } from "@/lib/queue";
import { injectTracking } from "@/lib/tracking";

export async function processSequenceTick() {
  const now = new Date();
  const due = await db.query.sequenceEnrollment.findMany({
    where: and(
      lte(sequenceEnrollment.nextRunAt, now),
      isNull(sequenceEnrollment.completedAt),
      isNull(sequenceEnrollment.pausedAt),
    ),
    limit: 200,
  });

  for (const enrollment of due) {
    const seq = await db.query.sequence.findFirst({
      where: eq(sequence.id, enrollment.sequenceId),
    });
    if (!seq || seq.status !== "active") continue;

    const step = await db.query.sequenceStep.findFirst({
      where: and(
        eq(sequenceStep.sequenceId, seq.id),
        eq(sequenceStep.position, enrollment.currentStep),
      ),
    });

    if (!step) {
      await db
        .update(sequenceEnrollment)
        .set({ completedAt: now, nextRunAt: null })
        .where(eq(sequenceEnrollment.id, enrollment.id));
      continue;
    }

    const sub = await db.query.subscriber.findFirst({
      where: eq(subscriber.id, enrollment.subscriberId),
    });
    if (!sub || sub.status !== "active") {
      await db
        .update(sequenceEnrollment)
        .set({ completedAt: now })
        .where(eq(sequenceEnrollment.id, enrollment.id));
      continue;
    }

    const ws = await db.query.workspace.findFirst({
      where: eq(workspace.id, seq.workspaceId),
    });

    const from = ws?.fromEmail
      ? `${ws.fromName ?? ""} <${ws.fromEmail}>`.trim()
      : process.env.SMTP_FROM ?? "noreply@localhost";

    const [m] = await db
      .insert(message)
      .values({
        workspaceId: seq.workspaceId,
        subscriberId: sub.id,
        sequenceStepId: step.id,
        subject: step.subject,
      })
      .returning();

    await sendQueue.add("send", {
      messageId: m.id,
      to: sub.email,
      from,
      subject: step.subject,
      html: injectTracking(step.bodyHtml, m.id, sub.id),
      text: step.bodyText ?? undefined,
    });

    const nextStep = await db.query.sequenceStep.findFirst({
      where: and(
        eq(sequenceStep.sequenceId, seq.id),
        eq(sequenceStep.position, enrollment.currentStep + 1),
      ),
    });

    if (nextStep) {
      const nextRun = new Date(now.getTime() + nextStep.delayHours * 3600 * 1000);
      await db
        .update(sequenceEnrollment)
        .set({ currentStep: enrollment.currentStep + 1, nextRunAt: nextRun })
        .where(eq(sequenceEnrollment.id, enrollment.id));
    } else {
      await db
        .update(sequenceEnrollment)
        .set({ completedAt: now, nextRunAt: null })
        .where(eq(sequenceEnrollment.id, enrollment.id));
    }
  }
}
