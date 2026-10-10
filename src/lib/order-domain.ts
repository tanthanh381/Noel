export type OrderLine = { unitPrice: number; quantity: number };
export function calculateSubtotal(lines: OrderLine[]) { return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0); }
export function calculateDiscount(subtotal: number, type: "PERCENTAGE" | "FIXED", value: number, minimumOrder = 0) {
  if (subtotal < minimumOrder) return 0;
  const discount = type === "PERCENTAGE" ? Math.round(subtotal * value / 100) : value;
  return Math.max(0, Math.min(subtotal, discount));
}
export function calculateChange(total: number, received: number) { return Math.max(0, received - total); }
export function canTransitionOrder(from: string, to: string) {
  const transitions: Record<string, string[]> = { NEW: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["READY", "CANCELLED"], READY: ["COMPLETED"], COMPLETED: [], CANCELLED: [] };
  return transitions[from]?.includes(to) ?? false;
}
