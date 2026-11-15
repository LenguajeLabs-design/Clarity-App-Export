import { Switch, Route, Router as WouterRouter } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SyncStatusProvider } from "@/lib/useSyncStatus";
import { AppDataProvider } from "@/lib/useAppData";
import { ThemeSync } from "@/lib/useTheme";
import { AppShell } from "@/components/app-shell";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirebaseAuthGate, FirebaseAuthProvider } from "@/lib/firebase-auth";

import Capture from "@/pages/capture";
import Inbox from "@/pages/inbox";
import Today from "@/pages/today";
import Projects from "@/pages/projects";
import Upcoming from "@/pages/upcoming";
import Review from "@/pages/review";
import Done from "@/pages/done";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function usePageLocation(): ReturnType<typeof useBrowserLocation> {
  const [location, navigate] = useBrowserLocation();
  // GitHub serves physical route directories with a trailing slash.
  return [location.replace(/\/+$/, "") || "/", navigate];
}

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
        <Route path="/done" component={Done} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <SyncStatusProvider>
          <FirebaseAuthGate>
            <AppDataProvider>
                <ThemeSync />
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")} hook={usePageLocation}>
                    <Router />
                  </WouterRouter>
                  <Toaster />
                </TooltipProvider>
            </AppDataProvider>
          </FirebaseAuthGate>
        </SyncStatusProvider>
      </FirebaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
