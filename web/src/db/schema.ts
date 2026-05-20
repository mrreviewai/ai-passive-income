import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const subscriberStatus = pgEnum("subscriber_status", [
  "active",
  "unconfirmed",
  "unsubscribed",
  "bounced",
  "complained",
]);

export const broadcastStatus = pgEnum("broadcast_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "failed",
]);

export const sequenceStepStatus = pgEnum("sequence_step_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

export const automationStatus = pgEnum("automation_status", [
  "draft",
  "active",
  "paused",
  "archived",
]);

export const formStatus = pgEnum("form_status", ["draft", "published", "archived"]);

export const messageEventType = pgEnum("message_event_type", [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "unsubscribed",
  "failed",
]);

export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sendingDomain: text("sending_domain"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ unique: uniqueIndex("ws_member_unique").on(t.workspaceId, t.userId) }),
);

export const subscriber = pgTable(
  "subscriber",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    status: subscriberStatus("status").notNull().default("unconfirmed"),
    source: text("source"),
    fields: jsonb("fields").$type<Record<string, unknown>>().default({}).notNull(),
    confirmedAt: timestamp("confirmed_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    bouncedAt: timestamp("bounced_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    workspaceEmailUnique: uniqueIndex("subscriber_ws_email_unique").on(
      t.workspaceId,
      t.email,
    ),
    statusIdx: index("subscriber_status_idx").on(t.workspaceId, t.status),
  }),
);

export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ unique: uniqueIndex("tag_ws_name_unique").on(t.workspaceId, t.name) }),
);

export const subscriberTag = pgTable(
  "subscriber_tag",
  {
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscriber.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => ({ pk: uniqueIndex("subscriber_tag_pk").on(t.subscriberId, t.tagId) }),
);

export const segment = pgTable("segment", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  conditions: jsonb("conditions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const form = pgTable("form", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: formStatus("status").notNull().default("draft"),
  doubleOptin: boolean("double_optin").notNull().default(true),
  successUrl: text("success_url"),
  config: jsonb("config").notNull().default({}),
  appliesTagIds: jsonb("applies_tag_ids").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const broadcast = pgTable("broadcast", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  status: broadcastStatus("status").notNull().default("draft"),
  audience: jsonb("audience").notNull().default({}),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  stats: jsonb("stats").$type<Record<string, number>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sequence = pgTable("sequence", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: automationStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sequenceStep = pgTable("sequence_step", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => sequence.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  delayHours: integer("delay_hours").notNull().default(24),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
});

export const sequenceEnrollment = pgTable(
  "sequence_enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => sequence.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscriber.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    nextRunAt: timestamp("next_run_at"),
    completedAt: timestamp("completed_at"),
    pausedAt: timestamp("paused_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    unique: uniqueIndex("enrollment_unique").on(t.sequenceId, t.subscriberId),
    nextRunIdx: index("enrollment_next_run_idx").on(t.nextRunAt),
  }),
);

export const automation = pgTable("automation", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: automationStatus("status").notNull().default("draft"),
  trigger: jsonb("trigger").notNull(),
  graph: jsonb("graph").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const message = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscriber.id, { onDelete: "cascade" }),
    broadcastId: uuid("broadcast_id").references(() => broadcast.id, {
      onDelete: "set null",
    }),
    sequenceStepId: uuid("sequence_step_id").references(() => sequenceStep.id, {
      onDelete: "set null",
    }),
    smtpMessageId: text("smtp_message_id"),
    subject: text("subject").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    subIdx: index("message_subscriber_idx").on(t.subscriberId),
    bcIdx: index("message_broadcast_idx").on(t.broadcastId),
  }),
);

export const messageEvent = pgTable(
  "message_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => message.id, { onDelete: "cascade" }),
    type: messageEventType("type").notNull(),
    url: text("url"),
    meta: jsonb("meta").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    msgTypeIdx: index("message_event_type_idx").on(t.messageId, t.type),
    timeIdx: index("message_event_time_idx").on(t.createdAt),
  }),
);

export const suppression = pgTable(
  "suppression",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    unique: uniqueIndex("suppression_ws_email_unique").on(t.workspaceId, t.email),
  }),
);

export const apiKey = pgTable("api_key", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Subscriber = typeof subscriber.$inferSelect;
export type Broadcast = typeof broadcast.$inferSelect;
export type Sequence = typeof sequence.$inferSelect;
export type Form = typeof form.$inferSelect;
export type Workspace = typeof workspace.$inferSelect;
