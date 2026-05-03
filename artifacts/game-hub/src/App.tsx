import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import { GAMES } from "@/games/registry";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Routes are auto-generated from the game registry — no manual edits needed here */}
      {GAMES.map((g) => (
        <Route key={g.id} path={`/${g.id}`} component={g.component} />
      ))}

      <Route>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-2xl mb-4">404 — Game not found</p>
            <a href="/" className="text-primary hover:underline">← Back to Menu</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
