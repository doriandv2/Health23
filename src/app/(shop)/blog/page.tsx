import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog", description: "Nutrition guides and product deep-dives from the Red23 team." };

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({ orderBy: { publishedAt: "desc" } });
  return (
    <div className="container-x py-12">
      <p className="eyebrow">Journal</p>
      <h1 className="mt-2 text-5xl">The Red23 blog</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="card group flex flex-col p-6 transition hover:shadow-lift">
            <p className="text-xs text-ink-muted">{formatDate(p.publishedAt)}</p>
            <h2 className="mt-2 text-xl leading-snug group-hover:text-brand-600">{p.title}</h2>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">{p.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Read more <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
