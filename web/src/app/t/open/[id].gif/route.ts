import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageEvent } from "@/db/schema";
import { verifyToken } from "@/lib/tracking";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idGif } = await ctx.params;
  const id = idGif.replace(/\.gif$/, "");
  const sig = new URL(req.url).searchParams.get("s") ?? "";
  if (verifyToken(`open:${id}`, sig)) {
    await db
      .insert(messageEvent)
      .values({
        messageId: id,
        type: "opened",
        meta: { ua: req.headers.get("user-agent") ?? "" },
      })
      .catch(() => {});
  }
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
