import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { cleanHtml } from "@/lib/sanitize";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await db.blogPost.findUnique({ where: { slug: (await params).slug } });
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPostPage({ params }: Props) {
  const post = await db.blogPost.findUnique({ where: { slug: (await params).slug } });
  if (!post) notFound();
  return (
    <article className="container-x max-w-3xl py-12">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> All posts</Link>
      <p className="mt-8 text-sm text-ink-muted">{formatDate(post.publishedAt, { day: "numeric", month: "long", year: "numeric" })}</p>
      <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">{post.title}</h1>
      <div className="prose-r23 mt-8 text-base" dangerouslySetInnerHTML={{ __html: cleanHtml(post.html) }} />
      <div className="mt-12 rounded-3xl bg-sage-100 p-8 text-center">
        <p className="font-display text-2xl">Ready to feel the difference?</p>
        <Link href="/shop" className="btn-primary mt-5">Shop all products</Link>
      </div>
    </article>
  );
}
