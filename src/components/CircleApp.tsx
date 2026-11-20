"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FireCanvas, { type FireHandle } from "./FireCanvas";
import Seats, { FIRE_X, FIRE_Y, seatPos } from "./Seats";
import TonightCard from "./TonightCard";
import MemberSheet from "./MemberSheet";
import Inbox from "./Inbox";
import JoinScreen from "./JoinScreen";
import NotifyButton from "./NotifyButton";
import Crackle from "./Crackle";
import InviteQR from "./InviteQR";
import { DAY, describeFire, nightsKept, nudges, seatFor, warmth, weekRecap, type Mood, type Need, type Seat, type Spark } from "@/lib/fire";
import { needInfo, promptFor } from "@/lib/catalog";
import { api, forgetSeat, loadSeats, saveSeat, timeAgo, today as todayKey, type SavedSeat } from "@/lib/client";
import type { CircleState } from "@/lib/server";

export default function CircleApp({ code }: { code: string }) {
  const [seat, setSeat] = useState<SavedSeat | null | undefined>(undefined); // undefined = still reading storage
  const [state, setState] = useState<CircleState | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fire = useRef<FireHandle>(null);
  const inboxShownFor = useRef<string | null>(null);
  const today = todayKey();

  useEffect(() => {
    setSeat(loadSeats()[code] ?? null);
    const q = new URLSearchParams(location.search);
    if (q.get("new")) setShowInvite(true);
    const mq = window.matchMedia("(max-width: 640px)");
    const upd = () => setNarrow(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, [code]);

  const refresh = useCallback(async () => {
    if (!seat) return;
    try {
      const s = await api<CircleState>(`/api/circles/${code}?day=${todayKey()}`, { token: seat.token });
      setState(s);
      setError("");
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { forgetSeat(code); setSeat(null); }
      else setError(err.message);
    }
  }, [code, seat]);

  useEffect(() => {
    if (!seat) return;
    setState(null);
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 10_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [seat, refresh]);

  const view = useMemo(() => {
    if (!state) return null;
    const now = state.now;
    const seats = state.members.map((m) => seatFor(m, state.logs, now));
    // You sit at the front of the fire; everyone else keeps their order around it.
    const mine = seats.findIndex((s) => s.member.id === state.me);
    const ordered = mine >= 0 ? [...seats.slice(mine), ...seats.slice(0, mine)] : seats;
    return {
      now,
      seats: ordered,
      w: warmth(state.members, state.logs, state.sparks, now),
      nights: nightsKept(state.members, state.logs, today),
      quiet: nudges(seats, state.sparks, state.me, now),
      blankets: seats.filter((s) => s.blanket && s.member.id !== state.me),
      tonight: state.logs.filter((l) => l.day === today),
      myLog: state.logs.find((l) => l.day === today && l.memberId === state.me) ?? null,
      unseen: state.sparks.filter((s) => s.to === state.me && !s.seenAt),
      prompt: promptFor(code, today),
      recap: weekRecap(state.members, state.logs, state.sparks, now, today),
    };
  }, [state, today, code]);

  // Remember the fire's name on this device, for "Your fires" on the home page.
  useEffect(() => {
    if (state && seat && seat.circleName !== state.circle.name) {
      const next = { ...seat, circleName: state.circle.name };
      saveSeat(code, next);
    }
  }, [state, seat, code]);

  // Sparks that landed while you were away get a moment of their own.
  useEffect(() => {
    if (view && view.unseen.length && inboxShownFor.current !== state?.me) {
      inboxShownFor.current = state?.me ?? null;
      setInboxOpen(true);
    }
  }, [view, state?.me]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const posOf = (memberId: string) => {
    if (!view) return { x: FIRE_X, y: FIRE_Y };
    const i = view.seats.findIndex((s) => s.member.id === memberId);
    return seatPos(Math.max(0, i), view.seats.length, narrow);
  };
  const nameOf = (id: string) => state?.members.find((m) => m.id === id)?.name ?? "A friend";

  const sendSpark = async (to: string, kind: string, extra: string) => {
    await api(`/api/circles/${code}/sparks`, { token: seat!.token, body: { to, kind, extra } });
    const member = state?.members.find((m) => m.id === to);
    fire.current?.burst(posOf(to), member?.color);
    await refresh();
  };

  const submitLog = async (v: { mood: Mood; need: Need | null; note: string; answer: string }) => {
    await api(`/api/circles/${code}/logs`, { token: seat!.token, body: { ...v, day: todayKey() } });
    fire.current?.burst({ x: FIRE_X, y: FIRE_Y - 0.12 }, "#ffb347");
    flash("🪵 Your log is on the fire");
    await refresh();
  };

  const warmHands = async () => {
    setInboxOpen(false);
    fire.current?.burst(posOf(state!.me), "#ffd27a");
    await api(`/api/circles/${code}/sparks/seen`, { token: seat!.token, body: {} }).catch(() => {});
    refresh();
  };

  const switchSeat = (memberId: string) => {
    const s = seat?.demoSeats?.find((d) => d.memberId === memberId);
    if (!s || !seat) return;
    const next = { ...seat, memberId: s.memberId, token: s.token, name: s.name };
    saveSeat(code, next);
    inboxShownFor.current = null;
    setPicked(null);
    setSeat(next);
  };

  const inviteUrl = typeof window !== "undefined" ? `${location.origin}/c/${code}` : `/c/${code}`;
  const invite = async () => {
    const text = `Pull up a seat at our fire on Kindling 🔥 ${inviteUrl}`;
    if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
    await navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    flash("🔗 Invite link copied");
  };

  const leave = async () => {
    await api(`/api/circles/${code}/me`, { method: "DELETE", token: seat!.token }).catch(() => {});
    forgetSeat(code);
    location.href = "/";
  };

  if (seat === undefined) return <main className="center"><p className="muted">Finding your seat…</p></main>;
  if (seat === null) return <JoinScreen code={code} onJoined={(s) => { saveSeat(code, s); setSeat(s); setShowInvite(false); }} />;
  if (!view || !state) {
    return <main className="center">{error ? <p className="error">{error}</p> : <p className="muted">Lighting the fire…</p>}</main>;
  }

  const pickedSeat = view.seats.find((s) => s.member.id === picked);
  const { nights } = view;
  const myName = state.members.find((m) => m.id === state.me)?.name ?? "you";

  return (
    <main className="circle">
      {state.circle.demo && seat.demoSeats && (
        <div className="demo-bar">
          <span>🎪 <strong>Demo fire</strong>, your own private copy. You&apos;re sitting as <strong>{myName}</strong>.</span>
          <label>
            Try another seat:{" "}
            <select value={state.me} onChange={(e) => switchSeat(e.target.value)}>
              {seat.demoSeats.map((d) => <option key={d.memberId} value={d.memberId}>{d.name}</option>)}
            </select>
          </label>
          <Link href="/start" className="link">Start a real fire →</Link>
        </div>
      )}

      <header className="circle-head">
        <Link href="/" className="brand" aria-label="Kindling home">🔥 <span>Kindling</span></Link>
        <h1>{state.circle.name}</h1>
        <button className="btn small" onClick={() => setShowInvite((v) => !v)}>＋ Invite</button>
      </header>

      {showInvite && (
        <div className="invite card">
          <p><strong>Invite your people.</strong> Anyone with this link can pull up a seat (up to 12).</p>
          <div className="invite-body">
            <InviteQR url={inviteUrl} />
            <div className="grow">
              <div className="row">
                <code className="invite-url">{inviteUrl}</code>
                <button className="btn primary small" onClick={invite}>Share link</button>
              </div>
              <p className="small muted">Code: <strong className="code">{code}</strong></p>
              <p className="small muted">Sitting together? Friends can scan the QR code with their phone camera.</p>
            </div>
          </div>
        </div>
      )}

      <p className="fire-status" aria-live="polite">
        {describeFire(view.w)} · {nights.loggedToday} of {state.members.length} here tonight · 🌟 {nights.streak} night{nights.streak === 1 ? "" : "s"} kept
      </p>

      <div className="scene">
        <FireCanvas ref={fire} warmth={view.w} stars={nights.totalKept} fireX={FIRE_X} fireY={FIRE_Y} />
        <Crackle warmth={view.w} />
        <Seats seats={view.seats} me={state.me} today={today} narrow={narrow} onPick={(s: Seat) => setPicked(s.member.id)} />
      </div>

      <NotifyButton key={state.me} code={code} memberId={state.me} token={seat.token} />

      {view.blankets.length > 0 && (
        <div className="blankets">
          {view.blankets.map((s) => {
            const n = needInfo(s.blanket!.need);
            const done = state.sparks.some((sp) => sp.from === state.me && sp.to === s.member.id && Date.now() - sp.createdAt < 2 * DAY);
            return (
              <section key={s.member.id} className="card blanket-card">
                <h2>🧣 {s.member.name} could use a blanket</h2>
                <p>
                  Having a heavy day{n ? <> and <strong>{n.ask}</strong></> : ""}.
                  {s.lastLog?.note && <span className="quote-inline"> “{s.lastLog.note}”</span>}
                </p>
                {done ? (
                  <p className="muted">✓ You reached out. That matters.</p>
                ) : (
                  <button className="btn primary" onClick={() => (n && !n.offer.custom ? sendSpark(s.member.id, n.offer.kind, "").then(() => flash(`${n.offer.emoji} Sent to ${s.member.name}`)) : setPicked(s.member.id))}>
                    {n ? `${n.offer.emoji} ${n.offer.label}` : "🫶 Reach out"}
                  </button>
                )}
              </section>
            );
          })}

        </div>
      )}

      <div className="columns">
        <div className="col">
          <TonightCard key={state.me + (view.myLog?.id ?? "")} prompt={view.prompt} mine={view.myLog} onSubmit={submitLog} />

          <section className="card">
            <h2>Around the fire tonight</h2>
            <p className="muted small">{view.prompt}</p>
            {view.tonight.length === 0 ? (
              <p className="muted">No one&apos;s answered yet. Go first?</p>
            ) : (
              <ul className="answers">
                {view.tonight.map((l) => {
                  const m = state.members.find((x) => x.id === l.memberId)!;
                  return (
                    <li key={l.id}>
                      <span className="mini-avatar" style={{ ["--c" as string]: m.color }}>{m.name[0]}</span>
                      <div>
                        <strong>{l.memberId === state.me ? "You" : m.name}</strong>
                        {l.answer === null ? (
                          <p className="locked">🔒 Add your log to see what {m.name} said</p>
                        ) : l.answer ? <p>{l.answer}</p> : <p className="muted">checked in</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h2>Seats cooling</h2>
            {view.quiet.length === 0 ? (
              <p className="muted">Everyone&apos;s been around lately. 🔥 Nice.</p>
            ) : (
              <ul className="quiet-list">
                {view.quiet.map(({ seat: s, sparkedRecently }) => {
                  const reached = new Set(state.sparks.filter((sp) => sp.to === s.member.id && Date.now() - sp.createdAt < 2 * DAY).map((sp) => sp.from)).size;
                  return (
                    <li key={s.member.id}>
                      <span className={`mini-avatar seat-${s.status}`} style={{ ["--c" as string]: s.member.color }}>{s.member.name[0]}</span>
                      <div className="grow">
                        <strong>{s.member.name}</strong> has been quiet for {s.daysQuiet} days
                        <p className="small muted">{reached ? `${reached} friend${reached > 1 ? "s" : ""} reached out lately` : "No one has reached out yet. Be the first?"}</p>
                      </div>
                      {sparkedRecently ? <span className="small muted">✨ sent</span> : <button className="btn small" onClick={() => setPicked(s.member.id)}>Toss a spark</button>}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="small muted why-note">Quiet isn&apos;t a failure. The fire just lets the rest of you know someone might like a hand.</p>
          </section>

          <section className="card sky">
            <h2>🌟 {nights.streak} night{nights.streak === 1 ? "" : "s"} kept together</h2>
            <div className="progress" aria-label={`${nights.loggedToday} of ${nights.need} needed tonight`}>
              {Array.from({ length: nights.need }, (_, i) => <span key={i} className={i < nights.loggedToday ? "on" : ""} />)}
            </div>
            <p className="muted small">
              {nights.keptToday
                ? "Tonight is kept. A new star is in the sky ⭐"
                : `${nights.stillNeeded} more log${nights.stillNeeded === 1 ? "" : "s"} tonight keeps the streak going. It belongs to all of you, so nobody gets blamed for breaking it.`}
            </p>
            <p className="muted small">{nights.totalKept} stars in your sky so far.</p>
          </section>

          <section className="card recap">
            <h2>📜 This week at the fire</h2>
            <div className="stats">
              <div><strong>{view.recap.nights}/7</strong><span>nights kept</span></div>
              <div><strong>{view.recap.checkIns}</strong><span>check-ins</span></div>
              <div><strong>{view.recap.sparksTossed}</strong><span>sparks tossed</span></div>
            </div>
            {view.recap.comebacks.length > 0 ? (
              <ul className="comebacks">
                {view.recap.comebacks.map((c) => (
                  <li key={c.member.id + c.at}>
                    🔥 <strong>{c.member.id === state.me ? "You" : c.member.name}</strong> came back after {c.quietDays} quiet days.
                    {c.sparksWaiting > 0 && <> {c.sparksWaiting} spark{c.sparksWaiting > 1 ? "s were" : " was"} waiting.</>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No comebacks this week. When a quiet friend returns, it&apos;ll show up here.</p>
            )}
          </section>
        </div>
      </div>

      <footer className="circle-foot">
        {leaving ? (
          <span>Leave and delete everything you wrote here? <button className="link danger" onClick={leave}>Yes, leave</button> · <button className="link" onClick={() => setLeaving(false)}>Stay</button></span>
        ) : (
          <button className="link muted" onClick={() => setLeaving(true)}>Leave this fire</button>
        )}
        {state.logs.length > 0 && <span className="muted small"> · last log {timeAgo(Math.max(...state.logs.map((l) => l.createdAt)))}</span>}
      </footer>

      {pickedSeat && (
        <MemberSheet seat={pickedSeat} me={state.me} logs={state.logs} sparks={state.sparks} now={view.now} inviteUrl={inviteUrl} onClose={() => setPicked(null)} onSend={sendSpark} />
      )}
      {inboxOpen && view.unseen.length > 0 && (
        <Inbox sparks={view.unseen as Spark[]} nameOf={nameOf} colorOf={(id) => state.members.find((m) => m.id === id)?.color ?? "#fff"} onDone={warmHands} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
