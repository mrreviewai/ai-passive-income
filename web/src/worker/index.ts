import "dotenv/config";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { connection, type SendJob } from "@/lib/queue";
import { transporter } from "@/lib/mailer";
import { db } from "@/db";
import { message, messageEvent } from "@/db/schema";
import { processSequenceTick } from "./sequence-tick";

const sendWorker = new Worker<SendJob>(
  "send",
  async (job) => {
    const { messageId, to, from, subject, html, text, headers } = job.data;
    try {
      const info = await transporter.sendMail({ from, to, subject, html, text, headers });
      await db
        .update(message)
        .set({ smtpMessageId: info.messageId, sentAt: new Date() })
        .where(eq(message.id, messageId));
      await db.insert(messageEvent).values({ messageId, type: "sent" });
      return { messageId: info.messageId };
    } catch (err) {
      await db.insert(messageEvent).values({
        messageId,
        type: "failed",
        meta: { error: (err as Error).message },
      });
      throw err;
    }
  },
  { connection, concurrency: 10 },
);

sendWorker.on("failed", (job, err) => {
  console.error(`[send] job ${job?.id} failed:`, err.message);
});

const sequenceWorker = new Worker(
  "sequence-tick",
  async () => processSequenceTick(),
  { connection },
);

sequenceWorker.on("failed", (job, err) => {
  console.error(`[sequence-tick] job ${job?.id} failed:`, err.message);
});

console.log("Worker started: send + sequence-tick");

// Kick the sequence tick every minute as a fallback if a scheduler isn't set up.
setInterval(() => {
  processSequenceTick().catch((e) => console.error("[sequence-tick] tick error:", e));
}, 60_000);
