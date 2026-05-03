import { Link } from "wouter";
import { GAMES } from "@/games/registry";
import { QRCode } from "@/components/QRCode";

export default function Home() {
  const simple = GAMES.filter(g => g.tier === "🟢");
  const medium = GAMES.filter(g => g.tier === "🟡");
  const hard   = GAMES.filter(g => g.tier === "🔴");
  const hubUrl = window.location.origin + window.location.pathname;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Link href="/tutor" className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/20 text-amber-300 font-semibold text-sm transition-all">
              📚 Learn Programming
            </Link>
          </div>
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl animate-bounce select-none" style={{ animationDuration: "2s" }}>🎮</span>
            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Harry's Game Hub
            </h1>
          </div>
          <p className="text-muted-foreground text-base">{GAMES.length} fully playable games · MVP Edition</p>
          <div className="flex justify-center gap-8 mt-4 text-sm">
            <span className="text-emerald-400 font-semibold">🟢 Simple ({simple.length})</span>
            <span className="text-yellow-400 font-semibold">🟡 Medium ({medium.length})</span>
            <span className="text-red-400 font-semibold">🔴 Hard ({hard.length})</span>
          </div>

          {/* Share QR code */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="p-2.5 bg-white rounded-2xl shadow-lg inline-block">
              <QRCode value={hubUrl} size={108} />
            </div>
            <p className="text-xs text-muted-foreground">Scan to share Game Hub</p>
          </div>
        </div>

        {[
          { label: "Simple", emoji: "🟢", labelColor: "#34d399", games: simple },
          { label: "Medium", emoji: "🟡", labelColor: "#facc15", games: medium },
          { label: "Hard",   emoji: "🔴", labelColor: "#f87171", games: hard },
        ].map(({ label, emoji, labelColor, games }) => (
          <div key={label} className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-lg">{emoji}</span>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: labelColor }}>{label}</h2>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${labelColor}40, transparent)` }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {games.map((g) => (
                <Link key={g.id} href={`/${g.id}`}>
                  <div
                    className={`group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.04] overflow-hidden bg-gradient-to-br ${g.gradient}`}
                    style={{ border: `1px solid ${g.borderColor}` }}
                  >
                    {/* Hover glow overlay */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ boxShadow: `inset 0 0 40px ${g.color}15` }}
                    />

                    {/* Top-right sparkle */}
                    <div
                      className="absolute top-3 right-3 text-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0"
                      style={{ filter: `drop-shadow(0 0 6px ${g.color})` }}
                    >
                      ✦
                    </div>

                    {/* Icon */}
                    <div
                      className="text-6xl mb-4 select-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 origin-left"
                      style={{ filter: `drop-shadow(0 4px 12px ${g.color}60)` }}
                    >
                      {g.icon}
                    </div>

                    {/* Title */}
                    <h3
                      className="text-lg font-black mb-1 transition-colors duration-200"
                      style={{ color: g.color }}
                    >
                      {g.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-snug">{g.desc}</p>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground/50">{g.tier} {label}</span>
                      <span
                        className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ color: g.color }}
                      >
                        PLAY →
                      </span>
                    </div>

                    {/* Bottom accent line */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(to right, transparent, ${g.color}, transparent)` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
