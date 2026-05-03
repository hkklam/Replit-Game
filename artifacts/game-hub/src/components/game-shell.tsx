import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  controls?: string;
  children: React.ReactNode;
}

export function GameShell({ title, controls, children }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {children}
      </div>
    </div>
  );
}
