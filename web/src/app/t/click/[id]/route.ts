import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageEvent } from "@/db/schema";
import { verifyToken } from "@/lib/tracking";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const encoded = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("s") ?? "";
  if (!verifyToken(`click:${id}:${encoded}`, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const target = Buffer.from(encoded, "base64url").toString("utf8");
  try {
    new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  await db
    .insert(messageEvent)
    .values({ messageId: id, type: "clicked", url: target })
    .catch(() => {});
  return NextResponse.redirect(target, 302);
}
