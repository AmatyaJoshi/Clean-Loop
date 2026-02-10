"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  Shirt,
  UserCog,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Footer from "@/components/Footer";
import MonicaChatbot from "@/components/MonicaChatbot";

type AdminNavKey = "dashboard" | "orders" | "customers" | "staff" | "outlets" | "services" | "reports";

export function AdminShell({
  active,
  title,
  subtitle,
  children,
  notificationCount = 0,
  actions,
}: {
  active: AdminNavKey;
  title: string;
  subtitle?: string;
  children: ReactNode;
  notificationCount?: number;
  actions?: ReactNode;
}) {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Admin";
  const userRole = (session?.user as any)?.role ?? "admin";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Administrator",
    outlet_manager: "Outlet Manager",
    staff: "Staff",
    super_admin: "Super Admin",
  };

  const navItems: { key: AdminNavKey; label: string; icon: ReactNode; href: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, href: "/admin-portal/dashboard" },
    { key: "orders", label: "Orders", icon: <Package className="w-4 h-4" />, href: "/admin-portal/orders" },
    { key: "customers", label: "Customers", icon: <Users className="w-4 h-4" />, href: "/admin-portal/customers" },
    { key: "staff", label: "Staff", icon: <UserCog className="w-4 h-4" />, href: "/admin-portal/staff" },
    { key: "outlets", label: "Outlets", icon: <Building2 className="w-4 h-4" />, href: "/admin-portal/outlets" },
    { key: "services", label: "Services", icon: <Shirt className="w-4 h-4" />, href: "/admin-portal/services" },
    { key: "reports", label: "Reports", icon: <BarChart3 className="w-4 h-4" />, href: "/admin-portal/reports" },
  ];

  const navItemClass = (key: AdminNavKey) =>
    key === active
      ? "flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm transition-all"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">CleanLoop</h1>
              <p className="text-xs text-gray-500 leading-tight">Management Portal</p>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search orders, customers, staff..." className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm" />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-medium">
                  {Math.min(notificationCount, 9)}
                </span>
              )}
            </Button>

            <button
              className="relative text-gray-500 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50 group"
              title="Ask Monica"
              onClick={() => {
                // Dispatch custom event to open Monica
                window.dispatchEvent(new CustomEvent("open-monica"));
              }}
            >
              <Bot className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">AI</span>
            </button>

            <div className="h-8 w-px bg-gray-200" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
                    <p className="text-xs text-gray-500 leading-tight">{ROLE_LABELS[userRole] ?? userRole}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/staff/login" })} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-3">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.key} href={item.href} className={navItemClass(item.key)}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-5 max-w-[1440px] mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <main className="p-6 space-y-6 max-w-[1440px] mx-auto">
        {children}
      </main>

      <Footer />

      {/* Monica AI Chatbot */}
      <MonicaChatbot />
    </div>
  );
}
