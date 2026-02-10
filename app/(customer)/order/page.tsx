"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Zap,
  Shirt,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { CityDisplay } from "@/components/CityPicker";

type Service = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  basePrice: number;
  processingTimeHours: number;
  unit: string;
  isExpressAvailable: boolean;
  expressMultiplier: number;
  category: { id: string; name: string };
};

type CartItem = {
  service: Service;
  itemName: string;
  quantity: number;
  isExpress: boolean;
};

const TIME_SLOTS = [
  { value: "9-11", label: "9:00 AM – 11:00 AM" },
  { value: "11-1", label: "11:00 AM – 1:00 PM" },
  { value: "1-3", label: "1:00 PM – 3:00 PM" },
  { value: "3-5", label: "3:00 PM – 5:00 PM" },
  { value: "5-7", label: "5:00 PM – 7:00 PM" },
];

function OrderContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get("service");

  // Services from DB
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Cart state — keyed by serviceId (normal) and serviceId-express (express)
  const [cart, setCart] = useState<CartItem[]>([]);
  // Track which services have express toggled on
  const [expressToggles, setExpressToggles] = useState<Set<string>>(new Set());

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Auto-fill city from localStorage (set by CityPicker)
  useEffect(() => {
    const savedCity = localStorage.getItem("cleanloop-city");
    if (savedCity && !city) setCity(savedCity);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    totalAmount: number;
    orderId: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  // Load services from DB
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => {
        const svcs = d.services ?? [];
        setServices(svcs);
        // Auto-add preselected service to cart
        if (preselectedServiceId) {
          const preselected = svcs.find((s: Service) => s.id === preselectedServiceId);
          if (preselected) {
            setCart([{ service: preselected, itemName: preselected.name, quantity: 1, isExpress: false }]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, [preselectedServiceId]);

  // Cart helpers — Zomato style
  const getCartItem = useCallback((serviceId: string, express: boolean) => {
    return cart.find((item) => item.service.id === serviceId && item.isExpress === express);
  }, [cart]);

  const getServiceQty = useCallback((serviceId: string) => {
    return cart.filter((item) => item.service.id === serviceId).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const addServiceToCart = useCallback((service: Service, express: boolean) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.service.id === service.id && item.isExpress === express);
      if (idx >= 0) {
        return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
      }
      const label = express ? `${service.name} (Express)` : service.name;
      return [...prev, { service, itemName: label, quantity: 1, isExpress: express }];
    });
  }, []);

  const decrementService = useCallback((serviceId: string, express: boolean) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.service.id === serviceId && item.isExpress === express);
      if (idx < 0) return prev;
      if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity - 1 } : item);
    });
  }, []);

  const toggleExpress = useCallback((serviceId: string) => {
    setExpressToggles((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
        // Move any express cart items to normal
        setCart((c) => c.map((item) =>
          item.service.id === serviceId && item.isExpress
            ? { ...item, isExpress: false, itemName: item.service.name }
            : item
        ));
      } else {
        next.add(serviceId);
        // Move any normal cart items to express
        setCart((c) => c.map((item) =>
          item.service.id === serviceId && !item.isExpress
            ? { ...item, isExpress: true, itemName: `${item.service.name} (Express)` }
            : item
        ));
      }
      return next;
    });
  }, []);

  const removeCartItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getItemPrice = (item: CartItem) => {
    const base = Number(item.service.basePrice);
    return item.isExpress ? base * Number(item.service.expressMultiplier) : base;
  };

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0),
    [cart]
  );
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  // Group services by category
  const categoryGroups = useMemo(() => {
    const grouped = services.reduce<Record<string, { category: { id: string; name: string }; services: Service[] }>>((acc, s) => {
      if (!acc[s.category.id]) acc[s.category.id] = { category: s.category, services: [] };
      acc[s.category.id].services.push(s);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [services]);

  const addressValid = address.trim() && city.trim() && state.trim() && zipCode.trim();
  const scheduleValid = pickupDate && pickupTime;
  const canSubmit = cart.length > 0 && addressValid && scheduleValid;

  const handleSubmitOrder = async () => {
    if (!session?.user) {
      router.push("/login?callbackUrl=/order");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const addressObj = { street: address, city, state, zipCode };
      const items = cart.map((item) => ({
        serviceId: item.service.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: getItemPrice(item),
      }));

      const hasExpress = cart.some((item) => item.isExpress);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          pickupAddress: addressObj,
          deliveryAddress: addressObj,
          pickupScheduledAt: new Date(`${pickupDate}T09:00:00`).toISOString(),
          priority: hasExpress ? "express" : "normal",
          specialInstructions: specialInstructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Failed to place order");
        return;
      }

      const data = await res.json();
      const order = data.order;

      if (paymentMethod === "cod") {
        await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod: "cod",
          }),
        });
      }

      setOrderSuccess({
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        orderId: order.id,
      });
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Order Success Screen ───
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-10 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">Your laundry order has been placed successfully.</p>

          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Order Number</span>
              <span className="text-sm font-bold text-gray-900">{orderSuccess.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Amount</span>
              <span className="text-sm font-bold text-gray-900">₹{orderSuccess.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Payment</span>
              <span className="text-sm font-medium text-amber-600">
                {paymentMethod === "cod" ? "Cash on Delivery" : "UPI Payment"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-sm font-medium text-emerald-600">Pending Confirmation</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href={`/track`}>Track Your Order</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              <Link href="/my-orders">View My Orders</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-gray-600">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading Screen ───
  if (loadingServices) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-emerald-600" />
              <h1 className="text-2xl font-bold text-gray-900">CleanLoop</h1>
            </Link>
            <div className="hidden md:block border-l border-gray-200 pl-3">
              <CityDisplay />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {totalItems > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{totalItems}</span>
              </div>
            )}
            {authStatus === "authenticated" ? (
              <span className="text-sm text-emerald-600 font-medium">{session?.user?.name ?? session?.user?.email}</span>
            ) : (
              <Link href="/login?callbackUrl=/order" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Service Cards (Zomato style) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Pick your services</h2>
              <p className="text-gray-500">Tap a card to add, use +/- to adjust quantity</p>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-20">
                <Shirt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No services available</p>
              </div>
            ) : (
              categoryGroups.map(({ category, services: catServices }) => (
                <div key={category.id}>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                    {category.name}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {catServices.map((service) => {
                      const isExpr = expressToggles.has(service.id);
                      const qty = getServiceQty(service.id);
                      const displayPrice = isExpr
                        ? Number(service.basePrice) * Number(service.expressMultiplier)
                        : Number(service.basePrice);
                      const cartItem = getCartItem(service.id, isExpr);

                      return (
                        <div
                          key={service.id}
                          className={`relative bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 overflow-hidden ${
                            qty > 0
                              ? "border-emerald-500 shadow-emerald-100 ring-1 ring-emerald-500/20"
                              : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                          }`}
                        >
                          {/* Card content */}
                          <div className="p-5">
                            {/* Top row: icon + info */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                  <Shirt className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-gray-900 text-base leading-tight">{service.name}</h4>
                                  {service.description && (
                                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{service.description}</p>
                                  )}
                                </div>
                              </div>
                              {/* Quantity badge when in cart */}
                              {qty > 0 && (
                                <div className="bg-emerald-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                                  {qty}
                                </div>
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {service.processingTimeHours}h
                              </span>
                              <span>per {service.unit}</span>
                            </div>

                            {/* Price + ADD / counter row */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl font-bold text-gray-900">₹{displayPrice}</span>
                                {isExpr && (
                                  <span className="text-xs text-gray-400 line-through ml-1.5">
                                    ₹{Number(service.basePrice)}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 ml-1">/{service.unit}</span>
                              </div>

                              {/* ADD button or +/- counter */}
                              {qty === 0 ? (
                                <button
                                  onClick={() => addServiceToCart(service, isExpr)}
                                  className="px-6 py-2 text-sm font-bold text-emerald-600 border-2 border-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all duration-200 active:scale-95"
                                >
                                  ADD
                                </button>
                              ) : (
                                <div className="flex items-center bg-emerald-600 rounded-xl overflow-hidden shadow-lg shadow-emerald-600/30">
                                  <button
                                    onClick={() => decrementService(service.id, isExpr)}
                                    className="px-3 py-2 text-white hover:bg-emerald-700 transition-colors active:scale-90"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="px-3 py-2 text-white font-bold text-sm min-w-[28px] text-center">
                                    {cartItem?.quantity ?? qty}
                                  </span>
                                  <button
                                    onClick={() => addServiceToCart(service, isExpr)}
                                    className="px-3 py-2 text-white hover:bg-emerald-700 transition-colors active:scale-90"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Express toggle */}
                            {service.isExpressAvailable && (
                              <button
                                onClick={() => toggleExpress(service.id)}
                                className={`mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all duration-200 ${
                                  isExpr
                                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-amber-300 hover:text-amber-600"
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5" />
                                Express {isExpr ? "ON" : "OFF"} ({Number(service.expressMultiplier)}x)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Pickup & Delivery form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-5 text-gray-900">Pickup & Delivery</h2>
              <div className="space-y-4">
                <div>
                  <label className="flex text-sm font-medium mb-2 items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Street Address *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat no., Street, Landmark"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">State *</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">PIN Code *</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="400001"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex text-sm font-medium mb-2 items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-emerald-600" /> Pickup Date *
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex text-sm font-medium mb-2 items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-emerald-600" /> Pickup Time *
                    </label>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select time slot</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Special Instructions</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special handling instructions..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Summary (sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-24 p-6">
              <h2 className="text-xl font-bold mb-5 text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Your Cart
                {totalItems > 0 && (
                  <span className="ml-auto text-sm font-medium text-gray-500">{totalItems} item{totalItems > 1 ? "s" : ""}</span>
                )}
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Your cart is empty</p>
                  <p className="text-gray-300 text-xs mt-1">Tap ADD on a service to get started</p>
                </div>
              ) : null}

              {/* Totals + Payment + Button */}
              <div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (18%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery</span>
                    <span className="text-emerald-600 font-semibold">FREE</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                {cart.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition text-sm ${paymentMethod === "cod" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="font-medium">Cash on Delivery</span>
                        <p className="text-xs text-gray-400">Pay when delivered</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition text-sm ${paymentMethod === "upi" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="font-medium">UPI / Online</span>
                        <p className="text-xs text-gray-400">UPI, cards, netbanking</p>
                      </div>
                    </label>
                  </div>
                )}

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={!canSubmit || submitting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/30 text-sm"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Placing Order...
                    </span>
                  ) : authStatus !== "authenticated" ? (
                    "Sign In & Place Order"
                  ) : (
                    `Place Order · ₹${total.toFixed(2)}`
                  )}
                </button>

                {cart.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-center">
                    <p className="text-xs text-emerald-700 font-semibold">First order? Get 20% off!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky cart bar */}
        {totalItems > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{totalItems} item{totalItems > 1 ? "s" : ""}</p>
                <p className="text-lg font-bold text-gray-900">₹{total.toFixed(2)}</p>
              </div>
              <button
                onClick={() => {
                  // Scroll to checkout section
                  document.querySelector(".sticky.top-24")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                View Cart
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
