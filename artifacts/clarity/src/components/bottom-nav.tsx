import { Link, useLocation } from "wouter";
import { Inbox, Sun, Folder, Calendar, CheckCircle, Settings } from "lucide-react";

// Six always-visible tabs matching the Clarity nav spec:
// Inbox · Today · Projects · Upcoming · Review · Settings
const NAV_ITEMS = [
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  { href: "/today", icon: Sun, label: "Today" },
  { href: "/projects", icon: Folder, label: "Projects" },
  { href: "/upcoming", icon: Calendar, label: "Upcoming" },
  { href: "/review", icon: CheckCircle, label: "Review" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="absolute bottom-0 w-full bg-background/95 backdrop-blur-xl border-t border-border flex justify-around items-center h-[80px] px-1 z-50 pb-safe">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = location === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-[64px] rounded-xl transition-all ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 transition-all ${isActive ? "scale-110" : ""}`}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span className={`text-[10px] font-semibold tracking-wide leading-none ${isActive ? "font-bold" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
