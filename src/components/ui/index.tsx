import { cn } from "@/lib/utils";

export function Badge({ tone = "neutral", className, children }: { tone?: "neutral" | "brand" | "sage" | "green" | "amber" | "red" | "blue" | "dark"; className?: string; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-black/5 text-ink-soft",
    brand: "bg-brand-100 text-brand-700",
    sage: "bg-sage-100 text-sage-800",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-800",
    dark: "bg-ink text-white",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function Field({ label, htmlFor, children, hint, error }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-xl">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Stars({ className }: { className?: string }) {
  return <span aria-label="5 out of 5 stars" className={cn("tracking-[2px] text-brand-500", className)}>★★★★★</span>;
}
