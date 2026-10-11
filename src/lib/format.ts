export function formatINR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return `${sign}\u20B9${formatted}`;
}

export function formatDay(day: number): string {
  return `Day ${day}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
