import { Badge } from "@/components/ui";

const TONES = {
  PENDING: "amber", PAID: "blue", FULFILLED: "blue", SHIPPED: "sage", DELIVERED: "green", CANCELLED: "neutral", REFUNDED: "red",
  ACTIVE: "green", PAUSED: "amber", PAST_DUE: "red",
} as const;

const LABELS: Record<string, string> = { PENDING: "Awaiting payment", PAID: "Processing", FULFILLED: "Packed", PAST_DUE: "Payment due" };

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status as keyof typeof TONES] ?? "neutral";
  return <Badge tone={tone}>{LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
