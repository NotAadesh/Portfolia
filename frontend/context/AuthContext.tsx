"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: "user" | "admin" | "superadmin";
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<{ requiresVerification: boolean; email: string; previewOtp?: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  resendOtp: (email: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("financial_ai_token");
    if (savedToken) {
      setToken(savedToken);
      apiFetch<User>("/api/v1/auth/me")
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token invalid or expired
          localStorage.removeItem("financial_ai_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: User }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("financial_ai_token", res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ message: string; email: string; requires_verification: boolean; preview_otp?: string }>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      if (res.preview_otp && typeof window !== "undefined") {
        sessionStorage.setItem("last_preview_otp", res.preview_otp);
      }
      return {
        requiresVerification: res.requires_verification,
        email: res.email,
        previewOtp: res.preview_otp,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: User }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp_code: otpCode }),
      });
      localStorage.setItem("financial_ai_token", res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("last_preview_otp");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    const res = await apiFetch<{ message: string; preview_otp?: string }>("/api/v1/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (res?.preview_otp && typeof window !== "undefined") {
      sessionStorage.setItem("last_preview_otp", res.preview_otp);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem("financial_ai_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
