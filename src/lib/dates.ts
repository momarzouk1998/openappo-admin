/**
 * Helper utilities to handle local date strings accurately
 * and avoid UTC midnight timezone rollback bugs.
 */

export function formatDateToYYYYMMDD(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayStr(): string {
  return formatDateToYYYYMMDD(new Date());
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: formatDateToYYYYMMDD(start),
    to: formatDateToYYYYMMDD(end),
  };
}

export function parseInputDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(`${dateStr}T12:00:00`);
}
