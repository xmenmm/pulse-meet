import { RoomServiceClient, TokenVerifier } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { room, callerToken } = await req.json();
    if (!room || !callerToken) {
      return NextResponse.json({ error: "Missing room or callerToken" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const verifier = new TokenVerifier(apiKey, apiSecret);
    const claim = await verifier.verify(callerToken);
    let role = "guest";
    try { role = (JSON.parse(claim.metadata || "{}").role) || "guest"; } catch {}
    if (role !== "host" || !claim.video?.roomAdmin || claim.video?.room !== room) {
      return NextResponse.json({ error: "Only host can end meeting" }, { status: 403 });
    }

    const httpHost = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpHost, apiKey, apiSecret);
    await svc.deleteRoom(room);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
