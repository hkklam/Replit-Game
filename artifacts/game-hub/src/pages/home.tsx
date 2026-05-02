import { Link } from "wouter";
import { GAMES } from "@/games/registry";

export default function Home() {
  const simple = GAMES.filter(g => g.tier === "🟢");
  const medium = GAMES.filter(g => g.tier === "🟡");
  const hard   = GAMES.filter(g => g.tier === "🔴");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-primary mb-3 tracking-tight">🎮 GAME HUB</h1>
          <p className="text-muted-foreground text-lg">{GAMES.length} games · MVP Edition</p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
            <span>🟢 Simple ({simple.length})</span>
            <span>🟡 Medium ({medium.length})</span>
            <span>🔴 Hard ({hard.length})</span>
          </div>
        </div>

        {[
          { label: "🟢 Simple", games: simple },
          { label: "🟡 Medium", games: medium },
          { label: "🔴 Hard", games: hard },
        ].map(({ label, games }) => (
          <div key={label} className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 pl-1">{label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((g) => (
                <Link key={g.id} href={`/${g.id}`}>
                  <div className={`group bg-gradient-to-br ${g.gradient} border border-border ${g.borderHover} rounded-xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{g.tier}</span>
                      <span className="text-xs font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">PLAY →</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{g.name}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">{g.desc}</p>
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
