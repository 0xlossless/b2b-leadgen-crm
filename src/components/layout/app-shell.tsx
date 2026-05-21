"use client";

import { DesktopSidebar, Header } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-900">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-zinc-900 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
