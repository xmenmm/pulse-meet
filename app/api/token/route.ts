import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const name = req.nextUrl.searchParams.get("name");
  const isHost = req.nextUrl.searchParams.get("host") === "1";

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
    roomAdmin: isHost,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, isHost });
}
