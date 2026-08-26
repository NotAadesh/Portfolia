"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  const [previewOtp, setPreviewOtp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("last_preview_otp");
      if (stored) {
        setPreviewOtp(stored);
        if (!otpCode) setOtpCode(stored);
      }
    }
  }, []);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otpCode) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await verifyOtp(email, otpCode);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError("");
    try {
      const res: any = await resendOtp(email);
      if (res?.preview_otp) {
        setPreviewOtp(res.preview_otp);
        setOtpCode(res.preview_otp);
      }
      setMessage("A fresh verification code has been dispatched.");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <img
            src="/logo.png"
            alt="Portfolia Logo"
            style={{ width: "48px", height: "48px" }}
            className="w-12 h-12 rounded-xl object-cover shadow-sm mx-auto mb-1 border border-slate-100"
          />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Verify Account</h1>
          <p className="text-xs text-slate-500">
            Enter the 6-digit passcode sent to
          </p>
          <p className="font-semibold text-slate-800 text-xs font-mono">{email || "your email"}</p>
        </div>

        {previewOtp && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center animate-in fade-in duration-200">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
              Auto-Detected Verification Code
            </span>
            <div className="text-xl font-bold font-mono tracking-widest text-blue-700 mt-1">
              {previewOtp}
            </div>
            <p className="text-[10px] text-blue-600 mt-1">
              Auto-filled below for instant 1-click account verification.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
            {message}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          {!searchParams.get("email") && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firm.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-slate-800 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
              6-Digit Passcode
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              className="w-full text-center text-xl tracking-[6px] font-mono py-2.5 rounded-lg border border-slate-200 focus:border-slate-800 outline-none font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length < 6}
            className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 space-y-2">
          <div>
            Didn't receive the email?{" "}
            <button
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="text-slate-900 font-semibold hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
            </button>
          </div>

          <div>
            <Link href="/login" className="text-slate-400 hover:text-slate-600 text-xs">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading verification...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
