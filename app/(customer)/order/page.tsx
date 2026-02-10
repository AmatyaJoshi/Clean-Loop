"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

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

const GARMENT_TYPES = [
  "Shirt", "T-Shirt", "Jeans", "Trousers", "Kurta", "Saree",
  "Suit", "Jacket", "Dress", "Skirt", "Bedsheet", "Curtain",
  "Towel", "Blanket",
];

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

  // Form state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedGarment, setSelectedGarment] = useState(GARMENT_TYPES[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isExpress, setIsExpress] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

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
  const [showPaymentStep, setShowPaymentStep] = useState(false);

  // Load services from DB
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => {
        const svcs = d.services ?? [];
        setServices(svcs);
        // Preselect service from URL or first service
        const preselected = preselectedServiceId
          ? svcs.find((s: Service) => s.id === preselectedServiceId)
          : null;
        setSelectedService(preselected ?? svcs[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, [preselectedServiceId]);

  const addToCart = () => {
    if (!selectedService) return;
    const key = `${selectedService.id}-${selectedGarment}-${isExpress}`;
    const existing = cart.findIndex(
      (item) => item.service.id === selectedService.id && item.itemName === selectedGarment && item.isExpress === isExpress
    );

    if (existing >= 0) {
      setCart(cart.map((item, i) => (i === existing ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { service: selectedService, itemName: selectedGarment, quantity: 1, isExpress }]);
    }
  };

  const updateQuantity = (index: number, change: number) => {
    const updated = [...cart];
    updated[index].quantity += change;
    if (updated[index].quantity <= 0) updated.splice(index, 1);
    setCart(updated);
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getItemPrice = (item: CartItem) => {
    const base = Number(item.service.basePrice);
    return item.isExpress ? base * Number(item.service.expressMultiplier) : base;
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0),
    [cart]
  );
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

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
        itemName: `${item.itemName}${item.isExpress ? " (Express)" : ""}`,
        quantity: item.quantity,
        unitPrice: getItemPrice(item),
      }));

      // Determine priority
      const hasExpress = cart.some((item) => item.isExpress);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          pickupAddress: addressObj,
          deliveryAddress: addressObj, // Same address for pickup and delivery
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

      // Create payment record
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
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-semibold">{cart.length} items</span>
            </div>
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
        {!showPaymentStep ? (
          /* ─── STEP 1: Build Order ─── */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Order Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Selection */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Select Service</h2>
                {services.length === 0 ? (
                  <p className="text-gray-500">No services available</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service); setIsExpress(false); }}
                        className={`p-4 border-2 rounded-lg text-left transition ${
                          selectedService?.id === service.id
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-lg">{service.name}</div>
                            <div className="text-gray-600">₹{Number(service.basePrice)}/{service.unit}</div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {service.processingTimeHours}h processing
                            </div>
                          </div>
                          {service.isExpressAvailable && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Express
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Items */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Add Items</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Garment Type</label>
                    <select
                      value={selectedGarment}
                      onChange={(e) => setSelectedGarment(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {GARMENT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {selectedService?.isExpressAvailable && (
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-50 transition">
                      <input
                        type="checkbox"
                        checked={isExpress}
                        onChange={(e) => setIsExpress(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-medium text-amber-700 flex items-center gap-1">
                          <Zap className="w-4 h-4" /> Express Service
                        </span>
                        <span className="text-xs text-gray-500">
                          {Number(selectedService.expressMultiplier)}x price · Faster processing
                        </span>
                      </div>
                    </label>
                  )}

                  <button
                    onClick={addToCart}
                    disabled={!selectedService}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> Add to Cart
                  </button>
                </div>
              </div>

              {/* Pickup Details */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Pickup & Delivery Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="flex text-sm font-medium mb-2 items-center gap-2">
                      <MapPin className="w-4 h-4" /> Street Address *
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/Flat no., Street, Landmark"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">City *</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">State *</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Maharashtra"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">PIN Code *</label>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="400001"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex text-sm font-medium mb-2 items-center gap-2">
                        <Calendar className="w-4 h-4" /> Pickup Date *
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="flex text-sm font-medium mb-2 items-center gap-2">
                        <Clock className="w-4 h-4" /> Pickup Time *
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Select time slot</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot.value} value={slot.value}>{slot.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Special Instructions</label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Any special handling instructions..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in cart</p>
                ) : (
                  <div className="space-y-4 mb-6">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-4">
                        <div className="flex-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-gray-600">
                            {item.service.name}
                            {item.isExpress && (
                              <span className="ml-1 text-amber-600 font-medium">⚡ Express</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            ₹{getItemPrice(item)} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (18%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-semibold">FREE</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                {cart.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Payment Method</p>
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === "cod" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="font-medium text-sm">Cash on Delivery</span>
                        <p className="text-xs text-gray-500">Pay when your clothes are delivered</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${paymentMethod === "upi" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <span className="font-medium text-sm">UPI / Online Payment</span>
                        <p className="text-xs text-gray-500">Pay via UPI, cards, or netbanking</p>
                      </div>
                    </label>
                  </div>
                )}

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={!canSubmit || submitting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/30"
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
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">🎉 First order discount: 20% off!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
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
