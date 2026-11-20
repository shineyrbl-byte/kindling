"use client";
import { useState } from "react";
import Link from "next/link";
import FireCanvas from "./FireCanvas";
import { api, saveSeat } from "@/lib/client";

export default function Landing() {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const demo = async () => {
    setBusy(true);
    try {
      const r = await api<{ code: string; memberId: string; token: string; seats: { memberId: string; name: string; token: string }[] }>("/api/demo", { body: { tz: new Date().getTimezoneOffset() } });
      saveSeat(r.code, { memberId: r.memberId, token: r.token, name: "You", demoSeats: r.seats });
      location.href = `/c/${r.code}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/.*\/C\//, "");
    if (c) location.href = `/c/${encodeURIComponent(c)}`;
  };

  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-fire"><FireCanvas warmth={0.85} stars={28} fireY={0.78} /></div>
        <div className="hero-copy">
          <p className="brand big">🔥 Kindling</p>
          <h1>Keep your people close.</h1>
          <p className="lede">
            A tiny campfire for your friend group. One tap a night keeps it burning. When someone goes quiet, their seat
            cools down, and the fire nudges <em>everyone else</em> to reach out.
          </p>
          <div className="row center-row">
            <button className="btn primary big" onClick={demo} disabled={busy}>{busy ? "Lighting the demo…" : "✨ Try the demo fire"}</button>
            <Link className="btn big" href="/start">Start a fire for your friends</Link>
          </div>
          <form className="code-form" onSubmit={join}>
            <label htmlFor="code" className="small muted">Got an invite code?</label>
            <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. QF6VF7" maxLength={80} />
            <button className="btn small">Join</button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      <section className="why">
        <h2>Friendships rarely end. They drift.</h2>
        <p>
          You change schools, a season ends, someone moves away. Nobody decides to stop talking. Everyone just assumes someone
          else will text first. The U.S. Surgeon General found that people aged 15–24 spent <strong>70% less time with friends</strong> in
          2020 than in 2003.<sup><a href="https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf" target="_blank" rel="noreferrer">1</a></sup>{" "}
          Group chats are loud, but they don&apos;t notice who stopped talking. Kindling does.
        </p>
      </section>

      <section className="how">
        <article className="card">
          <span className="how-emoji">🪵</span>
          <h3>One tap a night</h3>
          <p>Say how today felt and answer a silly nightly question. Everyone&apos;s answers appear only once you add yours, so everyone shares before anyone scrolls.</p>
        </article>
        <article className="card">
          <span className="how-emoji">🌫️</span>
          <h3>Quiet seats cool down</h3>
          <p>No guilt trips for the quiet friend. Their seat slowly fades to an ember, and the <em>rest</em> of the circle gets a gentle nudge to reach out.</p>
        </article>
        <article className="card">
          <span className="how-emoji">✨</span>
          <h3>Sparks, no reply needed</h3>
          <p>One-tap notes like “Saved your seat” or “Thinking of you. No reply needed.” Easier than a text, and they land by your seat while you&apos;re away.</p>
        </article>
        <article className="card">
          <span className="how-emoji">🧣</span>
          <h3>Heavy days, named needs</h3>
          <p>Having a rough day? Say what would help: company, a distraction, a talk. Friends get the matching way to show up, instead of guessing.</p>
        </article>
      </section>

      <section className="principles card">
        <h2>Built to bring you closer, not keep you scrolling</h2>
        <ul>
          <li>🚫 No likes, followers, feeds or public profiles</li>
          <li>🤝 The streak belongs to the group. Nobody gets blamed for breaking it</li>
          <li>🔥 Small on purpose: 12 seats max</li>
          <li>🔒 No accounts or emails. Leave any time and your words are deleted</li>
        </ul>
      </section>

      <footer className="foot">
        Made for the CSC Winter Sparkathon ·{" "}
        <a href="https://github.com/shineyrbl-byte/kindling" target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </main>
  );
}
