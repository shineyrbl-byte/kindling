"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

// A particle campfire drawn on canvas. Its size follows the circle's warmth,
// and every night the circle kept the fire lit is a star in the sky.

export interface FireHandle {
  /** Send a stream of sparks from the fire to a point (fractions of width/height). */
  burst(to: { x: number; y: number }, color?: string): void;
}

interface Props {
  warmth: number; // 0..1
  stars: number; // nights kept
  fireX?: number; // fire position as fractions of the canvas
  fireY?: number;
  scale?: number; // overall size multiplier
  ref?: Ref<FireHandle>;
}

interface P { x: number; y: number; vx: number; vy: number; life: number; decay: number; r: number }
interface Flight { sx: number; sy: number; cx: number; cy: number; tx: number; ty: number; t: number; speed: number; color: string }

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export default function FireCanvas({ warmth, stars, fireX = 0.5, fireY = 0.62, scale = 1, ref }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ warmth, stars, fireX, fireY, scale });
  live.current = { warmth, stars, fireX, fireY, scale };
  const flights = useRef<Flight[]>([]);
  const flashes = useRef<{ x: number; y: number; t: number; color: string }[]>([]);

  useImperativeHandle(ref, () => ({
    burst(to, color = "#ffd27a") {
      const el = canvas.current;
      if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      const { fireX, fireY } = live.current;
      const sx = fireX * w, sy = fireY * h - 30;
      const tx = to.x * w, ty = to.y * h;
      for (let i = 0; i < 26; i++) {
        flights.current.push({
          sx: sx + (Math.random() - 0.5) * 16, sy: sy + (Math.random() - 0.5) * 10,
          cx: (sx + tx) / 2 + (Math.random() - 0.5) * 120, cy: Math.min(sy, ty) - 60 - Math.random() * 90,
          tx: tx + (Math.random() - 0.5) * 14, ty: ty + (Math.random() - 0.5) * 14,
          t: -i * 0.025, speed: 0.016 + Math.random() * 0.01, color,
        });
      }
    },
  }));

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, W = 0, H = 0, frame = 0;
    const flames: P[] = [];
    const embers: P[] = [];
    let shown = live.current.warmth; // eased so the fire grows and shrinks smoothly

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = el.clientWidth; H = el.clientHeight;
      el.width = W * dpr; el.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const draw = () => {
      frame++;
      const L = live.current;
      shown += (L.warmth - shown) * 0.03;
      const w = shown, k = L.scale * Math.min(1.2, Math.max(0.6, W / 700));
      const cx = L.fireX * W, base = L.fireY * H;
      ctx.clearRect(0, 0, W, H);

      // Stars: faint background ones, then one bright star per night kept
      const rnd = seeded(7);
      for (let i = 0; i < 60; i++) {
        const x = rnd() * W, y = rnd() * H * 0.5, a = 0.12 + rnd() * 0.18;
        ctx.fillStyle = `rgba(220,215,255,${a})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      const rs = seeded(42);
      for (let i = 0; i < Math.min(L.stars, 90); i++) {
        const x = rs() * W, y = 8 + rs() * H * 0.42, ph = rs() * 6.28;
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(frame * 0.03 + ph);
        ctx.fillStyle = `rgba(255,236,190,${tw})`;
        ctx.beginPath(); ctx.arc(x, y, 1.6 + rs() * 1.2, 0, 6.28); ctx.fill();
        ctx.fillStyle = `rgba(255,220,150,${tw * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.28); ctx.fill();
      }

      // Light on the ground
      const glowR = (120 + 260 * w) * k;
      const flicker = reduced ? 1 : 0.92 + Math.random() * 0.08;
      const g = ctx.createRadialGradient(cx, base, 0, cx, base, glowR);
      g.addColorStop(0, `rgba(255,150,60,${(0.18 + 0.32 * w) * flicker})`);
      g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, base, glowR, glowR * 0.45, 0, 0, 6.28); ctx.fill();

      // Logs
      ctx.lineCap = "round";
      ctx.lineWidth = 11 * k;
      for (const [a, col] of [[0.32, "#4a2c1d"], [-0.32, "#5a3522"]] as const) {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * 46 * k, base + Math.sin(a) * 10 * k + 4);
        ctx.lineTo(cx + Math.cos(a) * 46 * k, base - Math.sin(a) * 10 * k + 4);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,90,30,${0.35 + 0.4 * w})`;
      ctx.beginPath(); ctx.ellipse(cx, base + 2, 26 * k, 6 * k, 0, 0, 6.28); ctx.fill();

      // Flames: many soft, low-alpha puffs. Additive blending makes the overlapping core hot
      // and the edges orange-red; pulling puffs towards the middle as they rise gives tongues.
      const spawn = (reduced ? 1.5 : 3) * (1 + 5 * w);
      for (let i = 0; i < spawn && flames.length < 520; i++) {
        const spread = (10 + 22 * w) * k;
        flames.push({
          x: cx + (Math.random() + Math.random() - 1) * spread, y: base - 4,
          vx: (Math.random() - 0.5) * 0.5, vy: -(0.8 + Math.random() * (1 + 1.9 * w)) * k,
          life: 1, decay: 0.016 + Math.random() * 0.02, r: (8 + 15 * w) * k,
        });
      }
      ctx.globalCompositeOperation = "lighter";
      const sway = reduced ? 0 : Math.sin(frame * 0.045) * 0.06;
      for (let i = flames.length - 1; i >= 0; i--) {
        const p = flames[i];
        p.vx += (cx - p.x) * 0.006 + sway; p.vx *= 0.96; p.x += p.vx; p.y += p.vy; p.vy *= 0.995; p.life -= p.decay;
        if (p.life <= 0) { flames.splice(i, 1); continue; }
        const r = p.r * (0.3 + p.life * 0.9);
        const [cr, cg, cb] = p.life > 0.82 ? [255, 214, 140] : p.life > 0.55 ? [255, 140, 40] : p.life > 0.3 ? [235, 80, 25] : [150, 40, 30];
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.2 * p.life + 0.04})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.fill();
      }

      // Embers drifting up
      if (!reduced && Math.random() < 0.08 + 0.4 * w) {
        embers.push({ x: cx + (Math.random() - 0.5) * 30 * k, y: base - 20, vx: (Math.random() - 0.5) * 0.6, vy: -(0.6 + Math.random() * 1.4), life: 1, decay: 0.004 + Math.random() * 0.006, r: 1 + Math.random() * 1.4 });
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i];
        p.x += p.vx + Math.sin((frame + i * 13) * 0.05) * 0.4; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0 || p.y < 0) { embers.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(255,${150 + 80 * p.life},80,${p.life})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      }

      // Sparks flying to a friend's seat
      for (let i = flights.current.length - 1; i >= 0; i--) {
        const f = flights.current[i];
        f.t += f.speed;
        if (f.t < 0) continue;
        if (f.t >= 1) {
          flights.current.splice(i, 1);
          if (Math.random() < 0.3) flashes.current.push({ x: f.tx, y: f.ty, t: 1, color: f.color });
          continue;
        }
        const t = f.t, u = 1 - t;
        const x = u * u * f.sx + 2 * u * t * f.cx + t * t * f.tx;
        const y = u * u * f.sy + 2 * u * t * f.cy + t * t * f.ty;
        const sg = ctx.createRadialGradient(x, y, 0, x, y, 9);
        sg.addColorStop(0, "rgba(255,255,230,0.95)");
        sg.addColorStop(0.3, f.color);
        sg.addColorStop(1, "rgba(255,180,80,0)");
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.fill();
      }
      for (let i = flashes.current.length - 1; i >= 0; i--) {
        const fl = flashes.current[i];
        fl.t -= 0.03;
        if (fl.t <= 0) { flashes.current.splice(i, 1); continue; }
        const r = 40 * (1 - fl.t) + 10;
        const fg = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, r);
        fg.addColorStop(0, `rgba(255,230,160,${0.5 * fl.t})`);
        fg.addColorStop(1, "rgba(255,200,120,0)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fl.x, fl.y, r, 0, 6.28); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvas} className="fire-canvas" aria-hidden="true" />;
}
