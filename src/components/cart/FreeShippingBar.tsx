import { Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD_PENCE } from "@/lib/config";
import { formatPrice } from "@/lib/money";

export function FreeShippingBar({ remainingPence, hasSubscription }: { remainingPence: number; hasSubscription: boolean }) {
  const pct = Math.min(100, ((FREE_SHIPPING_THRESHOLD_PENCE - remainingPence) / FREE_SHIPPING_THRESHOLD_PENCE) * 100);
  const unlocked = remainingPence <= 0;
  return (
    <div className="rounded-xl bg-sage-50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-sage-900">
        <Truck className="h-4 w-4 shrink-0" />
        {unlocked ? (
          <span><strong>Free delivery</strong> {hasSubscription ? "— a subscriber perk" : "unlocked"}</span>
        ) : (
          <span>You&apos;re <strong>{formatPrice(remainingPence)}</strong> away from free UK delivery</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-200" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
        <div className="h-full rounded-full bg-sage-600 transition-all duration-500" style={{ width: `${unlocked ? 100 : pct}%` }} />
      </div>
    </div>
  );
}
