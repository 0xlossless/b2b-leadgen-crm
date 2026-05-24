"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Mail,
  Megaphone,
  CalendarDays,
  Phone,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Outreach", href: "/outreach", icon: Mail },
  { label: "Marketing", href: "/marketing", icon: Megaphone },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Voice Calls", href: "/voice-calls", icon: Phone },
  { label: "Voice Rollout", href: "/voice-agent-rollout", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Scraper", href: "/scraper", icon: Search },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/outreach": "Outreach",
  "/marketing": "Marketing",
  "/calendar": "Calendar",
  "/voice-calls": "Voice Calls",
  "/voice-agent-rollout": "Voice Rollout",
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
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <span className="text-lg font-bold text-foreground">Dealflow CRM</span>
      )}
    </div>
  );
}

// ─── Sign Out Button ─────────────────────────────────────
function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const button = (
    <button
      onClick={handleSignOut}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground w-full",
        collapsed && "justify-center"
      )}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {!collapsed && <span>Sign Out</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">Sign Out</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ─── Theme Toggle ────────────────────────────────────────
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────
export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-border bg-card transition-all duration-200 lg:flex",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-2 space-y-1">
          <SignOutButton collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-muted-foreground hover:text-foreground"
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
          className="lg:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] bg-card p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarBrand collapsed={false} />
        <div className="flex-1 py-2" onClick={() => setOpen(false)}>
          <SidebarNav collapsed={false} />
        </div>
        <div className="border-t border-border p-2">
          <SignOutButton collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "Dealflow CRM";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      <MobileSidebar />

      <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="w-[200px] bg-muted border-border pl-8 text-foreground placeholder:text-muted-foreground lg:w-[280px]"
          />
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background">
              <Avatar>
                <AvatarFallback className="bg-amber-500/20 text-amber-500 text-xs font-semibold cursor-pointer">
                  JG
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">Joseph Galindo</p>
              <p className="text-xs text-muted-foreground">joseph@0xlossless.com</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500 cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
