import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const globalForQueue = globalThis as unknown as {
  connection?: IORedis;
  sendQueue?: Queue;
  sequenceQueue?: Queue;
};

export const connection =
  globalForQueue.connection ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

export const sendQueue =
  globalForQueue.sendQueue ?? new Queue("send", { connection });

export const sequenceQueue =
  globalForQueue.sequenceQueue ?? new Queue("sequence-tick", { connection });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.connection = connection;
  globalForQueue.sendQueue = sendQueue;
  globalForQueue.sequenceQueue = sequenceQueue;
}

export type SendJob = {
  messageId: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};
