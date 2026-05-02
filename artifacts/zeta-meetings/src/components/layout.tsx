import { Link, useLocation } from "wouter";
import { Mic, History, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden flex-col">
      {/* Top header bar */}
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-bold text-base tracking-tight text-primary flex items-center gap-2">
            <Mic className="h-4 w-4" /> ZETA Notes
          </span>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${location === "/" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Mic className="h-3.5 w-3.5" /> Record
            </Link>
            <Link
              href="/meetings"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${location.startsWith("/meetings") ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <History className="h-3.5 w-3.5" /> History
            </Link>
          </nav>
        </div>

        {/* Settings icon — always visible top-right */}
        <Link
          href="/settings"
          title="Settings"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${location === "/settings" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
        >
          <Settings className={`h-5 w-5 transition-transform duration-300 ${location === "/settings" ? "" : "hover:rotate-45"}`} />
          <span className="hidden md:inline">Settings</span>
        </Link>
      </header>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-10 flex">
        <Link href="/" className={`flex-1 flex flex-col items-center justify-center py-3 ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
          <Mic className="h-5 w-5" />
          <span className="text-xs mt-1">Record</span>
        </Link>
        <Link href="/meetings" className={`flex-1 flex flex-col items-center justify-center py-3 ${location.startsWith("/meetings") ? "text-primary" : "text-muted-foreground"}`}>
          <History className="h-5 w-5" />
          <span className="text-xs mt-1">History</span>
        </Link>
        <Link href="/settings" className={`flex-1 flex flex-col items-center justify-center py-3 ${location === "/settings" ? "text-primary" : "text-muted-foreground"}`}>
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">Settings</span>
        </Link>
      </div>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
