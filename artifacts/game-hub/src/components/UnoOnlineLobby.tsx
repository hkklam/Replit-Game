import { useState } from "react";
import type { UnoOnlineStatus, LobbyPlayer, Variant } from "../lib/uno-online";

const VARIANT_LABELS: Record<Variant, { icon: string; name: string }> = {
  classic:     { icon: "🃏", name: "Classic" },
  flip:        { icon: "↕️", name: "Flip" },
  progressive: { icon: "📈", name: "Progressive" },
  seveno:      { icon: "7️⃣", name: "Seven-O" },
};

type Props = {
  status: UnoOnlineStatus;
  roomCode: string;
  myIdx: number;
  isHost: boolean;
  players: LobbyPlayer[];
  error: string;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onStart: (variant: Variant) => void;
  onDisconnect: () => void;
  onBack: () => void;
};

export function UnoOnlineLobby({
  status, roomCode, myIdx, isHost, players, error,
  onCreate, onJoin, onStart, onDisconnect, onBack,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [variant, setVariant] = useState<Variant>("classic");

  if (status === "idle" || status === "error") return (
    <div className="flex flex-col items-center gap-5 p-6 max-w-sm w-full">
      <h3 className="text-xl font-black text-red-400">🌐 Online UNO</h3>
      <p className="text-xs text-gray-400 text-center">Up to 8 players · Real-time · Server-authoritative</p>
      {error && (
        <div className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      <input
        value={name}
        onChange={e => setName(e.target.value.slice(0, 14))}
        placeholder="Your name"
        maxLength={14}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-semibold text-center focus:outline-none focus:border-red-500 transition-colors"
      />
      <button
        onClick={() => name.trim() && onCreate(name.trim())}
        disabled={!name.trim()}
        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black rounded-xl transition-colors"
      >
        ➕ Create Room
      </button>
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500">or join with code</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>
      <div className="w-full flex flex-col gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ABCD"
          maxLength={4}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl font-mono text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-sky-500 transition-colors"
        />
        <button
          onClick={() => code.length === 4 && name.trim() && onJoin(code, name.trim())}
          disabled={code.length !== 4 || !name.trim()}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-black rounded-xl transition-colors"
        >
          🔗 Join Room
        </button>
        {!name.trim() && <p className="text-xs text-gray-500 text-center">Enter your name above first</p>}
      </div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back</button>
    </div>
  );

  if (status === "connecting") return (
    <div className="flex flex-col items-center gap-4 p-10">
      <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Connecting…</p>
    </div>
  );

  if (status === "lobby") return (
    <div className="flex flex-col items-center gap-5 p-6 max-w-sm w-full">
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-1">Room Code</p>
        <div
          className="py-4 px-8 bg-gray-800 rounded-2xl border-2 border-red-500/40 font-mono text-4xl tracking-[0.5em] text-red-400 font-black select-all cursor-pointer hover:border-red-400/80 transition-colors"
          onClick={() => navigator.clipboard?.writeText(roomCode).catch(() => {})}
          title="Click to copy"
        >
          {roomCode}
        </div>
        <p className="text-xs text-gray-500 mt-2">Share this code with friends to join</p>
      </div>

      <div className="w-full">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">
          Players ({players.length}/8)
        </p>
        <div className="space-y-1.5">
          {players.map(p => (
            <div key={p.idx} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
              p.idx === myIdx
                ? "bg-red-500/10 border-red-500/30"
                : "bg-gray-800/60 border-gray-700/50"
            }`}>
              <span className="text-lg">{p.idx === 0 ? "👑" : "👤"}</span>
              <span className="text-white font-semibold text-sm flex-1">{p.name}</span>
              {p.idx === myIdx && <span className="text-xs text-red-400 font-bold">You</span>}
              {p.idx === 0 && p.idx !== myIdx && <span className="text-xs text-yellow-400 font-bold">Host</span>}
            </div>
          ))}
          {players.length < 8 && (
            <div className="px-3 py-2 rounded-xl border border-dashed border-gray-700/50 text-center">
              <p className="text-xs text-gray-600">Waiting for more players… ({8 - players.length} slots open)</p>
            </div>
          )}
        </div>
      </div>

      {isHost ? (
        <>
          <div className="w-full">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Game Variant</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(VARIANT_LABELS) as [Variant, { icon: string; name: string }][]).map(([v, info]) => (
                <button key={v} onClick={() => setVariant(v)}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${
                    variant === v
                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                      : "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-gray-600"
                  }`}>
                  {info.icon} {info.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onStart(variant)}
            disabled={players.length < 2}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black rounded-xl text-lg transition-colors"
          >
            🃏 Start Game ({players.length} players)
          </button>
          {players.length < 2 && <p className="text-xs text-gray-500">Need at least 2 players to start</p>}
        </>
      ) : (
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Waiting for host to start the game…</p>
        </div>
      )}

      <button onClick={onDisconnect} className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕ Leave Room</button>
    </div>
  );

  if (status === "disconnected") return (
    <div className="flex flex-col items-center gap-5 p-6 text-center">
      <div className="text-4xl">😔</div>
      <p className="text-red-400 font-bold text-lg">Disconnected</p>
      <p className="text-gray-400 text-sm">The connection was lost or the host left.</p>
      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-2 bg-gray-800 text-white font-bold rounded-xl transition-colors hover:bg-gray-700">
          ← Menu
        </button>
      </div>
    </div>
  );

  return null;
}
