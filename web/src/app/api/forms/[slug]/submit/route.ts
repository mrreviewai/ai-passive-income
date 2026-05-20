import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { form, subscriber, suppression } from "@/db/schema";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const f = await db.query.form.findFirst({ where: eq(form.slug, slug) });
  if (!f || f.status !== "published") {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const data = await req.formData();
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const firstName = String(data.get("firstName") ?? "") || null;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const suppressed = await db.query.suppression.findFirst({
    where: eq(suppression.email, email),
  });
  if (suppressed) {
    return NextResponse.redirect(new URL(f.successUrl ?? "/f/thanks", req.url), 303);
  }

  await db
    .insert(subscriber)
    .values({
      workspaceId: f.workspaceId,
      email,
      firstName,
      source: `form:${f.slug}`,
      status: f.doubleOptin ? "unconfirmed" : "active",
      confirmedAt: f.doubleOptin ? null : new Date(),
      ipAddress: req.headers.get("x-forwarded-for") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
    })
    .onConflictDoNothing();

  // TODO: enqueue confirmation email when doubleOptin
  return NextResponse.redirect(new URL(f.successUrl ?? "/f/thanks", req.url), 303);
}
