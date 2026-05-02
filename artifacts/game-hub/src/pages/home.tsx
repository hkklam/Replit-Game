import { Link } from "wouter";

const GAMES = [
  { id: "snake", name: "Snake", tier: "🟢", desc: "Eat food, grow longer, don't crash.", color: "from-emerald-900/40 to-emerald-800/20", border: "hover:border-emerald-500/50" },
  { id: "pong", name: "Pong", tier: "🟢", desc: "Classic paddle battle. First to 7 wins.", color: "from-sky-900/40 to-sky-800/20", border: "hover:border-sky-500/50" },
  { id: "typing-racer", name: "Typing Racer", tier: "🟢", desc: "Race to type the passage fastest.", color: "from-yellow-900/40 to-yellow-800/20", border: "hover:border-yellow-500/50" },
  { id: "uno", name: "Uno", tier: "🟢", desc: "Match colors and numbers. First to empty hand wins.", color: "from-red-900/40 to-red-800/20", border: "hover:border-red-500/50" },
  { id: "chess", name: "Chess", tier: "🟢", desc: "Classic chess. Local 2-player.", color: "from-violet-900/40 to-violet-800/20", border: "hover:border-violet-500/50" },
  { id: "flappy-bird", name: "Flappy Bird", tier: "🟡", desc: "Tap to flap. Don't hit the pipes!", color: "from-lime-900/40 to-lime-800/20", border: "hover:border-lime-500/50" },
  { id: "tower-defense", name: "Tower Defense", tier: "🟡", desc: "Place towers, stop the waves.", color: "from-orange-900/40 to-orange-800/20", border: "hover:border-orange-500/50" },
  { id: "bubble-shooter", name: "Bubble Shooter", tier: "🟡", desc: "Match 3+ same-color bubbles.", color: "from-pink-900/40 to-pink-800/20", border: "hover:border-pink-500/50" },
  { id: "battleship", name: "Battleship", tier: "🟡", desc: "Sink the enemy fleet first.", color: "from-cyan-900/40 to-cyan-800/20", border: "hover:border-cyan-500/50" },
  { id: "pac-man", name: "Pac-Man", tier: "🟡", desc: "Eat all dots, avoid the ghosts.", color: "from-amber-900/40 to-amber-800/20", border: "hover:border-amber-500/50" },
  { id: "minecraft", name: "Minecraft Voxel", tier: "🔴", desc: "Build your world block by block.", color: "from-green-900/40 to-green-800/20", border: "hover:border-green-500/50" },
  { id: "racing", name: "Racing Game", tier: "🔴", desc: "Top-down racing. Best lap time wins.", color: "from-indigo-900/40 to-indigo-800/20", border: "hover:border-indigo-500/50" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-primary mb-3 tracking-tight">🎮 GAME HUB</h1>
          <p className="text-muted-foreground text-lg">12 games · MVP Edition</p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
            <span>🟢 Simple</span>
            <span>🟡 Medium</span>
            <span>🔴 Hard</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <Link key={g.id} href={`/${g.id}`}>
              <div className={`group bg-gradient-to-br ${g.color} border border-border ${g.border} rounded-xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{g.tier}</span>
                  <span className="text-xs font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">PLAY →</span>
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">{g.name}</h2>
                <p className="text-sm text-muted-foreground leading-snug">{g.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
