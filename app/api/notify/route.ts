import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), ".subscriptions.json");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function readSubs() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const { title, body } = await req.json();
  const subs = readSubs();

  const results = await Promise.allSettled(
    subs.map((sub: webpush.PushSubscription) =>
      webpush.sendNotification(sub, JSON.stringify({ title, body }))
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
