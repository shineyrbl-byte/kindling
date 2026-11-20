"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import FireCanvas from "./FireCanvas";
import ColorPicker from "./ColorPicker";
import { COLORS } from "@/lib/catalog";
import { api, type SavedSeat } from "@/lib/client";

// What an invite link opens: the fire's name, who's already there, and a seat with your name on it.
export default function JoinScreen({ code, onJoined }: { code: string; onJoined: (s: SavedSeat) => void }) {
  const [peek, setPeek] = useState<{ name: string; members: { name: string; color: string }[] } | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ name: string; members: { name: string; color: string }[] }>(`/api/circles/${code}/peek`).then(setPeek).catch((e) => setError(e.message));
  }, [code]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ memberId: string; token: string }>(`/api/circles/${code}/join`, { body: { name, color } });
      onJoined({ memberId: r.memberId, token: r.token, name });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (error && !peek) {
    return (
      <main className="center narrow">
        <h1>Hmm, no fire here</h1>
        <p className="muted">{error}</p>
        <Link className="btn primary" href="/">Back home</Link>
      </main>
    );
  }

  return (
    <main className="join">
      <div className="join-fire"><FireCanvas warmth={0.6} stars={12} fireY={0.7} scale={0.8} /></div>
      <div className="card join-card">
        <p className="eyebrow">You&apos;re invited to a fire</p>
        <h1>{peek?.name ?? "…"}</h1>
        {peek && (
          <p className="muted">
            {peek.members.length === 0 ? "Be the first to pull up a seat." : <>Already here: {peek.members.map((m, i) => (
              <span key={i}><span className="name-dot" style={{ background: m.color }} />{m.name}{i < peek.members.length - 1 ? ", " : ""}</span>
            ))}</>}
          </p>
        )}
        <form onSubmit={join}>
          <label className="label" htmlFor="name">What do your friends call you?</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required autoFocus placeholder="Your name" />
          <ColorPicker value={color} onChange={setColor} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary wide" disabled={busy || !name.trim()}>{busy ? "Pulling up a seat…" : "🪵 Pull up a seat"}</button>
        </form>
        <p className="small muted">No account, no email. Your seat lives on this device.</p>
      </div>
    </main>
  );
}
