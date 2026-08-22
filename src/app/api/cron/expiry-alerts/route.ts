import { NextResponse, type NextRequest } from "next/server";
import { runExpiryAlerts } from "@/lib/alerts-run";

// This route is invoked by Vercel Cron (see vercel.json). It runs the daily
// expiry-alert dispatch across all companies whose alert is due.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Reject others.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const outcomes = await runExpiryAlerts();
    const sent = outcomes.filter((o) => o.status === "sent").length;
    return NextResponse.json({ ok: true, sent, outcomes });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
