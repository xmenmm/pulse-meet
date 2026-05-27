"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  LocalUserChoices,
  formatChatMessageLinks,
} from "@livekit/components-react";
import {
  VideoPresets,
  RoomOptions,
} from "livekit-client";
import "@livekit/components-styles";

// Optimisasi bandwidth untuk room rame (10-50 orang)
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,       // auto turunin quality saat tile kecil
  dynacast: true,             // server stop forward layer yg ga dilihat
  publishDefaults: {
    videoSimulcastLayers: [
      VideoPresets.h180,      // 180p untuk gallery view (banyak orang)
      VideoPresets.h360,      // 360p untuk middle
      VideoPresets.h720,      // 720p untuk speaker view
    ],
    videoCodec: "vp9",
    dtx: true,                // discontinuous transmission audio (hemat)
    red: true,                // audio redundancy
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
};
import { ArrowLeft, Copy, Check } from "lucide-react";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [token, setToken] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedName, setSavedName] = useState("");

  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    const n = localStorage.getItem("pulse-name");
    if (n) setSavedName(n);
  }, []);

  async function joinRoom(c: LocalUserChoices) {
    try {
      const res = await fetch(
        `/api/token?room=${encodeURIComponent(roomId)}&name=${encodeURIComponent(
          c.username
        )}`
      );
      if (!res.ok) throw new Error("Failed to get token");
      const data = await res.json();
      setChoices(c);
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // --------- ERROR STATE ---------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-white p-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-white/70 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-5 py-2 rounded-full"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // --------- IN-CALL ---------
  if (token && choices && wsUrl) {
    return (
      <div className="relative h-screen w-screen" data-lk-theme="default">
        {/* Branding overlay top-left */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full pl-2 pr-4 py-1.5 text-white">
          <span className="w-7 h-7 rounded-md bg-brand-grad flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 64 64" fill="none">
              <path
                d="M12 32 L22 32 L26 22 L34 44 L40 28 L46 36 L52 32"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-semibold">Pulse</span>
          <span className="text-white/40">·</span>
          <span className="text-xs text-white/70 font-mono">{roomId}</span>
        </div>

        {/* Copy link overlay top-right */}
        <button
          onClick={copyLink}
          className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-white text-xs hover:bg-white/20 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              Link copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy invite link
            </>
          )}
        </button>

        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          video={choices.videoEnabled}
          audio={choices.audioEnabled}
          options={ROOM_OPTIONS}
          onDisconnected={() => router.push("/")}
        >
          <VideoConference chatMessageFormatter={formatChatMessageLinks} />
        </LiveKitRoom>
      </div>
    );
  }

  // --------- LOBBY (PRE-JOIN) ---------
  return (
    <div className="min-h-screen bg-soft-grad flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={copyLink}
          className="flex items-center gap-2 bg-white border border-line rounded-full px-4 py-1.5 text-sm shadow-soft hover:shadow-card transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Link copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-muted" />
              Copy invite link
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="text-center mb-6">
          <p className="text-sm text-muted">Room</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            {roomId}
          </h1>
        </div>

        <div className="bg-white rounded-3xl border border-line shadow-card p-6 w-full max-w-2xl">
          <PreJoin
            key={savedName}
            defaults={{
              username: savedName,
              videoEnabled: true,
              audioEnabled: true,
            }}
            onSubmit={(c) => {
              if (c.username && c.username !== savedName) {
                localStorage.setItem("pulse-name", c.username);
              }
              joinRoom(c);
            }}
            joinLabel="Join meeting"
          />
        </div>

        <p className="mt-6 text-xs text-muted text-center max-w-md">
          Share the invite link above with anyone you want in the call. They can
          join with one click — no account needed.
        </p>
      </div>
    </div>
  );
}
