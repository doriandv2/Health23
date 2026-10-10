import { Lock, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Free UK delivery", body: "On orders over £150" },
  { icon: ShieldCheck, title: "Researched & tested", body: "By our in-house nutrition team" },
  { icon: RotateCcw, title: "Easy returns", body: "Unused items within 7 days" },
  { icon: Lock, title: "Secure checkout", body: "Apple Pay, Google Pay & cards" },
];

export function TrustBadges({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-line">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sage-600" />
          <div>
            <p className="text-xs font-semibold">{title}</p>
            <p className="text-xs text-ink-muted">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
