"use client";
import { useState } from "react";
import type { Log, Mood, Need } from "@/lib/fire";
import { MOODS, NEEDS } from "@/lib/catalog";

interface Props {
  prompt: string;
  mine: Log | null; // my log tonight, if any
  onSubmit: (v: { mood: Mood; need: Need | null; note: string; answer: string }) => Promise<void>;
}

export default function TonightCard({ prompt, mine, onSubmit }: Props) {
  const [editing, setEditing] = useState(!mine);
  const [mood, setMood] = useState<Mood | null>(mine?.mood ?? null);
  const [need, setNeed] = useState<Need | null>(mine?.need ?? null);
  const [note, setNote] = useState(mine?.note ?? "");
  const [answer, setAnswer] = useState(mine?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (mine && !editing) {
    const m = MOODS.find((x) => x.mood === mine.mood)!;
    return (
      <section className="card tonight done">
        <div className="card-head">
          <h2>✓ Your log is on the fire</h2>
          <button className="link" onClick={() => setEditing(true)}>Edit</button>
        </div>
        <p className="muted">
          {m.emoji} {m.label}
          {mine.need && <> · {NEEDS.find((n) => n.need === mine.need)?.label}</>}
          {mine.note && <> · “{mine.note}”</>}
        </p>
        {mine.answer && <p className="my-answer"><span className="muted">{prompt}</span><br />{mine.answer}</p>}
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood) return setError("Pick how today felt first.");
    setBusy(true);
    setError("");
    try {
      await onSubmit({ mood, need: mood === "heavy" ? need : null, note, answer });
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card tonight" onSubmit={submit}>
      <h2>Add your log to the fire</h2>
      <p className="muted small">One tap is enough. It tells your friends you&apos;re here.</p>

      <fieldset className="chips" aria-label="How did today feel?">
        <legend className="label">How did today feel?</legend>
        {MOODS.map((m) => (
          <label key={m.mood} className={`chip${mood === m.mood ? " on" : ""}`}>
            <input type="radio" name="mood" value={m.mood} checked={mood === m.mood} onChange={() => setMood(m.mood)} />
            <span aria-hidden>{m.emoji}</span> {m.label}
          </label>
        ))}
      </fieldset>

      {mood === "heavy" && (
        <div className="heavy-box">
          <fieldset className="chips" aria-label="What would help?">
            <legend className="label">Sorry it&apos;s a heavy one. What would help? <span className="muted">(so friends don&apos;t have to guess)</span></legend>
            {NEEDS.map((n) => (
              <label key={n.need} className={`chip${need === n.need ? " on" : ""}`}>
                <input type="radio" name="need" value={n.need} checked={need === n.need} onChange={() => setNeed(n.need)} />
                <span aria-hidden>{n.emoji}</span> {n.label}
              </label>
            ))}
          </fieldset>
          <p className="small muted safety">
            Kindling is for friends, not emergencies. If you don&apos;t feel safe, please talk to a trusted adult or find free, confidential support at{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a>.
          </p>
        </div>
      )}

      <label className="label" htmlFor="answer">🔥 Tonight&apos;s question: <strong>{prompt}</strong></label>
      <input id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={200} placeholder="Your answer (everyone's answers appear once you add yours)" />

      <label className="label" htmlFor="note">Anything else? <span className="muted">(optional)</span></label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} placeholder="e.g. finally finished that essay" />

      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn primary" disabled={busy}>{busy ? "Adding…" : "🪵 Toss it on the fire"}</button>
        {mine && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </form>
  );
}
