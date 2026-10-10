type ClientEvent = {
  type: "page_view" | "product_view" | "add_to_cart" | "checkout_started" | "search";
  path?: string;
  referrer?: string;
  productId?: string;
  valuePence?: number;
  meta?: Record<string, string | number | boolean>;
};

export function sendEvent(event: ClientEvent) {
  try {
    const body = JSON.stringify(event);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {}
}
