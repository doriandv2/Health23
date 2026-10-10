"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { ActionForm, FieldError, FormMessage } from "./ActionForm";
import { SubmitButton } from "./buttons";
import { Thumb } from "./ui";
import { saveProduct, previewDescription } from "@/app/admin/products/actions";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type ImageInput, type VariantInput } from "@/lib/admin/products";
import { cn, slugify } from "@/lib/utils";

export type ProductFormValues = {
  id?: string;
  title: string;
  slug: string;
  brand: string;
  categoryId: string;
  tags: string[];
  status: string;
  featured: boolean;
  subscribable: boolean;
  subscriptionDiscountPct: number;
  seoTitle: string;
  seoDescription: string;
  descriptionHtml: string;
  images: ImageInput[];
  variants: VariantInput[];
};

type Props = {
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  goals: string[];
  functions: string[];
  brands: string[];
};

const emptyVariant = (): VariantInput => ({ title: "Default", sku: "", price: "", compareAt: "", stock: "0" });

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-sans text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ProductForm({ initial, categories, goals, functions, brands }: Props) {
  const uid = useId();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const known = new Set([...goals, ...functions]);
  const [tags, setTags] = useState<Set<string>>(new Set(initial.tags.filter((t) => known.has(t))));
  const [extraTags, setExtraTags] = useState(initial.tags.filter((t) => !known.has(t)).join(", "));
  const [subscribable, setSubscribable] = useState(initial.subscribable);
  const [html, setHtml] = useState(initial.descriptionHtml);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [images, setImages] = useState<ImageInput[]>(initial.images);
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantInput[]>(initial.variants.length ? initial.variants : [emptyVariant()]);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounced, server-sanitised preview of the description.
  useEffect(() => {
    const t = setTimeout(() => startPreview(async () => setPreview(await previewDescription(html))), 350);
    return () => clearTimeout(t);
  }, [html]);

  const allTags = [...tags, ...extraTags.split(",").map((t) => t.trim()).filter(Boolean)];

  function toggleTag(t: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function addImageUrl() {
    const url = newUrl.trim();
    if (!url) return;
    setImages((imgs) => [...imgs, { url, alt: title }]);
    setNewUrl("");
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    const rejected: string[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES[f.type]) rejected.push(`${f.name}: unsupported type`);
      else if (f.size > MAX_UPLOAD_BYTES) rejected.push(`${f.name}: over 5 MB`);
      else fd.append("files", f);
    }
    if (!fd.has("files")) {
      setUploadMsg(rejected.join(" · "));
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await fetch("/admin/products/upload", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { urls?: string[]; errors?: string[]; error?: string };
      if (body.urls?.length) setImages((imgs) => [...imgs, ...body.urls!.map((url) => ({ url, alt: title }))]);
      const errs = [...rejected, ...(body.errors ?? []), ...(body.error ? [body.error] : [])];
      setUploadMsg(errs.length ? errs.join(" · ") : `Uploaded ${body.urls?.length ?? 0} image${body.urls?.length === 1 ? "" : "s"}. Save to keep them.`);
    } catch {
      setUploadMsg("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateVariant(i: number, patch: Partial<VariantInput>) {
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  const isEdit = Boolean(initial.id);

  return (
    <ActionForm action={saveProduct} showMessage={false} className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="tags" value={JSON.stringify(allTags)} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <div className="space-y-6 lg:col-span-2">
        <Section title="Basics">
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              className="input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
            <FieldError name="title" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="slug" className="label">
                URL slug
              </label>
              <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <span className="pl-4 text-sm text-ink-muted">/products/</span>
                <input
                  id="slug"
                  name="slug"
                  required
                  className="w-full rounded-xl bg-transparent py-3 pr-4 text-sm focus:outline-none"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  aria-describedby="slug-hint"
                />
              </div>
              <p id="slug-hint" className="mt-1 text-xs text-ink-muted">
                {slugTouched ? (
                  <button type="button" className="rounded underline" onClick={() => { setSlug(slugify(title)); setSlugTouched(false); }}>
                    Regenerate from title
                  </button>
                ) : (
                  "Generated from the title"
                )}
              </p>
              <FieldError name="slug" />
            </div>
            <div>
              <label htmlFor="brand" className="label">
                Brand
              </label>
              <input id="brand" name="brand" required className="input" defaultValue={initial.brand} list={`${uid}-brands`} autoComplete="off" />
              <datalist id={`${uid}-brands`}>
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <FieldError name="brand" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categoryId" className="label">
                Category
              </label>
              <select id="categoryId" name="categoryId" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new">+ New category…</option>
              </select>
            </div>
            {categoryId === "__new" && (
              <div>
                <label htmlFor="newCategory" className="label">
                  New category name
                </label>
                <input id="newCategory" name="newCategory" className="input" required autoFocus />
                <FieldError name="newCategory" />
              </div>
            )}
          </div>
        </Section>

        <Section title="Description" description="HTML is sanitised on save (scripts, styles and event handlers are removed).">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label htmlFor="descriptionHtml" className="label">
                HTML
              </label>
              <textarea id="descriptionHtml" name="descriptionHtml" value={html} onChange={(e) => setHtml(e.target.value)} rows={16} className="input font-mono text-xs leading-5" spellCheck={false} />
              <FieldError name="descriptionHtml" />
            </div>
            <div>
              <p className="label" id={`${uid}-preview`}>
                Preview {previewPending && <span className="font-normal normal-case text-ink-muted">· updating…</span>}
              </p>
              <div aria-labelledby={`${uid}-preview`} className="prose-r23 max-h-[380px] min-h-[200px] overflow-auto rounded-xl border border-line bg-cream/50 px-4 py-2">
                {preview === null ? <p className="text-ink-muted">Loading preview…</p> : preview ? <div dangerouslySetInnerHTML={{ __html: preview }} /> : <p className="text-ink-muted">Nothing to preview yet.</p>}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Images" description="The first image is the main product photo. JPG, PNG, WebP or AVIF up to 5 MB.">
          {images.length ? (
            <ol className="space-y-2">
              {images.map((img, i) => (
                <li key={`${img.url}-${i}`} className="flex items-center gap-3 rounded-xl border border-line p-2">
                  <Thumb src={img.url} alt="" size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-muted" title={img.url}>
                      {i === 0 && <span className="mr-1.5 font-semibold text-brand-600">Main</span>}
                      {img.url}
                    </p>
                    <label htmlFor={`${uid}-alt-${i}`} className="sr-only">
                      Alt text for image {i + 1}
                    </label>
                    <input id={`${uid}-alt-${i}`} className="input mt-1 py-1.5 text-xs" placeholder="Alt text (describe the image)" value={img.alt} onChange={(e) => setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                    <FieldError name={`images.${i}.url`} />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <button type="button" className="btn-ghost btn-sm px-2" disabled={i === 0} onClick={() => setImages((imgs) => move(imgs, i, i - 1))} aria-label={`Move image ${i + 1} up`}>
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className="btn-ghost btn-sm px-2" disabled={i === images.length - 1} onClick={() => setImages((imgs) => move(imgs, i, i + 1))} aria-label={`Move image ${i + 1} down`}>
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className="btn-ghost btn-sm px-2 text-red-700 hover:bg-red-50" onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">No images yet.</p>
          )}
          <FieldError name="images" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`${uid}-url`} className="sr-only">
              Image URL
            </label>
            <input
              id={`${uid}-url`}
              className="input py-2"
              placeholder="https://… or /images/…"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImageUrl();
                }
              }}
            />
            <button type="button" className="btn-outline btn-sm shrink-0" onClick={addImageUrl}>
              <ImagePlus className="h-4 w-4" aria-hidden /> Add URL
            </button>
            <input ref={fileRef} id={`${uid}-files`} type="file" accept={Object.keys(ACCEPTED_IMAGE_TYPES).join(",")} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            <label htmlFor={`${uid}-files`} className={cn("btn-outline btn-sm shrink-0 cursor-pointer focus-within:ring-2", uploading && "pointer-events-none opacity-60")}>
              <Upload className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : "Upload files"}
            </label>
          </div>
          {uploadMsg && (
            <p role="status" className="text-xs text-ink-soft">
              {uploadMsg}
            </p>
          )}
        </Section>

        <Section title="Variants & pricing" description="Prices in pounds, e.g. 24.99. Compare-at shows as a strikethrough price.">
          <div className="relative -mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="px-1 pb-2 font-semibold">Title</th>
                  <th scope="col" className="px-1 pb-2 font-semibold">SKU</th>
                  <th scope="col" className="px-1 pb-2 font-semibold">Price £</th>
                  <th scope="col" className="px-1 pb-2 font-semibold">Compare-at £</th>
                  <th scope="col" className="px-1 pb-2 font-semibold">Stock</th>
                  <th scope="col" className="px-1 pb-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id ?? `new-${i}`} className="align-top">
                    <td className="px-1 py-1">
                      <input aria-label={`Variant ${i + 1} title`} className="input py-2" value={v.title} onChange={(e) => updateVariant(i, { title: e.target.value })} />
                      <FieldError name={`variants.${i}.title`} />
                    </td>
                    <td className="px-1 py-1">
                      <input aria-label={`Variant ${i + 1} SKU`} className="input py-2" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                    </td>
                    <td className="w-28 px-1 py-1">
                      <input aria-label={`Variant ${i + 1} price in pounds`} inputMode="decimal" className="input py-2 tabular-nums" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} placeholder="0.00" />
                      <FieldError name={`variants.${i}.price`} />
                    </td>
                    <td className="w-28 px-1 py-1">
                      <input aria-label={`Variant ${i + 1} compare-at price in pounds`} inputMode="decimal" className="input py-2 tabular-nums" value={v.compareAt} onChange={(e) => updateVariant(i, { compareAt: e.target.value })} placeholder="—" />
                      <FieldError name={`variants.${i}.compareAt`} />
                    </td>
                    <td className="w-24 px-1 py-1">
                      <input aria-label={`Variant ${i + 1} stock`} type="number" min={0} step={1} className="input py-2 tabular-nums" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
                      <FieldError name={`variants.${i}.stock`} />
                    </td>
                    <td className="w-10 px-1 py-1">
                      <button type="button" className="btn-ghost btn-sm mt-1 px-2 text-red-700 hover:bg-red-50" disabled={variants.length === 1} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label={`Remove variant ${i + 1}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FieldError name="variants" />
          <button type="button" className="btn-outline btn-sm" onClick={() => setVariants((vs) => [...vs, { ...emptyVariant(), title: "" }])}>
            <Plus className="h-4 w-4" aria-hidden /> Add variant
          </button>
        </Section>

        <Section title="Search engine listing">
          <div>
            <label htmlFor="seoTitle" className="label">
              SEO title <span className="font-normal normal-case text-ink-muted">({seoTitle.length}/70)</span>
            </label>
            <input id="seoTitle" name="seoTitle" className="input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title} maxLength={70} />
            <FieldError name="seoTitle" />
          </div>
          <div>
            <label htmlFor="seoDescription" className="label">
              SEO description <span className="font-normal normal-case text-ink-muted">({seoDescription.length}/170)</span>
            </label>
            <textarea id="seoDescription" name="seoDescription" rows={3} className="input" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={170} />
            <FieldError name="seoDescription" />
          </div>
          <div className="rounded-xl border border-line bg-cream/40 p-4" aria-label="Search result preview">
            <p className="truncate text-xs text-ink-muted">red23.co.uk › products › {slug || "…"}</p>
            <p className="mt-0.5 truncate text-base text-[#1a0dab]">{seoTitle || title || "Product title"}</p>
            <p className="line-clamp-2 text-xs text-ink-soft">{seoDescription || "Add a description to control how this product appears in search results."}</p>
          </div>
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Status">
          <div>
            <label htmlFor="status" className="label">
              Visibility
            </label>
            <select id="status" name="status" defaultValue={initial.status} className="input">
              <option value="ACTIVE">Active — visible in the shop</option>
              <option value="DRAFT">Draft — hidden</option>
              <option value="ARCHIVED">Archived — hidden</option>
            </select>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="featured" defaultChecked={initial.featured} className="h-4 w-4 rounded border-line accent-brand-500" />
            Featured on the homepage
          </label>
        </Section>

        <Section title="Subscribe & Save">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="subscribable" checked={subscribable} onChange={(e) => setSubscribable(e.target.checked)} className="h-4 w-4 rounded border-line accent-brand-500" />
            Offer as a subscription
          </label>
          <div className={cn(!subscribable && "opacity-50")}>
            <label htmlFor="subscriptionDiscountPct" className="label">
              Subscription discount %
            </label>
            <input id="subscriptionDiscountPct" name="subscriptionDiscountPct" type="number" min={0} max={50} step={1} defaultValue={initial.subscriptionDiscountPct} className="input" disabled={!subscribable} />
            {!subscribable && <input type="hidden" name="subscriptionDiscountPct" value={initial.subscriptionDiscountPct} />}
            <FieldError name="subscriptionDiscountPct" />
          </div>
        </Section>

        <Section title="Tags" description="Goals and functions drive shop navigation.">
          {[
            { label: "Goals", list: goals },
            { label: "Functions", list: functions },
          ].map((group) => (
            <fieldset key={group.label}>
              <legend className="label">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.list.map((t) => {
                  const on = tags.has(t);
                  return (
                    <label key={t} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition focus-within:ring-2 focus-within:ring-brand-400", on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/40")}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleTag(t)} />
                      {t}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div>
            <label htmlFor={`${uid}-extra`} className="label">
              Other tags
            </label>
            <input id={`${uid}-extra`} className="input" value={extraTags} onChange={(e) => setExtraTags(e.target.value)} placeholder="Comma separated, e.g. Gluten free, Organic" />
            <FieldError name="tags" />
          </div>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
          <div className="mr-auto min-w-0">
            <FormMessage />
            <p className="hidden text-xs text-ink-muted sm:block">{isEdit ? "Changes go live as soon as you save." : "New products are created with the status you choose."}</p>
          </div>
          <SubmitButton className="btn-primary" pendingLabel="Saving…">
            {isEdit ? "Save product" : "Create product"}
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
