"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sendEvent } from "./sendEvent";

export function PageTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    sendEvent({ type: "page_view", path: pathname, referrer: first.current ? document.referrer : undefined });
    first.current = false;
  }, [pathname]);
  return null;
}

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    sendEvent({ type: "product_view", productId });
  }, [productId]);
  return null;
}
