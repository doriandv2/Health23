const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatPrice(pence: number) {
  return gbp.format(pence / 100);
}

export function applyPct(pence: number, pct: number) {
  return Math.round(pence * (1 - pct / 100));
}

export function orderRef(id: number) {
  return `R23-${String(1000 + id)}`;
}
