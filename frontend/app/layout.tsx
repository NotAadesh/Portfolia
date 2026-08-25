"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  const navItems = [
    { label: "Overview", href: "/", badge: "" },
    { label: "Goal Onboarding", href: "/onboarding", badge: "NEW" },
    { label: "Import Demat", href: "/import", badge: "FAST" },
    { label: "Financial Analysis", href: "/analysis", badge: "" },
    { label: "Portfolio Maker", href: "/portfolio", badge: "" },
    { label: "Monte Carlo Sim", href: "/simulation", badge: "" },
    { label: "Multi-Compare", href: "/compare", badge: "PEER" },
    { label: "Tax Rebalance", href: "/rebalance", badge: "TAX" },
    { label: "Broker Execution", href: "/execute", badge: "AUTO" },
    { label: "My Portfolios", href: "/my-portfolios", badge: "" },
  ];

  return (
    <div
      style={{
        width: "250px",
        backgroundColor: "#0b0f19",
        color: "#f3f4f6",
        padding: "24px 18px",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRight: "1px solid #1e293b",
      }}
    >
      <div>
        {/* Brand Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "13px",
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              P
            </div>
            <div>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  letterSpacing: "-0.4px",
                  color: "#ffffff",
                }}
              >
                Portfolia
              </span>
              <p
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  margin: "1px 0 0 0",
                  letterSpacing: "0.2px",
                  textTransform: "uppercase",
                  fontWeight: "600",
                }}
              >
                Quantitative Terminal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "9px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "400",
                  backgroundColor: isActive ? "#1e293b" : "transparent",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: "700",
                        color: item.badge === "NEW" ? "#38bdf8" : item.badge === "FAST" ? "#34d399" : "#fbbf24",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        padding: "1px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                {!user &&
                  (item.href === "/portfolio" ||
                    item.href === "/simulation" ||
                    item.href === "/my-portfolios" ||
                    item.href === "/rebalance" ||
                    item.href === "/execute") && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: "600",
                        color: "#64748b",
                        backgroundColor: "#1e293b",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        letterSpacing: "0.4px",
                      }}
                    >
                      LOCK
                    </span>
                  )}
              </Link>
            );
          })}

          {/* Superadmin Panel Link */}
          {user && (user.role === "superadmin" || user.role === "admin") && (
            <Link
              href="/admin"
              style={{
                marginTop: "8px",
                padding: "9px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: pathname === "/admin" ? "700" : "500",
                backgroundColor: pathname === "/admin" ? "#991b1b" : "rgba(153, 27, 27, 0.15)",
                color: pathname === "/admin" ? "#ffffff" : "#fca5a5",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid rgba(153, 27, 27, 0.3)",
              }}
            >
              <span>Administration</span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  backgroundColor: "#dc2626",
                  color: "white",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                }}
              >
                Root
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* User Session Footer */}
      <div style={{ borderTop: "1px solid #1e293b", paddingTop: "14px", marginTop: "20px" }}>
        {isLoading ? (
          <div style={{ fontSize: "11px", color: "#64748b" }}>Authenticating...</div>
        ) : user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#cbd5e1",
                }}
              >
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#f1f5f9",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {user.full_name || user.email.split("@")[0]}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      backgroundColor: user.role === "superadmin" ? "#dc2626" : "#2563eb",
                      color: "white",
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {user.role}
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>Verified</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "500",
                backgroundColor: "transparent",
                color: "#94a3b8",
                border: "1px solid #1e293b",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Link
              href="/login"
              style={{
                display: "block",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: "#ffffff",
                color: "#0b0f19",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              style={{
                display: "block",
                padding: "7px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#94a3b8",
                textAlign: "center",
                textDecoration: "none",
                border: "1px solid #1e293b",
              }}
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <AuthProvider>
          <SidebarContent />
          <div
            style={{
              flex: 1,
              padding: "28px 36px",
              backgroundColor: "#f8fafc",
              minHeight: "100vh",
              overflowY: "auto",
            }}
          >
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}