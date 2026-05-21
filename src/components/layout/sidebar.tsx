"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  Search,
  Building2,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Scraper", href: "/scraper", icon: Search },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/analytics": "Analytics",
  "/scraper": "Scraper",
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-amber-500/15 text-amber-500"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active && "text-amber-500")} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500">
        <Building2 className="h-4 w-4 text-white" />
      </div>
      {!collapsed && (
        <span className="text-lg font-bold text-zinc-100">GS Epoxy CRM</span>
      )}
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────
export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-200 lg:flex",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="border-t border-zinc-800 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-zinc-400 hover:text-zinc-100"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ─── Mobile Sidebar (Sheet) ───────────────────────────────
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-zinc-400 hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] bg-zinc-950 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarBrand collapsed={false} />
        <div className="py-2" onClick={() => setOpen(false)}>
          <SidebarNav collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "GS Epoxy CRM";

  return (
    <header className="flex h-14 items-center gap-4 border-b border-zinc-800 bg-zinc-900 px-4 lg:px-6">
      <MobileSidebar />

      <h1 className="text-lg font-semibold text-zinc-100">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search leads..."
            className="w-[200px] bg-zinc-800 border-zinc-700 pl-8 text-zinc-100 placeholder:text-zinc-500 lg:w-[280px]"
          />
        </div>

        <Avatar>
          <AvatarFallback className="bg-amber-500/20 text-amber-500 text-xs font-semibold">
            JG
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
