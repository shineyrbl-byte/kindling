"use client";
import { useEffect, useRef, useState } from "react";

// Campfire sound made from noise with the Web Audio API: a low rumble plus random pops.
// No audio files. It gets louder and pops more often as the fire grows. Off until you tap it.

export default function Crackle({ warmth }: { warmth: number }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const warm = useRef(warmth);
  warm.current = warmth;
  const bed = useRef<GainNode | null>(null);

  useEffect(() => {
    if (bed.current && ctxRef.current) bed.current.gain.setTargetAtTime(0.02 + 0.06 * warmth, ctxRef.current.currentTime, 0.5);
  }, [warmth]);

  useEffect(() => {
    if (!on) return;
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    ctx.resume();

    // Brown noise: the low, soft roar of the fire
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.02 + 0.06 * warm.current, ctx.currentTime, 0.6);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start();
    bed.current = g;

    // Pops: tiny bursts of filtered noise at random moments
    const popBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const pd = popBuf.getChannelData(0);
    for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / pd.length, 3);
    let timer = 0;
    const pop = () => {
      const s = ctx.createBufferSource();
      s.buffer = popBuf;
      s.playbackRate.value = 0.6 + Math.random() * 1.2;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1200 + Math.random() * 2500;
      const pg = ctx.createGain();
      pg.gain.value = (0.05 + Math.random() * 0.25) * (0.3 + warm.current);
      s.connect(hp).connect(pg).connect(ctx.destination);
      s.start();
      timer = window.setTimeout(pop, (60 + Math.random() * 500) / (0.3 + warm.current));
    };
    pop();

    return () => {
      clearTimeout(timer);
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => src.stop(), 600);
      bed.current = null;
    };
  }, [on]);

  return (
    <button className="crackle" onClick={() => setOn((v) => !v)} aria-pressed={on} aria-label={on ? "Turn fire sound off" : "Turn fire sound on"}>
      {on ? "🔊" : "🔈"} <span>{on ? "crackling" : "crackle"}</span>
    </button>
  );
}
