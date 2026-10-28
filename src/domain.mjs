export const utcDate = (time = Date.now()) => new Date(time).toISOString().slice(0, 10);
export function streakFor(checkIns, now = Date.now()) {
  const days = new Set(checkIns.map(x => x.date));
  let cursor = Date.parse(utcDate(now)), streak = 0;
  if (!days.has(utcDate(cursor))) cursor -= 86400000;
  while (days.has(utcDate(cursor))) { streak++; cursor -= 86400000; }
  return streak;
}
export function estimatePoints(checkIns) {
  const days = [...new Set(checkIns.map(x => x.date))].sort();
  let streak = 0, last = 0, total = 0;
  for (const day of days) { const t = Date.parse(day); streak = t - last === 86400000 ? streak + 1 : 1; total += 5 + (streak % 7 === 0 ? 10 : 0); last = t; }
  return total;
}
export function nextReset(now = Date.now()) {
  const minutes = Math.ceil((Date.parse(utcDate(now)) + 86400000 - now) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export const short = (address = '') => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
