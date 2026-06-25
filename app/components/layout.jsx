"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Users,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, testid: "nav-dashboard" },
  { href: "/patients", label: "Patients", icon: Users, testid: "nav-patients" },
  { href: "/audit", label: "Audit Logs", icon: ShieldCheck, testid: "nav-audit" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings" },
  { href: "/users", label: "Users", icon: UsersRound, testid: "nav-users", adminOnly: true, }
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-60 border-r border-border flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="px-6 py-6 border-b border-border">
            <div className="font-display text-xl font-semibold tracking-tight">
              DENTOVAULT
            </div>
            <div className="label-mono mt-1">research vault</div>
          </div>

          <nav className="px-3 py-4 space-y-1">
            {navItems.filter((item) => !item.adminOnly || user?.role === "admin")
              .map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={item.testid}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="text-sm font-medium"
                data-testid="sidebar-username"
              >
                {user?.username}
              </div>
              <div className="label-mono text-[10px]">
                {user?.role || "researcher"}
              </div>
            </div>

            <ThemeToggle />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-display text-base font-semibold">
            DENTOVAULT
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="logout-button-mobile"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex border-t border-border overflow-x-auto">
          {navItems.filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 min-w-[88px] text-center py-2.5 text-xs font-mono uppercase tracking-wider ${isActive
                      ? "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </header>

      <main className="flex-1 md:ml-0 pt-24 md:pt-0">
        {children}
      </main>
    </div>
  );
}