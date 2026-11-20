"use client";
import { useEffect, useRef, useState } from "react";
import { DAY, dayKey, prevDay, type Log, type Seat, type Spark } from "@/lib/fire";
import { SPARKS, needInfo, type SparkKind } from "@/lib/catalog";
import { timeAgo } from "@/lib/client";

interface Props {
  seat: Seat;
  me: string;
  logs: Log[];
  sparks: Spark[];
  now: number;
  inviteUrl: string;
  onClose: () => void;
  onSend: (to: string, kind: string, extra: string) => Promise<void>;
}

const MOOD_DOT: Record<string, string> = { bright: "bright", okay: "okay", heavy: "heavy" };

export default function MemberSheet({ seat, me, logs, sparks, now, inviteUrl, onClose, onSend }: Props) {
  const isMe = seat.member.id === me;
  const name = seat.member.name;
  const [picked, setPicked] = useState<SparkKind | null>(null);
  const [extra, setExtra] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The last two weeks of check-ins, oldest first
  const days: string[] = [];
  let d = dayKey(now);
  for (let i = 0; i < 14; i++) { days.unshift(d); d = prevDay(d); }
  const byDay = new Map(logs.filter((l) => l.memberId === seat.member.id).map((l) => [l.day, l]));

  const need = seat.blanket ? needInfo(seat.blanket.need) : undefined;
  const othersReached = new Set(sparks.filter((s) => s.to === seat.member.id && s.from !== me && now - s.createdAt < 2 * DAY).map((s) => s.from)).size;
  const received = sparks.filter((s) => s.to === me).slice(-6).reverse();

  const send = async (k: SparkKind) => {
    if (k.custom && picked?.kind !== k.kind) { setPicked(k); return; }
    setBusy(true);
    setError("");
    try {
      await onSend(seat.member.id, k.kind, k.custom ? extra : "");
      setSent(k.custom && extra ? `${k.text} ${extra}` : k.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shareText = sent ? `${sent}\n\n(from our fire on Kindling: ${inviteUrl})` : "";
  const shareIt = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch {}
    } else {
      await navigator.clipboard?.writeText(shareText);
      setError("Copied! Paste it into your chat with " + name + ".");
    }
  };

  let status: string;
  if (isMe) status = "This is your seat.";
  else if (seat.status === "new") status = "Just pulled up a seat. Say hi!";
  else if (seat.status === "lit") status = `Checked in ${timeAgo(seat.lastLog!.createdAt, now)}.`;
  else if (seat.status === "warm") status = `Last checked in ${timeAgo(seat.lastLog!.createdAt, now)}.`;
  else status = `Quiet for ${seat.daysQuiet} days. Their seat is ${seat.status === "ember" ? "down to embers" : "cooling"}.`;

  const offer = need?.offer;
  const sparkList = offer ? [offer, ...SPARKS] : SPARKS;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={isMe ? "Your seat" : `${name}'s seat`} tabIndex={-1} ref={dialog} onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="sheet-head">
          <span className={`avatar big seat-${seat.status}`} style={{ ["--c" as string]: seat.member.color }}>{name[0].toUpperCase()}</span>
          <div>
            <h2>{isMe ? `You (${name})` : name}</h2>
            <p className="muted">{status}</p>
          </div>
        </div>

        {seat.blanket && !isMe && (
          <p className="blanket-note">🧣 Having a heavy day{need ? ` and ${need.ask}` : ""}.</p>
        )}
        {seat.lastLog?.note && now - seat.lastLog.createdAt < 3 * DAY && (
          <p className="quote">“{seat.lastLog.note}” <span className="muted small">{timeAgo(seat.lastLog.createdAt, now)}</span></p>
        )}

        <div className="strip" aria-label="Check-ins over the last two weeks">
          {days.map((day) => {
            const l = byDay.get(day);
            return <span key={day} className={`dot ${l ? MOOD_DOT[l.mood] : "none"}`} title={`${day}: ${l ? l.mood : "no log"}`} />;
          })}
        </div>
        <p className="small muted strip-legend">last 14 nights · <span className="dot bright" /> bright <span className="dot okay" /> okay <span className="dot heavy" /> heavy</p>

        {isMe ? (
          <div>
            <h3>Sparks you&apos;ve received</h3>
            {received.length === 0 ? <p className="muted">None yet. They&apos;ll show up here.</p> : (
              <ul className="spark-list">{received.map((s) => <li key={s.id}>{s.text} <span className="muted small">{timeAgo(s.createdAt, now)}</span></li>)}</ul>
            )}
          </div>
        ) : sent ? (
          <div className="sent">
            <p className="sent-title">✨ Spark tossed to {name}</p>
            <p className="muted">They&apos;ll see it next time they come to the fire. Want it to reach them sooner?</p>
            <div className="row">
              <button className="btn" onClick={shareIt}>💬 Send it as a text too</button>
              <button className="btn ghost" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div>
            <h3>Toss {name} a spark</h3>
            <p className="small muted">
              {othersReached > 0 ? `${othersReached} friend${othersReached > 1 ? "s" : ""} already reached out lately. One more never hurts.` : "Small and low-pressure. No reply needed."}
            </p>
            <div className="spark-grid">
              {sparkList.map((k) => (
                <button key={k.kind} className={`spark-btn${k === offer ? " offer" : ""}${picked?.kind === k.kind ? " on" : ""}`} disabled={busy} onClick={() => send(k)}>
                  <span aria-hidden>{k.emoji}</span> {k.label}
                </button>
              ))}
            </div>
            {picked?.custom && (
              <form className="custom" onSubmit={(e) => { e.preventDefault(); send(picked); }}>
                <label className="label" htmlFor="extra">{picked.text}</label>
                <div className="row">
                  <input id="extra" autoFocus value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={140} placeholder={picked.custom} />
                  <button className="btn primary" disabled={busy || !extra.trim()}>Send</button>
                </div>
              </form>
            )}
          </div>
        )}
        {error && <p className="error small" role="status">{error}</p>}
      </div>
    </div>
  );
}

