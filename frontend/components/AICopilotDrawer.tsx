"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AICopilotDrawerProps {
  ticker: string;
  companyName: string;
  initialQuestion?: string;
  onClose?: () => void;
}

export default function AICopilotDrawer({
  ticker,
  companyName,
  initialQuestion = "",
  onClose,
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `I am the **Portfolia Financial Copilot**. You can query me on **${companyName} (${ticker})** for capital structure analysis, Dupont ROE factors, margin sensitivities, or competitive moat assessment.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial message whenever ticker or companyName changes
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `I am the **Portfolia Financial Copilot**. You can query me on **${companyName} (${ticker})** for capital structure analysis, Dupont ROE factors, margin sensitivities, or competitive moat assessment.`,
      },
    ]);
  }, [ticker, companyName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuestion) {
      handleSend(initialQuestion);
    }
  }, [initialQuestion]);

  const handleSend = async (questionToSend?: string) => {
    const q = questionToSend || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = { role: "user", content: q.trim() };
    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInput("");
    setLoading(true);

    try {
      const res: any = await apiFetch("/api/v1/ai/copilot-chat", {
        method: "POST",
        body: JSON.stringify({
          ticker,
          company_name: companyName,
          question: q.trim(),
          history: messages,
        }),
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: res.response || "No response received.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message || "Failed to fetch response from Copilot."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    `Growth catalysts for ${companyName}`,
    `DuPont ROE decomposition for ${ticker}`,
    `Margin risk factors for ${companyName}`,
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
      {/* Drawer Header - Solid High Contrast Dark Header */}
      <div
        style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
        className="px-5 py-3.5 flex justify-between items-center border-b border-slate-800"
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Portfolia Logo" className="w-5 h-5 rounded object-cover shadow-xs border border-slate-700" />
          <div>
            <h3 style={{ color: "#f8fafc" }} className="font-bold text-xs uppercase tracking-wider">
              Financial Copilot
            </h3>
            <p style={{ color: "#94a3b8" }} className="text-[11px] mt-0.5">
              Quantitative assistant for <span style={{ color: "#ffffff" }} className="font-semibold">{companyName} ({ticker})</span>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{ color: "#94a3b8" }}
            className="hover:text-white text-xs font-bold transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="bg-slate-50 border-b border-slate-100 p-2 flex gap-1.5 overflow-x-auto text-[11px]">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-medium px-2.5 py-1 rounded transition-all"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm"
              }`}
            >
              <div
                className="whitespace-pre-wrap space-y-1.5"
                dangerouslySetInnerHTML={{
                  __html: m.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(/\n\n/g, "<br/><br/>"),
                }}
              />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
              <span>Synthesizing with Google Gemini model...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 bg-white border-t border-slate-100 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Inquire on ${companyName} (${ticker})...`}
          className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-slate-800 text-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
