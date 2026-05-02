import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Snake from "@/games/snake";
import Pong from "@/games/pong";
import FlappyBird from "@/games/flappy-bird";
import Chess from "@/games/chess";
import TypingRacer from "@/games/typing-racer";
import Battleship from "@/games/battleship";
import Uno from "@/games/uno";
import PacMan from "@/games/pac-man";
import BubbleShooter from "@/games/bubble-shooter";
import TowerDefense from "@/games/tower-defense";
import Minecraft from "@/games/minecraft";
import Racing from "@/games/racing";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/snake" component={Snake} />
      <Route path="/pong" component={Pong} />
      <Route path="/flappy-bird" component={FlappyBird} />
      <Route path="/chess" component={Chess} />
      <Route path="/typing-racer" component={TypingRacer} />
      <Route path="/battleship" component={Battleship} />
      <Route path="/uno" component={Uno} />
      <Route path="/pac-man" component={PacMan} />
      <Route path="/bubble-shooter" component={BubbleShooter} />
      <Route path="/tower-defense" component={TowerDefense} />
      <Route path="/minecraft" component={Minecraft} />
      <Route path="/racing" component={Racing} />
      <Route>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <div className="text-center"><p className="text-2xl mb-4">404 — Game not found</p><a href="/" className="text-primary hover:underline">← Back to Hub</a></div>
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
