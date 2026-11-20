"use client";
// Seats you hold, kept on this device only. No accounts: your seat token is your key.
import { dayKey } from "./fire";

export interface SavedSeat {
  memberId: string;
  token: string;
  name?: string;
  circleName?: string;
  demoSeats?: { memberId: string; name: string; token: string }[];
}

const KEY = "kindling:seats";

export function loadSeats(): Record<string, SavedSeat> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSeat(code: string, seat: SavedSeat) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadSeats(), [code]: seat }));
  } catch {
    /* private mode: the seat lasts for this visit */
  }
}

export function forgetSeat(code: string) {
  try {
    const all = loadSeats();
    delete all[code];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export const today = () => dayKey(Date.now());

export async function api<T = unknown>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(opts.token ? { "x-kindling-token": opts.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { status: res.status });
  return data as T;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
