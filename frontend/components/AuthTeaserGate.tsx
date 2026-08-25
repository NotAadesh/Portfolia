"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface AuthTeaserGateProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon?: string;
  features?: string[];
}

export default function AuthTeaserGate({
  children,
  title,
  subtitle,
  features = [],
}: AuthTeaserGateProps) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!user && !isLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [user, isLoading]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Authenticating module...</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full">
      {/* Blurred background preview */}
      <div
        style={{
          filter: "blur(12px)",
          WebkitFilter: "blur(12px)",
          opacity: 0.25,
          pointerEvents: "none",
          userSelect: "none",
          maxHeight: "85vh",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* Fullscreen Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          backgroundColor: "rgba(11, 15, 25, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            position: "relative",
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "36px 32px",
            maxWidth: "440px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Dismiss Button */}
          <Link
            href="/"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "#f1f5f9",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              cursor: "pointer",
            }}
            title="Return to Overview"
          >
            ✕
          </Link>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#2563eb" }}></span>
            Portfolia Institutional Access
          </div>

          <h2
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#0f172a",
              margin: "0 0 8px 0",
              letterSpacing: "-0.4px",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "#64748b",
              lineHeight: "1.5",
              margin: "0 0 20px 0",
            }}
          >
            {subtitle}
          </p>

          {features.length > 0 && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #f1f5f9",
                borderRadius: "10px",
                padding: "12px 14px",
                textAlign: "left",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#94a3b8",
                  marginBottom: "8px",
                }}
              >
                Included Capabilities:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {features.map((feat, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      fontSize: "11px",
                      color: "#334155",
                      fontWeight: "500",
                    }}
                  >
                    <span style={{ color: "#2563eb", fontWeight: "700" }}>•</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <Link
                href="/login"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  backgroundColor: "#0f172a",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Create Account
              </Link>
            </div>

            <p style={{ fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0" }}>
              Instant authorization • No payment required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
