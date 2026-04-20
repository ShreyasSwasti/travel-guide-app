import { type ReactNode } from "react";
import { BottomTabs } from "./BottomTabs";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl pb-24">{children}</main>
      <BottomTabs />
    </div>
  );
}
