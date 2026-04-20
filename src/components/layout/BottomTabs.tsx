import { Link, useLocation } from "@tanstack/react-router";
import { Home, Compass, Map, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/plan", label: "Plan", icon: Compass, exact: false },
  { to: "/map", label: "Map", icon: Map, exact: false },
  { to: "/trips", label: "Trips", icon: Briefcase, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function BottomTabs() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-safe"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to) && to !== "/";
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl transition-all",
                    active ? "bg-primary/10 scale-110" : ""
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
