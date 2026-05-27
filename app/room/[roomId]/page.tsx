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
import "@livekit/components-styles";
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
      <div className="h-screen w-screen bg-ink" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          video={choices.videoEnabled}
          audio={choices.audioEnabled}
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
