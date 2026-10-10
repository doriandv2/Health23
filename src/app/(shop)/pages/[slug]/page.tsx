import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cleanHtml } from "@/lib/sanitize";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await db.page.findUnique({ where: { slug: (await params).slug } });
  return page ? { title: page.title } : {};
}

export default async function PolicyPage({ params }: Props) {
  const page = await db.page.findUnique({ where: { slug: (await params).slug } });
  if (!page) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-4xl sm:text-5xl">{page.title}</h1>
      <div className="prose-r23 mt-8" dangerouslySetInnerHTML={{ __html: cleanHtml(page.html) }} />
    </div>
  );
}
