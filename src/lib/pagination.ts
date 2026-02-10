export function buildPagination(current: number, total: number, radius = 2) {
  const pages: (number | "...")[] = [];
  if (total <= 1) return pages;

  const start = Math.max(1, current - radius);
  const end = Math.min(total, current + radius);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }

  return pages;
}
