import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { form } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.query.form.findFirst({ where: eq(form.slug, slug) });
  if (!f || f.status !== "published") notFound();
  const config = (f.config ?? {}) as { headline?: string; description?: string };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">{config.headline ?? "Subscribe"}</h1>
          {config.description && (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          )}
        </div>
        <form action={`/api/forms/${f.slug}/submit`} method="post" className="space-y-3">
          <Input name="firstName" placeholder="First name (optional)" />
          <Input name="email" type="email" required placeholder="you@example.com" />
          <Button type="submit" className="w-full">Subscribe</Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          {f.doubleOptin ? "You'll get a confirmation email." : "You'll start receiving emails immediately."}
        </p>
      </div>
    </main>
  );
}
