"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "A–Z"],
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-muted">Sort</span>
      <select
        className="rounded-full border border-line bg-white px-3 py-2 text-sm"
        value={params.get("sort") ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set("sort", e.target.value);
          else next.delete("sort");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      >
        {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
