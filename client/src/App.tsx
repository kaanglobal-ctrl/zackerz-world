import { Switch, Route, Router, useLocation } from "wouter";
import { useEffect } from "react";
import { useHashLocation } from "@/lib/hash-location";
import { isWorldDomain, isBlockedOnWorldDomain } from "@/lib/domain";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Order from "@/pages/order";
import Membership from "@/pages/membership";
import Chapters from "@/pages/chapters";
import Events from "@/pages/events";
import Faq from "@/pages/faq";
import Apply from "@/pages/apply";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Checkout from "@/pages/checkout";
import Admin from "@/pages/admin";
import Members from "@/pages/members";
import UniversePage from "@/pages/universe";
import ClubsPage from "@/pages/clubs";
import MemberProfile from "@/pages/member-profile";
import WorldMap from "@/pages/world-map";
import Feed from "@/pages/feed";
import MessagesPage from "@/pages/messages";
import { MessageDockProvider, useMessageDock } from "@/hooks/use-message-dock";
import MessageDock from "@/components/message-dock";
import { useAuth } from "@/hooks/use-auth";

// Pushes the routed content to the right on desktop when the message dock is open.
function DockedShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOpen } = useMessageDock();
  const pad = user && isOpen;
  return (
    <div className={`transition-[padding] duration-300 ease-out ${pad ? "lg:pl-[380px]" : ""}`}>
      {children}
    </div>
  );
}

// On zackerz.world, auth-related routes (login, admin) are unreachable —
// redirect home instead of rendering them.
function DomainGuard({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const blocked = isWorldDomain() && isBlockedOnWorldDomain(location);

  useEffect(() => {
    if (blocked) navigate("/");
  }, [blocked, navigate]);

  if (blocked) return null;
  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order" component={Order} />
      <Route path="/membership" component={Membership} />
      <Route path="/chapters" component={Chapters} />
      <Route path="/events" component={Events} />
      <Route path="/faq" component={Faq} />
      <Route path="/apply" component={Apply} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/admin" component={Admin} />
      <Route path="/members" component={Members} />
      <Route path="/members/:id" component={MemberProfile} />
      <Route path="/universe" component={UniversePage} />
      <Route path="/clubs" component={ClubsPage} />
      <Route path="/network" component={WorldMap} />
      <Route path="/feed" component={Feed} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:partnerId" component={MessagesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MessageDockProvider>
            <TooltipProvider>
              <Toaster />
              <Router hook={useHashLocation}>
                <DomainGuard>
                  <DockedShell>
                    <AppRouter />
                  </DockedShell>
                  <MessageDock />
                </DomainGuard>
              </Router>
            </TooltipProvider>
          </MessageDockProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
