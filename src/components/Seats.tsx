"use client";
import type { Seat } from "@/lib/fire";
import { MOODS } from "@/lib/catalog";

export const FIRE_X = 0.5;
export const FIRE_Y = 0.56;

/** Where seat i of n sits around the fire, as fractions of the scene. You always sit at the front. */
export function seatPos(i: number, n: number, narrow: boolean) {
  const a = Math.PI / 2 + (i / n) * Math.PI * 2;
  const rx = narrow ? 0.4 : 0.34;
  const ry = 0.29;
  return { x: FIRE_X + rx * Math.cos(a), y: FIRE_Y + ry * Math.sin(a) };
}

const STATUS_LABEL: Record<Seat["status"], string> = {
  new: "just pulled up a seat",
  lit: "checked in today",
  warm: "checked in recently",
  cooling: "seat is cooling",
  ember: "seat is down to embers",
};

export default function Seats({ seats, me, today, narrow, onPick }: { seats: Seat[]; me: string; today: string; narrow: boolean; onPick: (s: Seat) => void }) {
  return (
    <>
      {seats.map((s, i) => {
        const p = seatPos(i, seats.length, narrow);
        const behind = p.y < FIRE_Y - 0.05;
        const loggedToday = s.lastLog?.day === today;
        const mood = loggedToday ? MOODS.find((m) => m.mood === s.lastLog!.mood) : undefined;
        const isMe = s.member.id === me;
        const label = `${isMe ? "You" : s.member.name}: ${STATUS_LABEL[s.status]}${s.blanket ? ", having a heavy day" : ""}${s.status === "cooling" || s.status === "ember" ? `, quiet for ${s.daysQuiet} days` : ""}`;
        return (
          <button
            key={s.member.id}
            className={`seat seat-${s.status}${s.blanket ? " seat-blanket" : ""}${behind ? " seat-behind" : ""}${isMe ? " seat-me" : ""}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, ["--c" as string]: s.member.color }}
            onClick={() => onPick(s)}
            aria-label={label}
            title={label}
          >
            <span className="avatar">
              {s.member.name.slice(0, 1).toUpperCase()}
              {mood && <span className="mood-badge" aria-hidden>{mood.emoji}</span>}
              {s.blanket && <span className="blanket-badge" aria-hidden>🧣</span>}
              {(s.status === "cooling" || s.status === "ember") && <span className="ember-dot" aria-hidden />}
            </span>
            <span className="seat-name">{isMe ? "you" : s.member.name}</span>
          </button>
        );
      })}
    </>
  );
}
