"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

// Turn on notifications for this seat: sparks for you, and blankets when a friend has a heavy day.

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied" | "busy";

export default function NotifyButton({ code, memberId, token }: { code: string; memberId: string; token: string }) {
  const [state, setState] = useState<State>("loading");
  const [key, setKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const flag = `kindling:push:${code}:${memberId}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return alive && setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      const { key } = await api<{ key: string | null }>("/api/push/key").catch(() => ({ key: null }));
      if (!alive) return;
      if (!key) return setState("unsupported");
      setKey(key);
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      let on = false;
      try { on = !!sub && localStorage.getItem(flag) === "1"; } catch {}
      if (alive) setState(on ? "on" : "off");
    })();
    return () => { alive = false; };
  }, [flag]);

  const enable = async () => {
    if (!key) return;
    setState("busy");
    setFailed(false);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
      await api(`/api/circles/${code}/push`, { token, body: { subscription: sub.toJSON() } });
      try { localStorage.setItem(flag, "1"); } catch {}
      setState("on");
    } catch (e) {
      console.warn("Kindling: couldn't turn on notifications", e);
      setFailed(true);
      setState("off");
    }
  };

  const disable = async () => {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api(`/api/circles/${code}/push`, { method: "DELETE", token, body: { endpoint: sub.endpoint } }).catch(() => {});
    try { localStorage.removeItem(flag); } catch {}
    setState("off");
  };

  if (state === "loading" || state === "unsupported") return null;
  if (state === "ios-install") {
    return <p className="small muted notify-hint">🔔 On iPhone, tap <strong>Share → Add to Home Screen</strong>, then open Kindling from there to get notified when a spark lands.</p>;
  }
  if (state === "denied") return <p className="small muted notify-hint">🔕 Notifications are blocked for this site in your browser settings.</p>;
  return (
    <div className="notify">
      {state === "on" ? (
        <>
          <span className="small">🔔 You&apos;ll be notified when a spark lands or a friend needs a blanket.</span>
          <button className="link small" onClick={disable}>Turn off</button>
        </>
      ) : (
        <>
          <span className="small muted">Get a nudge when a spark lands or a friend has a heavy day.</span>
          <button className="btn small" onClick={enable} disabled={state === "busy"}>{state === "busy" ? "Turning on… (can take a few seconds)" : "🔔 Notify me"}</button>
          {failed && <span className="small error">This browser couldn&apos;t turn on notifications (private windows can&apos;t). Try a normal window.</span>}
        </>
      )}
    </div>
  );
}
