import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return s.user;
}

export async function requireWorkspace() {
  const user = await requireUser();
  const membership = await db.query.workspaceMember.findFirst({
    where: eq(workspaceMember.userId, user.id),
  });
  if (!membership) redirect("/onboarding");
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.id, membership.workspaceId),
  });
  if (!ws) redirect("/onboarding");
  return { user, workspace: ws, role: membership.role };
}
