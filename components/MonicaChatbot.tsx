"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, Minimize2, Maximize2, Bot, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
};

const QUICK_ACTIONS = [
  "Show today's summary",
  "Revenue trends this month",
  "Outlet performance",
  "Order status breakdown",
  "Staff overview",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm **Monica**, your AI management assistant. I'm connected to your live database and can analyze business metrics, outlet performance, staff data, and order insights in real-time! 🧹✨\n\nAsk me anything about your operations — I've got it all organized! *Obviously.*",
  timestamp: new Date(),
};

export default function MonicaChatbot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized]);

  useEffect(() => {
    const handler = () => { setOpen(true); setMinimized(false); };
    window.addEventListener("open-monica", handler);
    return () => window.removeEventListener("open-monica", handler);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.filter((m) => m.id !== "welcome").slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), persona: "monica", history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: data.reply || "Hmm, I couldn't process that. Try again?",
        timestamp: new Date(), model: data.model,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Oops! Something went wrong connecting to my AI brain. 🧠 Try again in a moment!",
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-100 group" aria-label="Open Monica assistant">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
          <div className="relative w-14 h-14 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:shadow-xl group-hover:shadow-emerald-600/40 transition-all duration-300 group-hover:scale-110">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg">
            Ask Monica
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      </button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-100">
        <button onClick={() => setMinimized(false)} className="flex items-center gap-2 bg-linear-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center"><span className="text-sm font-bold">M</span></div>
          <span className="text-sm font-semibold">Monica AI</span>
          <Maximize2 className="w-4 h-4 ml-1 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-100 flex flex-col w-100 h-140 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-linear-to-r from-emerald-600 via-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">Monica <Brain className="w-3.5 h-3.5 text-emerald-200" /></h3>
            <div className="flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5 text-emerald-300" />
              <p className="text-emerald-100 text-xs">AI-Powered · Live Data</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => setMinimized(true)}><Minimize2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1">
                <span className="text-xs font-bold text-emerald-700">M</span>
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"}`}>
              {msg.role === "assistant" ? (
                <div>
                  <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} />
                  {msg.model && (
                    <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center gap-1">
                      <Brain className="w-2.5 h-2.5 text-gray-300" />
                      <span className="text-[10px] text-gray-300">{msg.model === "mistral-7b" ? "Mistral 7B" : msg.model === "zephyr-7b" ? "Zephyr 7B" : "Local AI"}</span>
                    </div>
                  )}
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1">
              <span className="text-xs font-bold text-emerald-700">M</span>
            </div>
            <div className="bg-white text-gray-500 border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-400">Analyzing data</span>
                <div className="flex items-center gap-1 ml-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-white border-t border-gray-100 pt-2">
          {QUICK_ACTIONS.map((action) => (
            <button key={action} onClick={() => sendMessage(action)} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-100 transition-colors">{action}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Monica anything..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-gray-400 transition-all" disabled={isTyping} />
        <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0 disabled:opacity-50"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
