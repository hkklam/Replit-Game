import { Link, useLocation } from "wouter";
import { Mic, History, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <Mic className="h-5 w-5" /> ZETA Notes
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Mic className="h-4 w-4" /> Record
          </Link>
          <Link href="/meetings" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith("/meetings") ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <History className="h-4 w-4" /> History
          </Link>
        </nav>
        <div className="px-4 pb-4">
          <Link href="/settings" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/settings" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </aside>

      {/* Mobile nav */}
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
        <div className="max-w-4xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
