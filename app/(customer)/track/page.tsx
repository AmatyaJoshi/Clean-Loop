"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, Search, Package, CheckCircle2, Clock, Truck, Loader2, ArrowLeft,
  MapPin, Phone, Mail, ShieldCheck, Timer, CircleDot, PackageCheck, Shirt,
  ChevronRight, AlertCircle, Calendar, ClipboardList, Star,
} from "lucide-react";
import { getOrderStatusColor } from "@/lib/utils";
import Footer from "@/components/Footer";

/* ─── Status pipeline (linear) ─── */
const STATUS_PIPELINE = [
  { key: "pending", label: "Order Placed", icon: ClipboardList },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "picked_up", label: "Picked Up", icon: Package },
  { key: "in_progress", label: "In Progress", icon: Shirt },
  { key: "quality_check", label: "Quality Check", icon: ShieldCheck },
  { key: "ready", label: "Ready", icon: PackageCheck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Star },
];

function getStatusIndex(status: string) {
  if (status === "cancelled") return -1;
  const idx = STATUS_PIPELINE.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState("");
  const [tracking, setTracking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const orderParam = searchParams.get("order");
    if (orderParam) {
      setOrderNumber(orderParam);
      trackOrder(orderParam);
    }
  }, [searchParams]);

  const trackOrder = async (num: string) => {
    if (!num.trim()) return;
    setIsLoading(true);
    setError("");
    setTracking(null);
    try {
      const res = await fetch(`/api/tracking/${num.trim()}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || "Order not found. Please check the order number and try again.");
      else setTracking(data.tracking);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = (e: React.FormEvent) => { e.preventDefault(); trackOrder(orderNumber); };
  const currentIdx = tracking ? getStatusIndex(tracking.status) : -1;
  const isCancelled = tracking?.status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ─── Header ─── */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-emerald-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">CleanLoop</span>
            </Link>
          </div>
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors">
            Sign In
          </Link>
        </div>
      </header>

      {/* ─── Hero Search ─── */}
      <section className="bg-linear-to-br from-emerald-600 via-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-5 right-20 w-48 h-48 bg-teal-300 rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-6 py-14 md:py-20 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-emerald-50 mb-5">
              <MapPin className="w-3.5 h-3.5" /> Real-time tracking
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">Track Your Order</h1>
            <p className="text-emerald-100 text-lg mb-8">Enter your order number to see exactly where your laundry is</p>

            <form onSubmit={handleTrack} className="max-w-xl mx-auto">
              <div className="flex bg-white rounded-2xl shadow-2xl shadow-black/15 overflow-hidden">
                <div className="flex-1 flex items-center px-5">
                  <Search className="w-5 h-5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none text-base"
                    placeholder="ORD-2026-XXXXXX"
                    suppressHydrationWarning
                  />
                </div>
                <button type="submit" disabled={isLoading} suppressHydrationWarning className="bg-gray-900 hover:bg-black text-white font-semibold px-8 py-4 transition-colors disabled:bg-gray-300 flex items-center gap-2 shrink-0">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Track <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>

            {error && (
              <div className="max-w-xl mx-auto mt-4 bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-xl px-5 py-3 flex items-center gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-200 shrink-0" />
                <p className="text-sm text-white">{error}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <main className="flex-1 container mx-auto px-6 py-10">
        {!tracking && !isLoading && !error && (
          /* ─── How It Works (empty state) ─── */
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-xl font-semibold text-gray-800 mb-8">How Order Tracking Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: ClipboardList, step: "1", title: "Place Order", desc: "Book a pickup online or through the app" },
                { icon: Package, step: "2", title: "Pickup", desc: "Our team picks up your laundry from your door" },
                { icon: Shirt, step: "3", title: "Processing", desc: "Expert cleaning with quality checks at every step" },
                { icon: Truck, step: "4", title: "Delivery", desc: "Fresh, folded clothes delivered back to you" },
              ].map((s) => (
                <div key={s.step} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors relative">
                    <s.icon className="w-7 h-7 text-emerald-600" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{s.step}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Status Reference */}
            <div className="mt-14 bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-5 text-center">Order Status Reference</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {STATUS_PIPELINE.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                      <s.icon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{s.label}</span>
                    {i < STATUS_PIPELINE.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Your order goes through each stage above from left to right</p>
            </div>

            {/* Tips */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Timer, title: "Average Processing", desc: "Most orders are processed within 24-48 hours" },
                { icon: ShieldCheck, title: "Quality Guaranteed", desc: "Every item goes through a quality check before delivery" },
                { icon: Phone, title: "Need Help?", desc: "Contact your outlet directly from the tracking page" },
              ].map((t) => (
                <div key={t.title} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <t.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Loading ─── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 animate-pulse">Fetching order details...</p>
            </div>
          </div>
        )}

        {/* ─── Tracking Results ─── */}
        {tracking && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Header Card */}
            <div className={`rounded-2xl p-6 md:p-8 border ${isCancelled ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Order Number</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{tracking.orderNumber}</h2>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Placed {formatDate(tracking.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${isCancelled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {isCancelled ? <AlertCircle className="w-4 h-4" /> : <CircleDot className="w-4 h-4" />}
                    {tracking.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                  {tracking.expectedCompletionAt && !isCancelled && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Expected by {formatDate(tracking.expectedCompletionAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Status Progress Pipeline ─── */}
            {!isCancelled && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
                <h3 className="text-base font-semibold text-gray-800 mb-6">Order Progress</h3>

                {/* Desktop Pipeline */}
                <div className="hidden md:block">
                  <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 z-0" />
                    <div className="absolute left-0 top-5 h-0.5 bg-emerald-500 z-0 transition-all duration-700" style={{ width: `${(currentIdx / (STATUS_PIPELINE.length - 1)) * 100}%` }} />

                    {STATUS_PIPELINE.map((s, i) => {
                      const done = i <= currentIdx;
                      const active = i === currentIdx;
                      return (
                        <div key={s.key} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / STATUS_PIPELINE.length}%` }}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                            active ? "bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-100 scale-110" :
                            done ? "bg-emerald-600 border-emerald-600 text-white" :
                            "bg-white border-gray-300 text-gray-400"
                          }`}>
                            <s.icon className="w-4.5 h-4.5" />
                          </div>
                          <span className={`text-xs mt-2 font-medium text-center leading-tight ${active ? "text-emerald-700" : done ? "text-emerald-600" : "text-gray-400"}`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Pipeline (vertical) */}
                <div className="md:hidden space-y-0">
                  {STATUS_PIPELINE.map((s, i) => {
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={s.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                            active ? "bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-100" :
                            done ? "bg-emerald-600 border-emerald-600 text-white" :
                            "bg-white border-gray-300 text-gray-400"
                          }`}>
                            <s.icon className="w-3.5 h-3.5" />
                          </div>
                          {i < STATUS_PIPELINE.length - 1 && (
                            <div className={`w-0.5 h-8 ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                          )}
                        </div>
                        <div className="pt-1">
                          <span className={`text-sm font-medium ${active ? "text-emerald-700" : done ? "text-emerald-600" : "text-gray-400"}`}>{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled Banner */}
            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Order Cancelled</h3>
                  <p className="text-sm text-red-600">This order has been cancelled. Contact us if you need assistance.</p>
                </div>
              </div>
            )}

            {/* ─── Key Dates ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pickup Scheduled", value: tracking.pickupScheduledAt, icon: Calendar },
                { label: "Pickup Completed", value: tracking.pickupCompletedAt, icon: Package },
                { label: "Delivery Scheduled", value: tracking.deliveryScheduledAt, icon: Truck },
                { label: "Delivered At", value: tracking.deliveryCompletedAt, icon: CheckCircle2 },
              ].map((d) => (
                <div key={d.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <d.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">{d.label}</span>
                  </div>
                  <p className={`text-sm font-semibold ${d.value ? "text-gray-900" : "text-gray-300"}`}>
                    {d.value ? formatDate(d.value) : "Pending"}
                  </p>
                </div>
              ))}
            </div>

            {/* ─── Order Items ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-800">Order Items</h3>
                <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{tracking.items.length} items</span>
              </div>
              <div className="divide-y divide-gray-50">
                {tracking.items.map((item: any, i: number) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Shirt className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.itemName}</p>
                        <p className="text-xs text-gray-500">{item.service}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 font-medium">×{item.quantity}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getOrderStatusColor(item.status)}`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Outlet Info ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-800">Service Outlet</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{tracking.outlet.name}</p>
                  {tracking.outlet.contactDetails && (() => {
                    const details = typeof tracking.outlet.contactDetails === "string" ? JSON.parse(tracking.outlet.contactDetails) : tracking.outlet.contactDetails;
                    return (
                      <div className="space-y-0.5 mt-0.5">
                        {details.phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            +{details.phone}
                          </p>
                        )}
                        {details.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {details.email}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ─── Status History ─── */}
            {tracking.statusHistory && Array.isArray(tracking.statusHistory) && tracking.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800">Status History</h3>
                </div>
                <div className="space-y-0">
                  {tracking.statusHistory.map((h: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${i === 0 ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-gray-300"}`} />
                        {i < tracking.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className="pb-5 flex-1">
                        <p className={`text-sm font-semibold capitalize ${i === 0 ? "text-emerald-700" : "text-gray-700"}`}>
                          {h.status.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.timestamp)}</p>
                        {h.note && <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Track Another */}
            <div className="text-center pt-4 pb-2">
              <button onClick={() => { setTracking(null); setOrderNumber(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                ← Track another order
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
