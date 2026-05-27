"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  LocalUserChoices,
  formatChatMessageLinks,
  useLocalParticipant,
  useDataChannel,
  useParticipants,
} from "@livekit/components-react";
import {
  VideoPresets,
  RoomOptions,
  Participant,
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
import {
  ArrowLeft,
  Copy,
  Check,
  Camera,
  Trash2,
  Pin,
  UserX,
  Hand,
  Users,
  Lock,
  Unlock,
  MicOff,
  PhoneOff,
  MoreVertical,
  Shield,
  Clock,
  Sparkles,
  Captions,
} from "lucide-react";
import { Track } from "livekit-client";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [token, setToken] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [liveName, setLiveName] = useState("");
  const [colorIdx, setColorIdx] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Server is the source of truth for host status (set after /api/token call)
  const [isHost, setIsHost] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    const n = localStorage.getItem("pulse-name");
    if (n) {
      setSavedName(n);
      setLiveName(n);
    }
    const c = localStorage.getItem("pulse-avatar-color");
    if (c !== null) {
      const idx = parseInt(c, 10);
      setColorIdx(isNaN(idx) ? null : idx);
    }
    const p = localStorage.getItem("pulse-avatar-photo");
    if (p) setPhoto(p);
  }, []);

  async function uploadPhoto(file: File) {
    // 192px @ q=0.75 → ~4-8KB base64, fits easily in data channel
    const dataUrl = await resizeImageToDataURL(file, 192);
    localStorage.setItem("pulse-avatar-photo", dataUrl);
    setPhoto(dataUrl);
  }

  function removePhoto() {
    localStorage.removeItem("pulse-avatar-photo");
    setPhoto(null);
  }

  // Watch PreJoin's name input so avatar updates as user types
  useEffect(() => {
    if (token) return; // not in lobby anymore
    const interval = setInterval(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.lk-prejoin input[type="text"]'
      );
      if (input && input.value !== liveName) {
        setLiveName(input.value);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [token, liveName]);

  function pickColor(idx: number | null) {
    setColorIdx(idx);
    if (idx === null) localStorage.removeItem("pulse-avatar-color");
    else localStorage.setItem("pulse-avatar-color", String(idx));
  }

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
      // Server determines host: first joiner = host, rest = guest
      setIsHost(!!data.isHost);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  function copyLink() {
    // Strip ?host=1 so invited guests don't accidentally become host.
    // Host status is only granted to the user who clicked "Start a meeting".
    const cleanUrl =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : "";
    navigator.clipboard.writeText(cleanUrl);
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
      <InCallView
        token={token}
        choices={choices}
        wsUrl={wsUrl}
        roomId={roomId}
        isHost={isHost}
        copyLink={copyLink}
        copied={copied}
        router={router}
      />
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

        {/* Avatar preview + color picker + photo upload */}
        <LobbyAvatarCard
          name={liveName || savedName}
          colorIdx={colorIdx}
          onPickColor={pickColor}
          photo={photo}
          onUploadPhoto={uploadPhoto}
          onRemovePhoto={removePhoto}
        />

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

/* ---------- Lobby avatar card with color picker ---------- */

function LobbyAvatarCard({
  name,
  colorIdx,
  onPickColor,
  photo,
  onUploadPhoto,
  onRemovePhoto,
}: {
  name: string;
  colorIdx: number | null;
  onPickColor: (idx: number | null) => void;
  photo: string | null;
  onUploadPhoto: (file: File) => void;
  onRemovePhoto: () => void;
}) {
  const cleaned = (name || "").trim();
  const initial = cleaned ? cleaned[0].toUpperCase() : "?";
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveIdx =
    colorIdx ?? hashIndex(cleaned || "guest", AVATAR_PALETTES.length);
  const [c1, c2] = AVATAR_PALETTES[effectiveIdx];
  const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;

  return (
    <div className="w-full max-w-2xl mb-4 bg-white rounded-3xl border border-line shadow-card p-5 flex items-center gap-5">
      {/* Avatar with hover-to-upload */}
      <div className="relative shrink-0 group">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Avatar"
            className="w-20 h-20 rounded-2xl object-cover shadow-soft"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-semibold shadow-soft"
            style={{ background: grad }}
          >
            {initial}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
          aria-label="Upload photo"
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadPhoto(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Right side */}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted font-medium">
          Your avatar
        </p>
        <p className="mt-0.5 text-base font-semibold text-ink truncate">
          {cleaned || "Set your name below"}
        </p>

        {/* Photo controls or color picker */}
        {photo ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-full bg-panel hover:bg-line text-ink transition flex items-center gap-1.5"
            >
              <Camera className="w-3 h-3" />
              Change photo
            </button>
            <button
              onClick={onRemovePhoto}
              className="text-xs px-3 py-1.5 rounded-full text-rose-500 hover:bg-rose-50 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {AVATAR_PALETTES.map((p, i) => {
              const active = colorIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => onPickColor(i)}
                  style={{
                    background: `linear-gradient(135deg, ${p[0]}, ${p[1]})`,
                  }}
                  className={
                    "w-6 h-6 rounded-full transition-transform " +
                    (active
                      ? "ring-2 ring-ink ring-offset-2 scale-110"
                      : "hover:scale-110")
                  }
                  aria-label={`Color ${i + 1}`}
                />
              );
            })}
            <button
              onClick={() => onPickColor(null)}
              className={
                "ml-1 text-xs px-2.5 py-1 rounded-full transition " +
                (colorIdx === null
                  ? "bg-ink text-white"
                  : "bg-panel text-muted hover:text-ink")
              }
            >
              Auto
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="ml-2 text-xs px-2.5 py-1 rounded-full bg-ink text-white hover:bg-brand-700 transition flex items-center gap-1.5"
            >
              <Camera className="w-3 h-3" />
              Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Resize uploaded image to a max dimension (keeps aspect ratio) and return data URL
function resizeImageToDataURL(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;
      const scale = Math.min(1, max / Math.max(w, h));
      const cw = Math.round(w * scale),
        ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % mod;
  return h;
}

/* ---------- Per-participant unique avatar color + initial ---------- */

const AVATAR_PALETTES = [
  ["#f43f5e", "#ec4899"], // rose
  ["#f59e0b", "#f97316"], // amber
  ["#10b981", "#0d9488"], // emerald
  ["#3b82f6", "#6366f1"], // blue-indigo
  ["#7c4dff", "#5a25d8"], // purple
  ["#ec4899", "#a855f7"], // pink-violet
  ["#06b6d4", "#0ea5e9"], // cyan-sky
  ["#84cc16", "#22c55e"], // lime-green
];

function paletteForName(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_PALETTES.length;
  }
  return AVATAR_PALETTES[h] as [string, string];
}

function cleanName(raw: string): string {
  // Token identity-nya format "Bintang-abc123" → potong suffix random
  const dash = raw.lastIndexOf("-");
  if (dash > 0 && /^[a-z0-9]{4,8}$/i.test(raw.slice(dash + 1))) {
    return raw.slice(0, dash);
  }
  return raw;
}

function AvatarStyler() {
  // Just runs a polling loop that injects the initial letter into each
  // placeholder. Background color comes from CSS nth-child rules in globals.css.
  useEffect(() => {
    const apply = () => {
      document
        .querySelectorAll<HTMLElement>(".lk-participant-placeholder")
        .forEach((placeholder) => {
          // Walk up to the participant tile (skip self — closest() includes self
          // and placeholder's own class would match [class*='lk-participant'])
          const tile =
            placeholder.parentElement?.closest<HTMLElement>(
              ".lk-participant-tile"
            ) ||
            placeholder.closest<HTMLElement>(".lk-participant-tile");
          if (!tile) return;

          // Try several name text locations
          let nameText = "";
          for (const sel of [
            ".lk-participant-name",
            "[class*='participant-name']",
            ".lk-participant-metadata",
          ]) {
            const el = tile.querySelector(sel);
            const t = el?.textContent?.trim();
            if (t) {
              nameText = t;
              break;
            }
          }

          // The label sometimes contains mic icon + name. Take last word/non-space.
          const cleaned = cleanName(nameText)
            .replace(/^\s+|\s+$/g, "")
            .replace(/^[^\w\d]+/, ""); // strip leading icons/symbols
          const initial =
            cleaned.length > 0 ? cleaned[0].toUpperCase() : "?";

          // Inject or update initial element
          let initialEl = placeholder.querySelector<HTMLElement>(
            ".pulse-initial"
          );
          if (!initialEl) {
            initialEl = document.createElement("div");
            initialEl.className = "pulse-initial";
            placeholder.appendChild(initialEl);
          }
          if (initialEl.textContent !== initial) {
            initialEl.textContent = initial;
          }
        });
    };

    // Apply immediately + poll every 600ms (catches all re-renders reliably)
    apply();
    const id = window.setInterval(apply, 600);
    return () => window.clearInterval(id);
  }, []);

  return null;
}

/* ---------- Emoji Reactions ---------- */

const EMOJIS = ["👍", "❤️", "😂", "🎉", "👏", "🔥", "😮", "🙌", "💯", "🤔"];

type Floater = {
  id: number;
  emoji: string;
  senderName: string;
  x: number; // horizontal offset percentage
  drift: number; // sideways drift
  duration: number; // ms
};

function ReactionsLayer() {
  const { localParticipant } = useLocalParticipant();
  const [floats, setFloats] = useState<Floater[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { send, message } = useDataChannel("pulse-reactions");

  // Receive incoming reactions
  useEffect(() => {
    if (!message) return;
    try {
      const text = new TextDecoder().decode(message.payload);
      const data = JSON.parse(text);
      const senderName =
        cleanName(message.from?.name || message.from?.identity || "Someone");
      addFloat(data.emoji, senderName);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  function addFloat(emoji: string, senderName: string) {
    const id = Date.now() + Math.random();
    const x = 35 + Math.random() * 30; // 35-65% from left
    const drift = (Math.random() - 0.5) * 60; // -30 to +30 px sideways
    const duration = 2800 + Math.random() * 800;
    setFloats((prev) => [...prev, { id, emoji, senderName, x, drift, duration }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, duration);
  }

  function sendReaction(emoji: string) {
    const myName = cleanName(
      localParticipant?.name || localParticipant?.identity || "You"
    );
    addFloat(emoji, myName);
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ emoji }));
      send(payload, { reliable: true });
    } catch (e) {
      console.error("Failed to send reaction", e);
    }
    // keep picker open for multiple reactions
  }

  return (
    <>
      {/* Floating emoji layer (absolute, on top of everything in call) */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floats.map((f) => (
          <div
            key={f.id}
            className="absolute bottom-24 flex flex-col items-center"
            style={
              {
                left: `${f.x}%`,
                animation: `pulse-float ${f.duration}ms ease-out forwards`,
                "--drift": `${f.drift}px`,
              } as React.CSSProperties
            }
          >
            <span className="text-5xl drop-shadow-lg">{f.emoji}</span>
            <span className="mt-1 text-xs text-white/90 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 whitespace-nowrap">
              {f.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Picker button bottom-center */}
      <div
        ref={pickerRef}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center"
      >
        {pickerOpen && (
          <div className="mb-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl px-2 py-2 flex gap-1 shadow-card animate-[fadeUp_0.2s_ease-out]">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                className="text-2xl w-10 h-10 rounded-xl hover:bg-white/15 hover:scale-110 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className={
            "w-11 h-11 rounded-full flex items-center justify-center text-xl backdrop-blur-md border border-white/15 transition shadow-soft " +
            (pickerOpen
              ? "bg-brand-grad text-white"
              : "bg-white/10 hover:bg-white/20 text-white")
          }
          aria-label="Send a reaction"
        >
          😊
        </button>
      </div>
    </>
  );
}

/* ---------- In-call controls: own photo + pin + kick ---------- */

function InCallControls({
  token,
  room,
  isHost,
  onRemotePhotosChange,
}: {
  token: string;
  room: string;
  isHost: boolean;
  onRemotePhotosChange?: (m: Map<string, string>) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [kickBusy, setKickBusy] = useState<string | null>(null);
  // identity -> photo data URL (received via data channel)
  const [remotePhotos, setRemotePhotos] = useState<Map<string, string>>(
    new Map()
  );
  const prevCountRef = useRef(0);
  const { send, message } = useDataChannel("pulse-photo");

  const localIdentity = localParticipant?.identity ?? "";

  // Broadcast my photo when (a) I join, or (b) someone new joins
  useEffect(() => {
    const myPhoto =
      typeof window !== "undefined"
        ? localStorage.getItem("pulse-avatar-photo")
        : null;
    const count = participants.length;
    const isFirstSend = prevCountRef.current === 0 && count >= 1;
    const someoneNewJoined = count > prevCountRef.current;
    if (myPhoto && (isFirstSend || someoneNewJoined)) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: "photo", data: myPhoto })
        );
        send(payload, { reliable: true });
      } catch (e) {
        console.error("Photo broadcast failed", e);
      }
    }
    prevCountRef.current = count;
  }, [participants.length, send]);

  // Receive photos from others
  useEffect(() => {
    if (!message) return;
    try {
      const text = new TextDecoder().decode(message.payload);
      const data = JSON.parse(text);
      if (data?.type === "photo" && data?.data && message.from?.identity) {
        const fromId = message.from.identity;
        const url = data.data as string;
        setRemotePhotos((prev) => {
          if (prev.get(fromId) === url) return prev;
          const next = new Map(prev);
          next.set(fromId, url);
          return next;
        });
      }
    } catch {}
  }, [message]);

  // Bubble remote photos up to parent (for participants panel)
  useEffect(() => {
    onRemotePhotosChange?.(remotePhotos);
  }, [remotePhotos, onRemotePhotosChange]);

  // Inject overlays (photo, pin/kick buttons) per tile
  useEffect(() => {
    const myPhoto =
      typeof window !== "undefined"
        ? localStorage.getItem("pulse-avatar-photo")
        : null;

    // Build name → identity lookup
    const nameToIdentity = new Map<string, string>();
    (participants as Participant[]).forEach((p) => {
      const cn = cleanName(p.name || p.identity).trim();
      if (cn) nameToIdentity.set(cn, p.identity);
    });

    const apply = () => {
      document
        .querySelectorAll<HTMLElement>(".lk-participant-tile")
        .forEach((tile) => {
          const isLocal =
            tile.getAttribute("data-lk-local-participant") === "true" ||
            tile.hasAttribute("data-lk-local-participant");

          // Identity: try DOM attribute, fallback to name match
          let identity =
            tile.getAttribute("data-lk-participant-identity") ||
            tile.querySelector("[data-lk-participant-identity]")?.getAttribute(
              "data-lk-participant-identity"
            ) ||
            "";
          if (!identity) {
            const nameText =
              tile.querySelector(".lk-participant-name")?.textContent ?? "";
            const cn = cleanName(nameText.trim())
              .replace(/^[^\w\d]+/, "")
              .trim();
            identity = nameToIdentity.get(cn) || "";
          }
          if (!identity && isLocal && localIdentity) identity = localIdentity;

          // ---- Photo on inner circle ----
          const initialEl = tile.querySelector<HTMLElement>(".pulse-initial");
          if (initialEl) {
            const photoUrl =
              isLocal && myPhoto
                ? myPhoto
                : identity
                ? remotePhotos.get(identity)
                : undefined;
            if (photoUrl) {
              if (initialEl.style.backgroundImage !== `url("${photoUrl}")`) {
                initialEl.style.backgroundImage = `url(${photoUrl})`;
                initialEl.classList.add("has-photo");
              }
            }
          }

          // ---- Pin/Kick toolbar ----
          let toolbar = tile.querySelector<HTMLElement>(".pulse-toolbar");
          if (!toolbar) {
            toolbar = document.createElement("div");
            toolbar.className = "pulse-toolbar";
            tile.style.position = tile.style.position || "relative";
            tile.appendChild(toolbar);
          }

          // Pinned marker
          if (pinnedId && identity === pinnedId) {
            tile.setAttribute("data-pulse-pinned", "true");
          } else {
            tile.removeAttribute("data-pulse-pinned");
          }

          const pinned = pinnedId === identity;
          toolbar.innerHTML = `
            <button class="pulse-tool-btn" data-action="pin" title="${pinned ? "Unpin" : "Pin to top"}">
              ${pinned ? "📌" : "📍"}
            </button>
            ${
              isHost && !isLocal
                ? `<button class="pulse-tool-btn pulse-tool-kick" data-action="kick" title="Kick from meeting">✖</button>`
                : ""
            }
          `;

          toolbar
            .querySelectorAll<HTMLButtonElement>("button")
            .forEach((btn) => {
              btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.getAttribute("data-action");
                if (action === "pin") {
                  if (!identity) return;
                  setPinnedId((prev) => (prev === identity ? null : identity));
                } else if (action === "kick" && identity) {
                  doKick(identity);
                }
              };
            });
        });
    };

    async function doKick(targetId: string) {
      if (!confirm("Kick this participant from the meeting?")) return;
      setKickBusy(targetId);
      try {
        const res = await fetch("/api/kick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            target: targetId,
            callerToken: token,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert("Failed to kick: " + (err.error || res.statusText));
        }
      } catch (e) {
        alert("Network error: " + (e instanceof Error ? e.message : "unknown"));
      } finally {
        setKickBusy(null);
      }
    }

    apply();
    const id = window.setInterval(apply, 600);
    return () => window.clearInterval(id);
  }, [token, room, isHost, pinnedId, localIdentity]);

  // Set pin state on body so CSS can target
  useEffect(() => {
    if (pinnedId) document.body.setAttribute("data-pulse-pinned", "true");
    else document.body.removeAttribute("data-pulse-pinned");
    return () => document.body.removeAttribute("data-pulse-pinned");
  }, [pinnedId]);

  return (
    <>
      {/* Unpin button shown when something is pinned */}
      {pinnedId && (
        <button
          onClick={() => setPinnedId(null)}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs rounded-full px-3 py-1.5 hover:bg-white/20 transition flex items-center gap-2"
        >
          <Pin className="w-3 h-3" />
          Unpin
        </button>
      )}
      {/* Host-only "Kick all" button */}
      {isHost && (
        <KickAllButton token={token} room={room} busy={!!kickBusy} />
      )}
    </>
  );
}

function KickAllButton({
  token,
  room,
  busy,
}: {
  token: string;
  room: string;
  busy: boolean;
}) {
  const [loading, setLoading] = useState(false);
  async function kickAll() {
    if (
      !confirm(
        "Remove EVERYONE except you from the meeting? This cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch("/api/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, all: true, callerToken: token }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert("Failed: " + (e.error || res.statusText));
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={kickAll}
      disabled={loading || busy}
      className="hidden bg-rose-500/90 hover:bg-rose-500 disabled:opacity-50 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-md flex items-center gap-1.5 transition"
    >
      <UserX className="w-3 h-3" />
      {loading ? "Removing..." : "Kick all (host)"}
    </button>
  );
}

/* ---------- Full in-call view (lifted out so we can use LiveKit hooks at top level) ---------- */

function InCallView({
  token,
  choices,
  wsUrl,
  roomId,
  isHost,
  copyLink,
  copied,
  router,
}: {
  token: string;
  choices: LocalUserChoices;
  wsUrl: string;
  roomId: string;
  isHost: boolean;
  copyLink: () => void;
  copied: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [remotePhotos, setRemotePhotos] = useState<Map<string, string>>(
    new Map()
  );

  const myPhoto =
    typeof window !== "undefined"
      ? localStorage.getItem("pulse-avatar-photo")
      : null;

  return (
    <div className="relative h-screen w-screen" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={choices.videoEnabled}
        audio={choices.audioEnabled}
        options={ROOM_OPTIONS}
        onDisconnected={() => router.push("/")}
      >
        {/* === TOP BAR (inside LiveKitRoom so its children can use LK hooks) === */}
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

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5">
          <MeetingTimer />
          {isHost && (
            <>
              <span className="w-px h-4 bg-white/15" />
              <HostMenu token={token} room={roomId} router={router} />
            </>
          )}
        </div>

        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-white text-xs hover:bg-white/20 transition"
          >
            <Users className="w-3.5 h-3.5" />
            People
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-white text-xs hover:bg-white/20 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Invite
              </>
            )}
          </button>
        </div>

        <VideoConference chatMessageFormatter={formatChatMessageLinks} />
        <AvatarStyler />
        <InCallControls
          token={token}
          room={roomId}
          isHost={isHost}
          onRemotePhotosChange={setRemotePhotos}
        />
        <ReactionsLayer />
        <HandRaiseSystem setRaisedHands={setRaisedHands} />
        <HandRaiseOverlay raisedHands={raisedHands} />
        <ForceMuteListener />
        <BackgroundBlurButton />
        <LiveCaptions />
        <ParticipantsPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          isHost={isHost}
          token={token}
          room={roomId}
          raisedHands={raisedHands}
          remotePhotos={remotePhotos}
          myPhoto={myPhoto}
        />
      </LiveKitRoom>
    </div>
  );
}

/* ---------- Hand raise (data channel broadcast) ---------- */

function HandRaiseSystem({
  setRaisedHands,
}: {
  setRaisedHands: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const { localParticipant } = useLocalParticipant();
  const [raised, setRaised] = useState(false);
  const { send, message } = useDataChannel("pulse-hand");

  // Send my hand state when toggled
  useEffect(() => {
    if (!localParticipant) return;
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ raised, identity: localParticipant.identity })
      );
      send(payload, { reliable: true });
    } catch {}
    // Also update local set
    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (raised) next.add(localParticipant.identity);
      else next.delete(localParticipant.identity);
      return next;
    });
  }, [raised, localParticipant, send, setRaisedHands]);

  // Re-broadcast my hand state when new participants join (so they see)
  // (Handled implicitly by participants list watcher in InCallControls)

  // Receive others
  useEffect(() => {
    if (!message) return;
    try {
      const text = new TextDecoder().decode(message.payload);
      const data = JSON.parse(text);
      const id = data.identity || message.from?.identity;
      if (!id) return;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (data.raised) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {}
  }, [message, setRaisedHands]);

  return (
    <button
      onClick={() => setRaised((r) => !r)}
      className={
        "fixed bottom-20 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center text-xl backdrop-blur-md border border-white/15 transition shadow-soft " +
        (raised
          ? "bg-amber-400 text-ink"
          : "bg-white/10 hover:bg-white/20 text-white")
      }
      aria-label="Raise hand"
      title={raised ? "Lower hand" : "Raise hand"}
    >
      <Hand className="w-5 h-5" />
    </button>
  );
}

/* ---------- Meeting timer ---------- */

function MeetingTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const fmt = (n: number) => n.toString().padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5 text-white/80 text-xs font-mono">
      <Clock className="w-3.5 h-3.5" />
      {h > 0 ? `${h}:${fmt(m)}:${fmt(s)}` : `${m}:${fmt(s)}`}
    </div>
  );
}

/* ---------- Participants panel (slide-out from right) ---------- */

function ParticipantsPanel({
  open,
  onClose,
  isHost,
  token,
  room,
  raisedHands,
  remotePhotos,
  myPhoto,
}: {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  token: string;
  room: string;
  raisedHands: Set<string>;
  remotePhotos: Map<string, string>;
  myPhoto: string | null;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const localId = localParticipant?.identity ?? "";

  async function kick(identity: string) {
    if (!confirm("Kick this participant?")) return;
    await fetch("/api/kick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, target: identity, callerToken: token }),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-[#14141f]/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col">
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          People ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {(participants as Participant[]).map((p) => {
          const cn = cleanName(p.name || p.identity);
          const isLocal = p.identity === localId;
          const isPHost = (() => {
            try {
              return JSON.parse(p.metadata || "{}").role === "host";
            } catch {
              return false;
            }
          })();
          const handUp = raisedHands.has(p.identity);
          const photo = isLocal ? myPhoto : remotePhotos.get(p.identity);
          return (
            <div
              key={p.identity}
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/5"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 bg-gradient-to-br from-violet-400 to-purple-600 bg-cover bg-center"
                style={photo ? { backgroundImage: `url(${photo})` } : undefined}
              >
                {!photo && (cn[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm truncate">
                    {cn} {isLocal && <span className="text-white/40">(you)</span>}
                  </p>
                  {isPHost && (
                    <Shield className="w-3 h-3 text-brand-400" aria-label="Host" />
                  )}
                  {handUp && (
                    <span className="text-amber-400 text-base">✋</span>
                  )}
                </div>
                <p className="text-white/40 text-xs">
                  {p.isMicrophoneEnabled ? "🎤 on" : "🔇 muted"}
                </p>
              </div>
              {isHost && !isLocal && (
                <button
                  onClick={() => kick(p.identity)}
                  className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded hover:bg-rose-500/10"
                  title="Remove from meeting"
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Host menu (top center) ---------- */

function HostMenu({
  token,
  room,
  router,
}: {
  token: string;
  room: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { send } = useDataChannel("pulse-force-mute");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function muteAll() {
    if (!confirm("Mute everyone (except you)?")) return;
    setLoading("mute");
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ action: "mute" }));
      send(payload, { reliable: true });
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function toggleLock() {
    setLoading("lock");
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, locked: !locked, callerToken: token }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocked(!!data.locked);
      }
    } finally {
      setLoading(null);
    }
  }

  async function endMeeting() {
    if (!confirm("End meeting for EVERYONE? This kicks all participants.")) return;
    setLoading("end");
    try {
      await fetch("/api/end-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, callerToken: token }),
      });
      router.push("/");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-brand-grad text-white text-xs font-medium rounded-full px-3 py-1.5 hover:opacity-90 transition"
      >
        <Shield className="w-3.5 h-3.5" />
        Host
        <MoreVertical className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-[#14141f] border border-white/10 rounded-2xl shadow-card overflow-hidden">
          <HostMenuItem
            onClick={muteAll}
            disabled={loading === "mute"}
            icon={<MicOff className="w-4 h-4" />}
            label="Mute everyone"
          />
          <HostMenuItem
            onClick={toggleLock}
            disabled={loading === "lock"}
            icon={
              locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />
            }
            label={locked ? "Unlock meeting" : "Lock meeting"}
          />
          <div className="h-px bg-white/10" />
          <HostMenuItem
            onClick={endMeeting}
            disabled={loading === "end"}
            icon={<PhoneOff className="w-4 h-4" />}
            label="End meeting for all"
            danger
          />
        </div>
      )}
    </div>
  );
}

function HostMenuItem({
  onClick,
  disabled,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition disabled:opacity-50 " +
        (danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-white hover:bg-white/5")
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ---------- Force-mute receiver (any user listens, mutes their own mic) ---------- */

function ForceMuteListener() {
  const { localParticipant } = useLocalParticipant();
  const { message } = useDataChannel("pulse-force-mute");
  useEffect(() => {
    if (!message || !localParticipant) return;
    try {
      const text = new TextDecoder().decode(message.payload);
      const data = JSON.parse(text);
      if (data?.action === "mute") {
        // Self-mute (host can't remotely mute via SDK from browser; we ask politely)
        localParticipant.setMicrophoneEnabled(false);
      }
    } catch {}
  }, [message, localParticipant]);
  return null;
}

/* ---------- Hand raise indicator overlay on tile ---------- */

function HandRaiseOverlay({ raisedHands }: { raisedHands: Set<string> }) {
  const participants = useParticipants();

  useEffect(() => {
    const nameToIdentity = new Map<string, string>();
    (participants as Participant[]).forEach((p) => {
      const cn = cleanName(p.name || p.identity).trim();
      if (cn) nameToIdentity.set(cn, p.identity);
    });

    const apply = () => {
      document
        .querySelectorAll<HTMLElement>(".lk-participant-tile")
        .forEach((tile) => {
          const isLocal = tile.getAttribute("data-lk-local-participant") === "true";
          let identity =
            tile.getAttribute("data-lk-participant-identity") || "";
          if (!identity) {
            const nameText =
              tile.querySelector(".lk-participant-name")?.textContent ?? "";
            const cn = cleanName(nameText.trim()).replace(/^[^\w\d]+/, "").trim();
            identity = nameToIdentity.get(cn) || "";
          }
          const isRaised = identity && raisedHands.has(identity);

          let indicator = tile.querySelector<HTMLElement>(".pulse-hand-indicator");
          if (isRaised) {
            if (!indicator) {
              indicator = document.createElement("div");
              indicator.className = "pulse-hand-indicator";
              indicator.textContent = "✋";
              tile.appendChild(indicator);
            }
          } else if (indicator) {
            indicator.remove();
          }
          // Avoid unused warn
          void isLocal;
        });
    };
    apply();
    const id = window.setInterval(apply, 600);
    return () => window.clearInterval(id);
  }, [raisedHands, participants]);

  return null;
}

/* ---------- Background Blur toggle (MediaPipe via @livekit/track-processors) ---------- */

function BackgroundBlurButton() {
  const { localParticipant } = useLocalParticipant();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function enable() {
    if (!localParticipant) return;
    const cam = localParticipant.getTrackPublication(Track.Source.Camera);
    const track = cam?.videoTrack;
    if (!track) return;
    setLoading(true);
    try {
      const mod = await import("@livekit/track-processors");
      await track.setProcessor(mod.BackgroundBlur(10));
      setEnabled(true);
      localStorage.setItem("pulse-blur", "1");
    } catch (e) {
      console.error("Background blur failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    if (!localParticipant) return;
    const cam = localParticipant.getTrackPublication(Track.Source.Camera);
    const track = cam?.videoTrack;
    if (!track) return;
    setLoading(true);
    try {
      await track.stopProcessor();
      setEnabled(false);
      localStorage.removeItem("pulse-blur");
    } catch (e) {
      console.error("Stop blur failed", e);
    } finally {
      setLoading(false);
    }
  }

  // Restore saved preference once participant is ready
  useEffect(() => {
    const saved = localStorage.getItem("pulse-blur") === "1";
    if (saved && localParticipant && !enabled) {
      enable().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParticipant]);

  return (
    <button
      onClick={() => (enabled ? disable() : enable())}
      disabled={loading}
      className={
        "fixed bottom-20 right-20 z-40 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/15 shadow-soft transition disabled:opacity-50 " +
        (enabled
          ? "bg-brand-grad text-white"
          : "bg-white/10 hover:bg-white/20 text-white")
      }
      title={enabled ? "Disable background blur" : "Enable background blur"}
      aria-label="Background blur"
    >
      <Sparkles className="w-5 h-5" />
    </button>
  );
}

/* ---------- Live Captions (Web Speech API + data channel broadcast) ---------- */

type CaptionMsg = {
  identity: string;
  name: string;
  text: string;
  final: boolean;
  ts: number;
};

function LiveCaptions() {
  const { localParticipant } = useLocalParticipant();
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [captions, setCaptions] = useState<CaptionMsg[]>([]);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const { send, message } = useDataChannel("pulse-caption");

  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  // Auto-cleanup old captions
  useEffect(() => {
    if (captions.length === 0) return;
    const id = setInterval(() => {
      setCaptions((prev) => prev.filter((c) => Date.now() - c.ts < 5000));
    }, 1000);
    return () => clearInterval(id);
  }, [captions.length]);

  // Receive captions from others
  useEffect(() => {
    if (!message) return;
    try {
      const text = new TextDecoder().decode(message.payload);
      const data = JSON.parse(text) as { text?: string; final?: boolean };
      if (!data?.text || !message.from?.identity) return;
      const cap: CaptionMsg = {
        identity: message.from.identity,
        name: cleanName(message.from.name || message.from.identity),
        text: data.text,
        final: !!data.final,
        ts: Date.now(),
      };
      setCaptions((prev) => {
        const filtered = prev.filter(
          (c) => c.identity !== cap.identity || c.final
        );
        return [...filtered, cap].slice(-6);
      });
    } catch {}
  }, [message]);

  function broadcastCaption(text: string, final: boolean) {
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ text, final }));
      send(payload, { reliable: false });
    } catch {}
  }

  function start() {
    const SRClass = (window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;
    if (!SRClass || !localParticipant) return;
    type RecResult = {
      [k: number]: { transcript: string };
      isFinal: boolean;
    };
    type SR = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: (e: {
        resultIndex: number;
        results: { [k: number]: RecResult; length: number };
      }) => void;
      onerror: (e: unknown) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    const rec = new SRClass() as SR;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "id-ID";
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        broadcastCaption(transcript, !!res.isFinal);
        setCaptions((prev) => {
          const cap: CaptionMsg = {
            identity: localParticipant.identity,
            name: cleanName(localParticipant.name || localParticipant.identity),
            text: transcript,
            final: !!res.isFinal,
            ts: Date.now(),
          };
          const filtered = prev.filter(
            (c) => c.identity !== cap.identity || c.final
          );
          return [...filtered, cap].slice(-6);
        });
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (recRef.current) {
        try {
          rec.start();
        } catch {}
      }
    };
    try {
      rec.start();
      recRef.current = rec;
    } catch {}
  }

  function stop() {
    const rec = recRef.current;
    recRef.current = null;
    if (rec?.stop) {
      try {
        rec.stop();
      } catch {}
    }
  }

  function toggle() {
    if (enabled) {
      stop();
      setEnabled(false);
    } else {
      start();
      setEnabled(true);
    }
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={!supported}
        className={
          "fixed bottom-20 right-36 z-40 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/15 shadow-soft transition disabled:opacity-30 " +
          (enabled
            ? "bg-brand-grad text-white"
            : "bg-white/10 hover:bg-white/20 text-white")
        }
        title={
          !supported
            ? "Captions not supported (try Chrome)"
            : enabled
            ? "Stop captions"
            : "Turn on captions"
        }
        aria-label="Captions"
      >
        <Captions className="w-5 h-5" />
      </button>

      {captions.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-36 z-30 max-w-[90vw] pointer-events-none flex flex-col items-center gap-1 px-4">
          {captions.slice(-3).map((c, i) => (
            <div
              key={`${c.identity}-${c.ts}-${i}`}
              className={
                "bg-black/70 text-white text-sm sm:text-base rounded-xl px-3 py-1.5 backdrop-blur-md max-w-2xl text-center " +
                (c.final ? "" : "opacity-80 italic")
              }
            >
              <span className="text-brand-300 font-medium mr-2">{c.name}:</span>
              {c.text}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

