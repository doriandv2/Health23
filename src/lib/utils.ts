export { clsx as cn } from "clsx";

export function splitTags(tags: string) {
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/®/g, "")
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(d).toLocaleDateString("en-GB", opts);
}
