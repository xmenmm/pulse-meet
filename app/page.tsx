"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Link as LinkIcon,
  ArrowRight,
  Sparkles,
  Users,
  Shield,
  Globe,
  Bell,
  X,
  User as UserIcon,
  LogOut,
  Pencil,
} from "lucide-react";

function generateRoomId() {
  const adjectives = ["stellar", "lunar", "cosmic", "neon", "swift", "calm", "bold", "warm"];
  const nouns = ["bay", "wave", "ridge", "loop", "field", "harbor", "garden", "peak"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${num}-${a}-${n}`;
}

function parseRoomFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/room\/([^/?#]+)/);
    if (match) return match[1];
  } catch {
    // not a URL
  }
  return trimmed.replace(/^\/+|\/+$/g, "");
}

export default function Home() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [code, setCode] = useState("");
  const [showToast, setShowToast] = useState(true);

  function startMeeting() {
    const id = generateRoomId();
    router.push(`/room/${id}?host=1`);
  }

  function joinMeeting() {
    const id = parseRoomFromInput(code);
    if (id) router.push(`/room/${id}`);
  }

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = now
    ? now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div className="relative min-h-screen bg-soft-grad overflow-hidden">
      {/* ===== TOP NAV ===== */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PulseLogo />
          <span className="text-xl font-semibold tracking-tight text-ink">
            Pulse
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a className="hover:text-ink transition" href="#features">Features</a>
          <a className="hover:text-ink transition" href="#pricing">Pricing</a>
          <a className="hover:text-ink transition" href="#about">About</a>
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-muted">
            {timeLabel}
          </span>
          <ProfileAvatar />
        </div>
      </header>

      {/* ===== HERO ===== */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        {/* Left: copy + CTAs */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white border border-line rounded-full px-3 py-1.5 text-xs text-muted shadow-soft">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            New · End-to-end encrypted rooms
          </div>

          <h1 className="mt-6 text-[3.2rem] leading-[1.05] font-semibold tracking-tight text-ink">
            Meetings that feel
            <br />
            <span className="bg-brand-grad bg-clip-text text-transparent">
              effortless.
            </span>
          </h1>

          <p className="mt-5 text-lg text-muted max-w-lg">
            Pulse is a fresh take on video calls — fast, private, and built for
            the way teams actually work today.
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col sm:flex-row items-stretch gap-3 max-w-xl">
            <button
              onClick={startMeeting}
              className="group inline-flex items-center justify-center gap-2 bg-brand-grad text-white text-sm font-medium px-6 py-3.5 rounded-2xl shadow-soft hover:shadow-card transition-all"
            >
              <Video className="w-4 h-4" />
              Start a meeting
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="flex items-center gap-2 bg-white border border-line rounded-2xl px-4 flex-1 focus-within:border-brand-400 transition">
              <LinkIcon className="w-4 h-4 text-muted" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinMeeting()}
                placeholder="Paste a meeting link or code"
                className="flex-1 outline-none text-sm bg-transparent py-3 placeholder:text-muted"
              />
              <button
                onClick={joinMeeting}
                disabled={!code.trim()}
                className={
                  "text-sm font-medium px-3 py-1.5 rounded-full transition " +
                  (code.trim()
                    ? "bg-ink text-white hover:bg-brand-700"
                    : "text-muted/60 cursor-default")
                }
              >
                Join
              </button>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
            <Pill icon={<Shield className="w-4 h-4" />}>E2E encrypted</Pill>
            <Pill icon={<Users className="w-4 h-4" />}>Up to 50 people</Pill>
            <Pill icon={<Globe className="w-4 h-4" />}>Works in any browser</Pill>
          </div>
        </div>

        {/* Right: visual card */}
        <div className="relative">
          <HeroCard />
        </div>
      </main>

      {/* ===== FEATURE STRIP ===== */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-4"
      >
        <FeatureCard
          title="Instant rooms"
          desc="Spin up a private room in one click. No accounts required for guests."
          tone="brand"
        />
        <FeatureCard
          title="Crystal audio"
          desc="Adaptive noise suppression keeps your voice clear, even from a café."
          tone="ink"
        />
        <FeatureCard
          title="No time limits"
          desc="Talk as long as you want. Free during early access — no hidden caps."
          tone="brand"
        />
      </section>

      {/* ===== TOAST ===== */}
      {showToast && (
        <div className="fixed bottom-6 right-6 w-80 bg-white border border-line rounded-2xl shadow-card p-4 z-30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">
                Stay in the loop
              </p>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Enable notifications so Pulse can alert you when teammates join
                or invite you to a room.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setShowToast(false)}
                  className="text-muted hover:text-ink text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => setShowToast(false)}
                  className="bg-brand-grad text-white text-sm font-medium px-4 py-1.5 rounded-full hover:opacity-90"
                >
                  Enable
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-muted hover:text-ink"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Profile Avatar ---------- */

function avatarGradient(name: string) {
  const palettes = [
    "from-rose-400 to-fuchsia-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-indigo-500",
    "from-violet-400 to-purple-600",
    "from-pink-400 to-rose-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palettes.length;
  return palettes[h];
}

function ProfileAvatar() {
  const [name, setName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pulse-name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function save() {
    const v = draft.trim();
    if (v) {
      localStorage.setItem("pulse-name", v);
      setName(v);
      setEditing(false);
      setOpen(false);
    }
  }

  function signOut() {
    localStorage.removeItem("pulse-name");
    setName(null);
    setOpen(false);
  }

  const initial = name ? name.trim()[0].toUpperCase() : null;
  const grad = name ? avatarGradient(name) : "from-brand-400 to-brand-700";

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          setDraft(name ?? "");
          setEditing(!name);
        }}
        className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold ring-2 ring-white shadow-soft hover:shadow-card transition`}
        aria-label="Profile"
      >
        {initial ?? <UserIcon className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white border border-line rounded-2xl shadow-card p-5 z-40">
          {/* Top: avatar large */}
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-2xl font-semibold shadow-soft`}
            >
              {initial ?? <UserIcon className="w-7 h-7" />}
            </div>

            {!editing && name && (
              <>
                <p className="mt-3 text-base font-semibold text-ink">{name}</p>
                <p className="text-xs text-muted">Signed in as guest</p>
              </>
            )}

            {editing && (
              <div className="mt-4 w-full">
                <label className="text-xs text-muted block mb-1.5">
                  Your name
                </label>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  placeholder="e.g. Bintang"
                  className="w-full border border-line rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition"
                />
                <div className="mt-3 flex gap-2">
                  {name && (
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 text-sm text-muted hover:text-ink py-2 rounded-full"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={!draft.trim()}
                    className={
                      "flex-1 text-sm font-medium py-2 rounded-full transition " +
                      (draft.trim()
                        ? "bg-brand-grad text-white"
                        : "bg-line text-muted cursor-default")
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!editing && name && (
            <div className="mt-4 pt-4 border-t border-line space-y-1">
              <button
                onClick={() => {
                  setDraft(name);
                  setEditing(true);
                }}
                className="w-full flex items-center gap-3 text-sm text-ink hover:bg-panel rounded-xl px-3 py-2 transition"
              >
                <Pencil className="w-4 h-4 text-muted" />
                Edit name
              </button>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 text-sm text-rose-500 hover:bg-rose-50 rounded-xl px-3 py-2 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-brand-500">{icon}</span>
      {children}
    </span>
  );
}

function FeatureCard({
  title,
  desc,
  tone,
}: {
  title: string;
  desc: string;
  tone: "brand" | "ink";
}) {
  const styles =
    tone === "brand"
      ? "bg-white border-line"
      : "bg-ink text-white border-ink";
  return (
    <div className={`rounded-3xl border p-6 shadow-card ${styles}`}>
      <div
        className={
          "w-10 h-10 rounded-2xl mb-4 " +
          (tone === "brand" ? "bg-brand-grad" : "bg-brand-500")
        }
      />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p
        className={
          "mt-2 text-sm leading-relaxed " +
          (tone === "brand" ? "text-muted" : "text-white/70")
        }
      >
        {desc}
      </p>
    </div>
  );
}

/* ---------- Custom Logo ---------- */

function PulseLogo() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pulse logo"
    >
      <defs>
        <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9d77ff" />
          <stop offset="100%" stopColor="#5a25d8" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        fill="url(#pulseGrad)"
      />
      {/* Pulse waveform inside */}
      <path
        d="M12 32 L22 32 L26 22 L34 44 L40 28 L46 36 L52 32"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/* ---------- Hero visual card (mock call preview) ---------- */

function HeroCard() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 bg-brand-grad opacity-20 blur-3xl rounded-[3rem]" />

      {/* Main card */}
      <div className="relative bg-white rounded-[2rem] border border-line shadow-card p-5 overflow-hidden">
        {/* Window bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="text-[11px] text-muted font-medium">
            pulse.app/room/47-stellar-bay
          </span>
          <div className="w-10" />
        </div>

        {/* Video tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Tile color="from-indigo-400 to-violet-500" name="Aria" />
          <Tile color="from-rose-400 to-fuchsia-500" name="Maya" />
          <Tile color="from-emerald-400 to-teal-500" name="Reno" />
          <Tile color="from-amber-400 to-orange-500" name="You" muted />
        </div>

        {/* Control bar */}
        <div className="mt-4 flex items-center justify-center gap-2 bg-ink/5 rounded-2xl py-2.5">
          <Ctrl color="bg-ink text-white">🎤</Ctrl>
          <Ctrl color="bg-ink text-white">📹</Ctrl>
          <Ctrl color="bg-white border border-line">💬</Ctrl>
          <Ctrl color="bg-white border border-line">🖥️</Ctrl>
          <Ctrl color="bg-rose-500 text-white">⏻</Ctrl>
        </div>
      </div>
    </div>
  );
}

function Tile({
  color,
  name,
  muted,
}: {
  color: string;
  name: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`relative aspect-video rounded-2xl bg-gradient-to-br ${color} overflow-hidden`}
    >
      {/* abstract avatar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white font-semibold text-lg">
          {name[0]}
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] text-white font-medium bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
        {muted && <span className="text-rose-300">•</span>}
        {name}
      </div>
    </div>
  );
}

function Ctrl({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${color}`}
    >
      {children}
    </button>
  );
}
