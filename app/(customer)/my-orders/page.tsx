"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Package,
  Sparkles,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

type OrderItem = {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  service: { name: string };
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  totalAmount: number;
  createdAt: string;
  pickupScheduledAt: string | null;
  deliveryCompletedAt: string | null;
  items: OrderItem[];
  outlet: { name: string };
  payments: { status: string; paymentMethod: string }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="w-4 h-4" /> },
  picked_up: { label: "Picked Up", color: "bg-indigo-100 text-indigo-800", icon: <Truck className="w-4 h-4" /> },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800", icon: <Package className="w-4 h-4" /> },
  quality_check: { label: "Quality Check", color: "bg-orange-100 text-orange-800", icon: <CheckCircle className="w-4 h-4" /> },
  ready: { label: "Ready", color: "bg-cyan-100 text-cyan-800", icon: <Package className="w-4 h-4" /> },
  out_for_delivery: { label: "Out for Delivery", color: "bg-teal-100 text-teal-800", icon: <Truck className="w-4 h-4" /> },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: <XCircle className="w-4 h-4" /> },
};

export default function MyOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/my-orders");
      return;
    }
    if (authStatus !== "authenticated") return;

    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus, router]);

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
      }
    } finally {
      setCancellingId(null);
    }
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const pastOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  if (authStatus === "loading" || (authStatus === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">CleanLoop</h1>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/order" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-all duration-300">
              + New Order
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h2>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Place your first laundry order today!</p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/order">Schedule Pickup</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Active Orders ({activeOrders.length})
                </h3>
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onCancel={handleCancel} cancellingId={cancellingId} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Past Orders ({pastOrders.length})</h3>
                <div className="space-y-4">
                  {pastOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onCancel={handleCancel} cancellingId={cancellingId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  cancellingId,
}: {
  order: Order;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  const statusInfo = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const payment = order.payments[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="font-bold text-gray-900">{order.orderNumber}</p>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
            {" · "}
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            {" · "}
            {order.outlet.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="px-6 py-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {order.items.slice(0, 4).map((item) => (
            <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {item.itemName} × {item.quantity}
            </span>
          ))}
          {order.items.length > 4 && (
            <span className="text-xs text-gray-400">+{order.items.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</span>
          {payment && (
            <span className="text-xs text-gray-500">
              {payment.paymentMethod === "cod" ? "Cash on Delivery" : payment.paymentMethod.toUpperCase()}
              {" · "}
              <span className={payment.status === "completed" ? "text-emerald-600" : "text-amber-600"}>
                {payment.status === "completed" ? "Paid" : "Pending"}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(order.id)}
              disabled={cancellingId === order.id}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
            >
              {cancellingId === order.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Cancel
            </Button>
          )}
          <Link href={`/track?order=${order.orderNumber}`}>
            <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8">
              Track <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
