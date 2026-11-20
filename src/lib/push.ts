import "server-only";
import webpush from "web-push";
import { db } from "./db";

// Web push: a spark or a friend's heavy day reaches you even when Kindling is closed.
// Off unless VAPID keys are configured.

export const pushKey = () => process.env.VAPID_PUBLIC_KEY || null;

let configured = false;
function setup(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://kindling-chi-three.vercel.app", pub, priv);
  configured = true;
  return true;
}

export interface PushMessage { title: string; body: string; url: string; tag?: string }

export async function notifyMembers(memberIds: string[], msg: PushMessage) {
  if (!memberIds.length || !setup()) return;
  const c = await db();
  const r = await c.execute({ sql: `SELECT endpoint, p256dh, auth FROM push_subs WHERE member IN (${memberIds.map(() => "?").join(",")})`, args: memberIds });
  await Promise.all(
    r.rows.map(async (row) => {
      const endpoint = String(row.endpoint);
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh: String(row.p256dh), auth: String(row.auth) } }, JSON.stringify(msg), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // The browser threw this subscription away: forget it too.
        if (status === 404 || status === 410) await c.execute({ sql: "DELETE FROM push_subs WHERE endpoint = ?", args: [endpoint] });
      }
    }),
  );
}
