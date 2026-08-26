"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function TopNavbar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  const navItems = [
    { label: "Markets", href: "/" },
    { label: "Stock Analysis", href: "/analysis", tag: "AI" },
    { label: "Portfolio Studio", href: "/portfolio", tag: "CORE" },
    { label: "Orders & P&L", href: "/orders", tag: "LIVE" },
    { label: "Saved Portfolios", href: "/my-portfolios" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f19] border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Market Sentinel */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 text-decoration-none">
            <img
              src="/logo.png"
              alt="Portfolia Logo"
              style={{ width: "32px", height: "32px", minWidth: "32px", minHeight: "32px", flexShrink: 0 }}
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-700/50 shrink-0"
            />
            <div>
              <span className="font-bold text-sm text-white tracking-tight uppercase">Portfolia</span>
              <span className="ml-2 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Institutional Terminal
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>NSE LIVE</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">SLSQP SOLVER ACTIVE</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <span>{item.label}</span>
                {item.tag && (
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                    {item.tag}
                  </span>
                )}
              </Link>
            );
          })}

          {user && (user.role === "superadmin" || user.role === "admin") && (
            <Link
              href="/admin"
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                pathname === "/admin"
                  ? "bg-rose-900 text-white"
                  : "text-rose-400 hover:bg-rose-950/40"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-xs text-slate-500 font-mono">Authenticating...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold font-mono">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">
                    {user.full_name || user.email.split("@")[0]}
                  </div>
                  <span className="text-[9px] uppercase font-bold text-blue-400">
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-900 rounded-md transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
        <AuthProvider>
          <TopNavbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}