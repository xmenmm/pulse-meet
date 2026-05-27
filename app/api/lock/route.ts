import { RoomServiceClient, TokenVerifier } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Toggle room lock. Locked rooms reject new joiners (checked in /api/token).
// Lock state stored in room metadata as {"locked": true}.
export async function POST(req: NextRequest) {
  try {
    const { room, locked, callerToken } = await req.json();
    if (!room || !callerToken || typeof locked !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
      return NextResponse.json({ error: "Only host can lock" }, { status: 403 });
    }

    const httpHost = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
    const svc = new RoomServiceClient(httpHost, apiKey, apiSecret);
    // Merge with existing metadata
    let existingMeta = {} as Record<string, unknown>;
    try {
      const rooms = await svc.listRooms([room]);
      const r = rooms[0];
      if (r?.metadata) existingMeta = JSON.parse(r.metadata);
    } catch {}
    const next = { ...existingMeta, locked };
    await svc.updateRoomMetadata(room, JSON.stringify(next));
    return NextResponse.json({ ok: true, locked });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
