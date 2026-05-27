import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const name = req.nextUrl.searchParams.get("name");

  if (!room || !name) {
    return NextResponse.json(
      { error: "Missing room or name" },
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

  // === Host determined by server: FIRST joiner becomes host ===
  // Also check if room is locked (host explicitly locked it).
  let isHost = false;
  try {
    const httpHost = wsUrl
      .replace("wss://", "https://")
      .replace("ws://", "http://");
    const svc = new RoomServiceClient(httpHost, apiKey, apiSecret);

    // Check lock state
    try {
      const rooms = await svc.listRooms([room]);
      const r = rooms[0];
      if (r?.metadata) {
        const meta = JSON.parse(r.metadata);
        if (meta.locked) {
          // Check if this is the host trying to rejoin (allowed)
          const participants = await svc.listParticipants(room);
          const isExistingHost = participants.some(
            (p) =>
              p.name === name &&
              (() => {
                try {
                  return JSON.parse(p.metadata || "{}").role === "host";
                } catch {
                  return false;
                }
              })()
          );
          if (!isExistingHost) {
            return NextResponse.json(
              { error: "This meeting is locked by the host" },
              { status: 403 }
            );
          }
        }
      }
    } catch {
      // room doesn't exist or no metadata; continue
    }

    const participants = await svc.listParticipants(room);
    const hasExistingHost = participants.some((p) => {
      try {
        const meta = JSON.parse(p.metadata || "{}");
        return meta.role === "host";
      } catch {
        return false;
      }
    });
    isHost = !hasExistingHost;
  } catch {
    isHost = true;
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `${name}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    ttl: "2h",
    metadata: JSON.stringify({ role: isHost ? "host" : "guest" }),
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    roomAdmin: isHost,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, isHost });
}
