import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendPushNotification, PushSubscription } from "@/lib/webpush";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { title, body } = await req.json() as { title: string; body: string };

  const { env } = await getCloudflareContext({ async: true });
  const kv = (env as unknown as { PUSH_SUBS: KVNamespace }).PUSH_SUBS;

  if (!kv) return NextResponse.json({ sent: 0, error: "KV not bound" });

  const list = await kv.list();
  const subs = (
    await Promise.all(list.keys.map((k) => kv.get(k.name).then((v) => (v ? JSON.parse(v) : null))))
  ).filter(Boolean) as PushSubscription[];

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY!;
  const vapidEmail = process.env.VAPID_EMAIL!;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      sendPushNotification(sub, JSON.stringify({ title, body }), vapidPublic, vapidPrivate, vapidEmail)
    )
  );

  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length });
}
