// The rules of the fire. Pure functions only, so they run the same on the server,
// in the browser and in tests.

export type Mood = "bright" | "okay" | "heavy";
export type Need = "company" | "distract" | "talk" | "fyi";

export interface Member {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export interface Log {
  id: string;
  memberId: string;
  day: string; // YYYY-MM-DD in the writer's local time
  mood: Mood;
  note: string;
  answer: string | null; // null when hidden from you (you haven't logged today)
  need: Need | null;
  createdAt: number;
}

export interface Spark {
  id: string;
  from: string;
  to: string;
  kind: string;
  text: string;
  createdAt: number;
  seenAt: number | null;
}

export type SeatStatus = "new" | "lit" | "warm" | "cooling" | "ember";

export interface Seat {
  member: Member;
  status: SeatStatus;
  daysQuiet: number; // whole days since their last log (0 = today)
  lastLog: Log | null;
  blanket: { need: Need | null; since: number } | null; // logged a heavy day in the last 48h
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** YYYY-MM-DD for a timestamp, in local time (or a fixed UTC offset in minutes, as from getTimezoneOffset). */
export function dayKey(ts: number, tzOffsetMin?: number): string {
  const d = tzOffsetMin === undefined ? new Date(ts) : new Date(ts - tzOffsetMin * 60_000);
  const y = tzOffsetMin === undefined ? d.getFullYear() : d.getUTCFullYear();
  const m = (tzOffsetMin === undefined ? d.getMonth() : d.getUTCMonth()) + 1;
  const day = tzOffsetMin === undefined ? d.getDate() : d.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The day before a YYYY-MM-DD key. */
export function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - DAY;
  return dayKey(t, 0);
}

export function latestLog(logs: Log[], memberId: string): Log | null {
  let best: Log | null = null;
  for (const l of logs) if (l.memberId === memberId && (!best || l.createdAt > best.createdAt)) best = l;
  return best;
}

export function seatFor(member: Member, logs: Log[], now: number): Seat {
  const last = latestLog(logs, member.id);
  if (!last) {
    const age = now - member.joinedAt;
    const status: SeatStatus = age < 2 * DAY ? "new" : age < 3 * DAY ? "warm" : age < 6 * DAY ? "cooling" : "ember";
    return { member, status, daysQuiet: Math.floor(age / DAY), lastLog: null, blanket: null };
  }
  const since = now - last.createdAt;
  const status: SeatStatus = since < DAY ? "lit" : since < 3 * DAY ? "warm" : since < 6 * DAY ? "cooling" : "ember";
  const blanket = last.mood === "heavy" && since < 2 * DAY ? { need: last.need, since: last.createdAt } : null;
  return { member, status, daysQuiet: Math.floor(since / DAY), lastLog: last, blanket };
}

/**
 * How big the fire is, from 0.08 (a glowing ember, never fully out) to 1 (roaring).
 * Each friend's warmth fades over about a day and a half after their last log, and
 * sparks sent in the last day add a little heat: reaching out keeps the fire going too.
 */
export function warmth(members: Member[], logs: Log[], sparks: Spark[], now: number): number {
  if (members.length === 0) return 0.08;
  let total = 0;
  for (const m of members) {
    const last = latestLog(logs, m.id);
    if (last) total += Math.exp(-(now - last.createdAt) / (36 * HOUR));
  }
  const recentSparks = sparks.filter((s) => now - s.createdAt < DAY).length;
  const w = total / members.length + Math.min(0.2, recentSparks * 0.04);
  return Math.max(0.08, Math.min(1, w));
}

/** How many friends need to log for a night to count as kept. */
export function quorum(memberCount: number): number {
  return Math.max(1, Math.ceil(memberCount / 2));
}

/**
 * Nights kept: a shared streak. A night counts when at least half the circle logged that day.
 * Tonight doesn't break the streak until it's over, so the count starts from yesterday
 * if tonight isn't kept yet.
 */
export function nightsKept(members: Member[], logs: Log[], today: string) {
  const byDay = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!byDay.has(l.day)) byDay.set(l.day, new Set());
    byDay.get(l.day)!.add(l.memberId);
  }
  const need = quorum(members.length);
  const countOn = (d: string) => byDay.get(d)?.size ?? 0;
  const keptToday = countOn(today) >= need;
  let streak = 0;
  let d = keptToday ? today : prevDay(today);
  while (countOn(d) >= need && streak < 3650) {
    streak++;
    d = prevDay(d);
  }
  let totalKept = 0;
  for (const [, who] of byDay) if (who.size >= need) totalKept++;
  return { streak, keptToday, loggedToday: countOn(today), need, stillNeeded: Math.max(0, need - countOn(today)), totalKept };
}

export interface Nudge {
  seat: Seat;
  sparkedRecently: boolean; // you already sent them a spark in the last day
}

/** Friends whose seats are cooling, quietest first. The fire asks everyone else to reach out. */
export function nudges(seats: Seat[], sparks: Spark[], me: string, now: number): Nudge[] {
  return seats
    .filter((s) => s.member.id !== me && (s.status === "cooling" || s.status === "ember"))
    .sort((a, b) => b.daysQuiet - a.daysQuiet)
    .map((seat) => ({
      seat,
      sparkedRecently: sparks.some((sp) => sp.from === me && sp.to === seat.member.id && now - sp.createdAt < DAY),
    }));
}

/** One line describing the fire, for screen readers and the header. */
export function describeFire(w: number): string {
  if (w > 0.8) return "The fire is roaring";
  if (w > 0.55) return "The fire is burning bright";
  if (w > 0.3) return "The fire is flickering";
  if (w > 0.15) return "The fire is getting low";
  return "Just embers left";
}

export interface Comeback {
  member: Member;
  quietDays: number; // how long they were away
  sparksWaiting: number; // sparks friends sent them while they were quiet
  at: number;
}

/**
 * The last seven days at the fire: nights kept, check-ins, sparks, and comebacks:
 * friends who returned after 3+ quiet days, with how many sparks were waiting for them.
 */
export function weekRecap(members: Member[], logs: Log[], sparks: Spark[], now: number, today: string) {
  const days: string[] = [];
  let d = today;
  for (let i = 0; i < 7; i++) { days.push(d); d = prevDay(d); }
  const inWeek = new Set(days);
  const need = quorum(members.length);
  const byDay = new Map<string, Set<string>>();
  for (const l of logs) if (inWeek.has(l.day)) {
    if (!byDay.has(l.day)) byDay.set(l.day, new Set());
    byDay.get(l.day)!.add(l.memberId);
  }
  const nights = days.filter((x) => (byDay.get(x)?.size ?? 0) >= need).length;
  const checkIns = logs.filter((l) => inWeek.has(l.day)).length;
  const weekStart = now - 7 * DAY;
  const sparksTossed = sparks.filter((s) => s.createdAt > weekStart).length;
  const comebacks: Comeback[] = [];
  for (const m of members) {
    const mine = logs.filter((l) => l.memberId === m.id).sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 1; i < mine.length; i++) {
      const gap = mine[i].createdAt - mine[i - 1].createdAt;
      if (mine[i].createdAt > weekStart && gap >= 3 * DAY) {
        const waiting = sparks.filter((s) => s.to === m.id && s.createdAt > mine[i - 1].createdAt && s.createdAt < mine[i].createdAt).length;
        comebacks.push({ member: m, quietDays: Math.floor(gap / DAY), sparksWaiting: waiting, at: mine[i].createdAt });
      }
    }
  }
  comebacks.sort((a, b) => b.at - a.at);
  return { nights, checkIns, sparksTossed, comebacks };
}
