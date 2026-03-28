import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppDataProvider } from "@/lib/useAppData";
import { AppShell } from "@/components/app-shell";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Capture from "@/pages/capture";
import Inbox from "@/pages/inbox";
import Today from "@/pages/today";
import Projects from "@/pages/projects";
import Upcoming from "@/pages/upcoming";
import Review from "@/pages/review";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Capture} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/today" component={Today} />
        <Route path="/projects" component={Projects} />
        <Route path="/upcoming" component={Upcoming} />
        <Route path="/review" component={Review} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppDataProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppDataProvider>
    </QueryClientProvider>
  );
}

export default App;
