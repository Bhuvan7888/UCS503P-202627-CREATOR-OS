/** Local-time date helpers for the calendar (weeks start on Monday). */

export type CalendarView = "week" | "month";

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(r, -((r.getDay() + 6) % 7));
}

/** The days shown: one week, or whole weeks covering the month. */
export function gridDays(view: CalendarView, anchor: Date): Date[] {
  if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const first = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let d = first; d <= last || days.length % 7; d = addDays(d, 1)) days.push(d);
  return days;
}

/** YYYY-MM-DD in local time (the format of <input type="date"> and due_date). */
export function localIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** ISO timestamp → value for <input type="datetime-local">. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${localIsoDate(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function shift(view: CalendarView, anchor: Date, step: number): Date {
  return view === "week"
    ? addDays(anchor, 7 * step)
    : new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
}

export function periodTitle(view: CalendarView, anchor: Date): string {
  if (view === "month")
    return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return `Week of ${startOfWeek(anchor).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}
