import { useState, useEffect, useRef } from "react";
import type { MPStatus, MPRole } from "../lib/multiplayer";
import { QRCode, buildInviteUrl } from "./QRCode";

type Props = {
  status: MPStatus;
  roomCode: string;
  role: MPRole | null;
  error: string;
  initialCode?: string;   // pre-filled room code from URL ?room= param
  onCreate: () => void;
  onJoin: (code: string) => void;
  onDisconnect: () => void;
  onBack: () => void;
};

export function OnlineLobby({ status, roomCode, role, error, initialCode = "", onCreate, onJoin, onDisconnect, onBack }: Props) {
  const [input, setInput] = useState(initialCode);
  const autoJoinedRef    = useRef(false);

  // Auto-join when a room code comes in via URL (?room=ABCD)
  useEffect(() => {
    if (!autoJoinedRef.current && initialCode.length >= 4 && status === "idle") {
      autoJoinedRef.current = true;
      onJoin(initialCode);
    }
  }, [initialCode, status, onJoin]);

  const inviteUrl = roomCode ? buildInviteUrl(roomCode) : "";

  if (status === "idle" || status === "error") return (
    <div className="flex flex-col items-center gap-5 p-6 max-w-xs w-full">
      <h3 className="text-xl font-black text-primary">🌐 Online Multiplayer</h3>
      {error && (
        <div className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      <button onClick={onCreate} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">
        ➕ Create Room
      </button>
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or join with code</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="w-full flex flex-col gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ABCD"
          maxLength={4}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-xl font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={() => input.length === 4 && onJoin(input)}
          disabled={input.length !== 4}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
        >
          🔗 Join Room
        </button>
      </div>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to menu
      </button>
    </div>
  );

  if (status === "connecting") return (
    <div className="flex flex-col items-center gap-4 p-10">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Connecting…</p>
    </div>
  );

  if (status === "waiting") return (
    <div className="flex flex-col items-center gap-5 p-6 max-w-xs w-full text-center">
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      <h3 className="text-xl font-black text-green-400">Room Ready!</h3>
      <p className="text-sm text-muted-foreground">Share this code with your friend:</p>
      <div
        className="w-full py-5 bg-secondary rounded-2xl border-2 border-green-500/40 font-mono text-5xl tracking-[0.5em] text-green-400 font-black select-all cursor-pointer hover:border-green-400/80 transition-colors"
        onClick={() => navigator.clipboard?.writeText(roomCode).catch(() => {})}
        title="Click to copy"
      >
        {roomCode}
      </div>

      {/* QR code — friend scans this to join directly */}
      {inviteUrl && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">or scan to join instantly:</p>
          <div className="p-2 bg-white rounded-xl shadow-md">
            <QRCode value={inviteUrl} size={140} />
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-mono break-all max-w-[200px] text-center">{inviteUrl}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground animate-pulse">Waiting for opponent to join…</p>
      <button onClick={onDisconnect} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">✕ Cancel</button>
    </div>
  );

  if (status === "disconnected") return (
    <div className="flex flex-col items-center gap-5 p-6 text-center">
      <div className="text-4xl">😔</div>
      <p className="text-red-400 font-bold text-lg">Opponent disconnected</p>
      <div className="flex gap-3">
        <button onClick={onCreate} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">New Room</button>
        <button onClick={onBack} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl transition-colors">Menu</button>
      </div>
    </div>
  );

  return null;
}
