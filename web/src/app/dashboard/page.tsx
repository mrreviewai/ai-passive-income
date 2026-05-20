import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { broadcast, message, messageEvent, subscriber } from "@/db/schema";
import { requireWorkspace } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export default async function DashboardHome() {
  const { workspace } = await requireWorkspace();

  const [subs] = await db
    .select({ total: count() })
    .from(subscriber)
    .where(eq(subscriber.workspaceId, workspace.id));

  const [active] = await db
    .select({ total: count() })
    .from(subscriber)
    .where(sql`${subscriber.workspaceId} = ${workspace.id} AND ${subscriber.status} = 'active'`);

  const [sent] = await db
    .select({ total: count() })
    .from(message)
    .where(eq(message.workspaceId, workspace.id));

  const opens = await db
    .select({ total: count() })
    .from(messageEvent)
    .innerJoin(message, eq(message.id, messageEvent.messageId))
    .where(sql`${message.workspaceId} = ${workspace.id} AND ${messageEvent.type} = 'opened'`);

  const recentBroadcasts = await db.query.broadcast.findMany({
    where: eq(broadcast.workspaceId, workspace.id),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    limit: 5,
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Workspace activity at a glance.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Subscribers" value={subs?.total ?? 0} />
        <Stat label="Active" value={active?.total ?? 0} />
        <Stat label="Emails sent" value={sent?.total ?? 0} />
        <Stat label="Opens" value={opens[0]?.total ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent broadcasts</CardTitle>
          <CardDescription>Last 5 broadcasts in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentBroadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <ul className="divide-y">
              {recentBroadcasts.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.subject}</div>
                  </div>
                  <div className="text-xs uppercase text-muted-foreground">{b.status}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold">{formatNumber(value)}</div>
      </CardContent>
    </Card>
  );
}
