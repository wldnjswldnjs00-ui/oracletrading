import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), ".subscriptions.json");

function readSubs(): PushSubscription[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeSubs(subs: object[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(subs, null, 2));
}

export async function POST(req: NextRequest) {
  const sub = await req.json();
  const subs = readSubs();
  const endpoint = (sub as { endpoint: string }).endpoint;
  const exists = subs.some((s) => (s as unknown as { endpoint: string }).endpoint === endpoint);
  if (!exists) {
    subs.push(sub);
    writeSubs(subs);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(readSubs());
}
