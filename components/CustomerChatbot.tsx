"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Minimize2, Maximize2, Bot, MessageCircle, ShoppingBag, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const QUICK_ACTIONS = [
  { label: "Services & pricing", icon: ShoppingBag },
  { label: "Track my order", icon: MapPin },
  { label: "Membership benefits", icon: CreditCard },
  { label: "How does pickup work?", icon: MessageCircle },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! 👋 I'm **Monica**, your CleanLoop assistant! I can help you with:\n\n• **Services & pricing** — Explore what we offer\n• **Order tracking** — Check your order status\n• **Memberships** — Learn about savings plans\n• **How it works** — Pickup, cleaning & delivery\n\nWhat can I help you with today?",
  timestamp: new Date(),
};

export default function CustomerChatbot() {
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
        body: JSON.stringify({ message: text.trim(), persona: "customer", history }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: data.reply || "Sorry, I couldn't process that. Please try again!",
        timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Oops! I'm having trouble connecting. Please try again in a moment! 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-100 group" aria-label="Chat with Monica">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
          <div className="relative w-14 h-14 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:shadow-xl group-hover:shadow-emerald-600/40 transition-all duration-300 group-hover:scale-110">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">?</span>
          </div>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg">
            Need help? Chat now!
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
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center"><MessageCircle className="w-4 h-4" /></div>
          <span className="text-sm font-semibold">Monica</span>
          <Maximize2 className="w-4 h-4 ml-1 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-100 flex flex-col w-92 h-130 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Monica</h3>
            <p className="text-emerald-100 text-xs">Here to help! 💚</p>
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
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"}`}>
              {msg.role === "assistant" ? (
                <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>").replace(/• /g, "• ") }} />
              ) : msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1">
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="bg-white text-gray-500 border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Monica is typing</span>
                <div className="flex items-center gap-1">
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
        <div className="px-4 pb-2 bg-white border-t border-gray-100 pt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.label} onClick={() => sendMessage(action.label)} className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-100 transition-colors text-left">
                <action.icon className="w-3.5 h-3.5 shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-gray-400 transition-all" disabled={isTyping} />
        <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0 disabled:opacity-50"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
