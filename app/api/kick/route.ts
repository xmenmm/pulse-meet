import { RoomServiceClient, TokenVerifier } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, target, all, callerToken } = body as {
      room?: string;
      target?: string;
      all?: boolean;
      callerToken?: string;
    };

    if (!room || !callerToken || (!target && !all)) {
      return NextResponse.json(
        { error: "Missing room, target, or callerToken" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    // Verify caller is host
    const verifier = new TokenVerifier(apiKey, apiSecret);
    const claim = await verifier.verify(callerToken);
    let callerRole = "guest";
    try {
      const meta = JSON.parse(claim.metadata || "{}");
      callerRole = meta.role || "guest";
    } catch {}

    if (callerRole !== "host" || !claim.video?.roomAdmin) {
      return NextResponse.json(
        { error: "Only host can kick participants" },
        { status: 403 }
      );
    }
    if (claim.video?.room !== room) {
      return NextResponse.json(
        { error: "Token not valid for this room" },
        { status: 403 }
      );
    }

    const host = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(host, apiKey, apiSecret);

    if (all) {
      const participants = await svc.listParticipants(room);
      const callerId = claim.sub; // caller's own identity
      const removed: string[] = [];
      for (const p of participants) {
        if (p.identity === callerId) continue; // don't kick self
        await svc.removeParticipant(room, p.identity);
        removed.push(p.identity);
      }
      return NextResponse.json({ ok: true, removed });
    }

    await svc.removeParticipant(room, target!);
    return NextResponse.json({ ok: true, removed: [target] });
  } catch (e) {
    console.error("/api/kick error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
