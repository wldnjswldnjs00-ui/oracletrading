import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const sub = await req.json() as { endpoint: string };
  const { env } = await getCloudflareContext({ async: true });
  const kv = (env as unknown as { PUSH_SUBS: KVNamespace }).PUSH_SUBS;

  if (kv) {
    const key = encodeURIComponent(sub.endpoint).slice(0, 512);
    await kv.put(key, JSON.stringify(sub));
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const kv = (env as unknown as { PUSH_SUBS: KVNamespace }).PUSH_SUBS;

  if (!kv) return NextResponse.json([]);

  const list = await kv.list();
  const subs = await Promise.all(
    list.keys.map((k) => kv.get(k.name).then((v) => v ? JSON.parse(v) : null))
  );
  return NextResponse.json(subs.filter(Boolean));
}
