import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, HOUR, dayKey, prevDay, seatFor, warmth, nightsKept, nudges, weekRecap, type Log, type Member } from "../src/lib/fire.ts";
import { promptFor, PROMPTS } from "../src/lib/catalog.ts";

const now = Date.UTC(2026, 10, 20, 12);
const m = (id: string): Member => ({ id, name: id, color: "#fff", joinedAt: now - 30 * DAY });
const log = (memberId: string, agoMs: number, extra: Partial<Log> = {}): Log => ({
  id: memberId + agoMs,
  memberId,
  day: dayKey(now - agoMs, 0),
  mood: "okay",
  note: "",
  answer: null,
  need: null,
  createdAt: now - agoMs,
  ...extra,
});

test("dayKey and prevDay handle month and year edges", () => {
  assert.equal(dayKey(Date.UTC(2026, 0, 1, 3), 0), "2026-01-01");
  assert.equal(dayKey(Date.UTC(2026, 0, 1, 3), 300), "2025-12-31"); // UTC-5
  assert.equal(prevDay("2026-03-01"), "2026-02-28");
  assert.equal(prevDay("2026-01-01"), "2025-12-31");
});

test("seats cool down the longer a friend is quiet", () => {
  const a = m("a");
  assert.equal(seatFor(a, [log("a", 2 * HOUR)], now).status, "lit");
  assert.equal(seatFor(a, [log("a", 2 * DAY)], now).status, "warm");
  assert.equal(seatFor(a, [log("a", 4 * DAY)], now).status, "cooling");
  assert.equal(seatFor(a, [log("a", 9 * DAY)], now).status, "ember");
  assert.equal(seatFor({ ...a, joinedAt: now - HOUR }, [], now).status, "new");
});

test("a heavy day puts a blanket on the seat for two days", () => {
  const a = m("a");
  const seat = seatFor(a, [log("a", 5 * HOUR, { mood: "heavy", need: "company" })], now);
  assert.deepEqual(seat.blanket?.need, "company");
  assert.equal(seatFor(a, [log("a", 3 * DAY, { mood: "heavy" })], now).blanket, null);
});

test("warmth never goes fully out and is capped at 1", () => {
  const ms = [m("a"), m("b")];
  assert.equal(warmth(ms, [], [], now), 0.08);
  const w = warmth(ms, [log("a", 0), log("b", 0)], [], now);
  assert.equal(w, 1);
  assert.ok(warmth(ms, [log("a", 0)], [], now) < 0.6);
});

test("nights kept is a shared streak that needs half the circle", () => {
  const ms = [m("a"), m("b"), m("c"), m("d")];
  const logs = [log("a", 1 * DAY), log("b", 1 * DAY), log("a", 2 * DAY), log("c", 2 * DAY), log("a", 3 * DAY)];
  const today = dayKey(now, 0);
  const r = nightsKept(ms, logs, today);
  assert.equal(r.streak, 2); // yesterday + day before; 3 days ago only one friend
  assert.equal(r.keptToday, false);
  assert.equal(r.stillNeeded, 2);
  const r2 = nightsKept(ms, [...logs, log("c", HOUR), log("d", HOUR)], today);
  assert.equal(r2.streak, 3);
  assert.equal(r2.keptToday, true);
});

test("nudges list quiet friends, quietest first, never yourself", () => {
  const ms = [m("me"), m("a"), m("b"), m("c")];
  const logs = [log("me", 9 * DAY), log("a", 4 * DAY), log("b", 8 * DAY), log("c", HOUR)];
  const seats = ms.map((x) => seatFor(x, logs, now));
  const sparks = [{ id: "s", from: "me", to: "a", kind: "thinking", text: "", createdAt: now - HOUR, seenAt: null }];
  const n = nudges(seats, sparks, "me", now);
  assert.deepEqual(n.map((x) => x.seat.member.id), ["b", "a"]);
  assert.equal(n[1].sparkedRecently, true);
});

test("everyone in a circle gets the same prompt each day", () => {
  assert.equal(promptFor("ABC123", "2026-11-20"), promptFor("ABC123", "2026-11-20"));
  assert.ok(PROMPTS.includes(promptFor("XYZ", "2026-01-01")));
});

test("week recap counts nights, check-ins, sparks and comebacks", () => {
  const ms = [m("a"), m("b")];
  const logs = [log("a", 9 * DAY), log("a", 2 * DAY), log("b", 2 * DAY), log("b", 1 * DAY)];
  const sparks = [
    { id: "1", from: "b", to: "a", kind: "thinking", text: "", createdAt: now - 5 * DAY, seenAt: null },
    { id: "2", from: "b", to: "a", kind: "miss", text: "", createdAt: now - 4 * DAY, seenAt: null },
    { id: "3", from: "b", to: "a", kind: "miss", text: "", createdAt: now - 1 * DAY, seenAt: null },
  ];
  const r = weekRecap(ms, logs, sparks, now, dayKey(now, 0));
  assert.equal(r.nights, 2); // quorum of 2 friends is 1
  assert.equal(r.checkIns, 3);
  assert.equal(r.sparksTossed, 3);
  assert.equal(r.comebacks.length, 1);
  assert.equal(r.comebacks[0].member.id, "a");
  assert.equal(r.comebacks[0].quietDays, 7);
  assert.equal(r.comebacks[0].sparksWaiting, 2);
});
