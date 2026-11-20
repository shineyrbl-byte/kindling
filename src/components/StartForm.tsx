"use client";
import { useState } from "react";
import Link from "next/link";
import ColorPicker from "./ColorPicker";
import { COLORS } from "@/lib/catalog";
import { api, saveSeat } from "@/lib/client";

export default function StartForm() {
  const [name, setName] = useState("");
  const [circleName, setCircleName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ code: string; memberId: string; token: string }>("/api/circles", { body: { name, circleName, color } });
      saveSeat(r.code, { memberId: r.memberId, token: r.token, name });
      location.href = `/c/${r.code}?new=1`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="center narrow">
      <Link href="/" className="brand">🔥 <span>Kindling</span></Link>
      <form className="card start-card" onSubmit={start}>
        <h1>Start a fire</h1>
        <p className="muted">For the people you don&apos;t want to drift from: your old lunch table, cousins in other cities, the team after the season ends.</p>
        <label className="label" htmlFor="circle">Name your fire</label>
        <input id="circle" value={circleName} onChange={(e) => setCircleName(e.target.value)} maxLength={24} placeholder="e.g. The Lunch Table" />
        <label className="label" htmlFor="me">Your name</label>
        <input id="me" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required placeholder="What your friends call you" />
        <ColorPicker value={color} onChange={setColor} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary wide" disabled={busy || !name.trim()}>{busy ? "Striking a match…" : "🔥 Light it"}</button>
        <p className="small muted">Next you&apos;ll get an invite link to share with your friends.</p>
      </form>
    </main>
  );
}
