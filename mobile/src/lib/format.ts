export const naira = (n: number): string => '₦' + Math.round(n).toLocaleString('en-NG');
export const plain = (n: number): string => Math.round(n).toLocaleString('en-NG');

export function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

/** Compact age for dense lists: "25 min", "2 hrs", "3 days". */
export function shortAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) { const h = Math.round(mins / 60); return `${h} ${h === 1 ? 'hr' : 'hrs'}`; }
  const d = Math.round(mins / 1440);
  return `${d} ${d === 1 ? 'day' : 'days'}`;
}

export const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
