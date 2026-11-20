"use client";
import { useEffect, useRef } from "react";
import type { Spark } from "@/lib/fire";
import { sparkInfo } from "@/lib/catalog";
import { timeAgo } from "@/lib/client";

// "While you were away": the sparks friends tossed you, shown one by one.
export default function Inbox({ sparks, nameOf, colorOf, onDone }: { sparks: Spark[]; nameOf: (id: string) => string; colorOf: (id: string) => string; onDone: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  const people = new Set(sparks.map((s) => s.from)).size;
  return (
    <div className="overlay">
      <div className="sheet inbox" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
        <p className="eyebrow">While you were away</p>
        <h2 id="inbox-title">{sparks.length} spark{sparks.length > 1 ? "s" : ""} landed by your seat</h2>
        <p className="muted">{people > 1 ? `${people} friends were thinking of you.` : "Someone was thinking of you."} No reply needed.</p>
        <ul className="landed">
          {sparks.map((s, i) => (
            <li key={s.id} style={{ animationDelay: `${0.25 + i * 0.35}s`, ["--c" as string]: colorOf(s.from) }}>
              <span className="landed-emoji" aria-hidden>{sparkInfo(s.kind)?.emoji ?? "✨"}</span>
              <div>
                <p>{s.text}</p>
                <p className="small muted">{nameOf(s.from)} · {timeAgo(s.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
        <button ref={btn} className="btn primary wide" onClick={onDone}>🔥 Warm your hands</button>
      </div>
    </div>
  );
}
