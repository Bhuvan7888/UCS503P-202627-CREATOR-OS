/** Format rupees with Indian digit grouping, rounded to whole rupees: 546000 → "₹5,46,000". */
export function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
