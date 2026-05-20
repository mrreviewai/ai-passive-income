import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { form } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function EmbedForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.query.form.findFirst({ where: eq(form.slug, slug) });
  if (!f || f.status !== "published") notFound();
  const config = (f.config ?? {}) as { headline?: string; description?: string };

  return (
    <div className="p-4">
      <form action={`/api/forms/${f.slug}/submit`} method="post" className="space-y-3">
        {config.headline && <h3 className="text-lg font-semibold">{config.headline}</h3>}
        <Input name="firstName" placeholder="First name" />
        <Input name="email" type="email" required placeholder="Email" />
        <Button type="submit" className="w-full">Subscribe</Button>
      </form>
    </div>
  );
}
