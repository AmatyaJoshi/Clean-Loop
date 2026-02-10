"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "../../_components/AdminShell";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryCharges: number;
  totalAmount: number;
  pickupScheduledAt: string | null;
  pickupCompletedAt: string | null;
  deliveryScheduledAt: string | null;
  deliveryCompletedAt: string | null;
  expectedCompletionAt: string | null;
  specialInstructions: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  statusHistory: Array<{ status: string; timestamp: string }>;
  createdAt: string;
  customer: { user: { name: string | null; email: string | null; phone: string | null } };
  outlet: { name: string; code: string };
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    service: { name: string };
  }>;
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState<string | undefined>();

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOrder(data.order);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrder(); }, [params.id]);

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusUpdate }),
      });
      if (res.ok) await loadOrder();
    } finally {
      setUpdating(false);
    }
  };

  const currentStatus = order?.status ?? "pending";
  const possibleNextStatuses: string[] = (() => {
    switch (currentStatus) {
      case "pending": return ["confirmed", "cancelled"];
      case "confirmed": return ["picked_up", "cancelled"];
      case "picked_up": return ["in_progress"];
      case "in_progress": return ["quality_check", "ready"];
      case "quality_check": return ["ready"];
      case "ready": return ["out_for_delivery", "delivered"];
      case "out_for_delivery": return ["delivered"];
      default: return [];
    }
  })();

  const timelineEntries = order
    ? [
        { label: "Created", date: order.createdAt, always: true },
        { label: "Pickup scheduled", date: order.pickupScheduledAt },
        { label: "Pickup completed", date: order.pickupCompletedAt },
        { label: "Expected completion", date: order.expectedCompletionAt },
        { label: "Delivery scheduled", date: order.deliveryScheduledAt },
        { label: "Delivery completed", date: order.deliveryCompletedAt },
      ].filter((e) => e.date)
    : [];

  return (
    <AdminShell
      active="orders"
      title={order ? `Order ${order.orderNumber}` : "Order details"}
      subtitle="Operational view for staff and admin"
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push("/admin-portal/orders")} className="text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to orders
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Loading order...</p>
          </div>
        </div>
      ) : !order ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">Order not found</p>
          <Button
            variant="outline" size="sm"
            onClick={() => router.push("/admin-portal/orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to orders
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header strip */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">Priority: <span className="font-medium text-gray-700">{order.priority}</span></span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
          </div>

          {/* Customer & Outlet cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-gray-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                    <p className="text-sm font-semibold text-gray-900">{order.customer.user.name ?? "Customer"}</p>
                    <p className="text-xs text-gray-500">
                      {[order.customer.user.phone, order.customer.user.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Outlet</p>
                    <p className="text-sm font-semibold text-gray-900">{order.outlet.name}</p>
                    <p className="text-xs text-gray-500">{order.outlet.code}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items table + Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-gray-200">
              <CardContent className="pt-0 px-0">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">Items ({order.items.length})</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Service</th>
                      <th className="px-5 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-5 py-2 text-right text-xs font-medium text-gray-500">Unit</th>
                      <th className="px-5 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5 font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-5 py-2.5 text-gray-500 text-xs">{item.service.name}</td>
                        <td className="px-5 py-2.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-5 py-2.5 text-right text-gray-500 text-xs">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Payment summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span><span>{formatCurrency(order.taxAmount)}</span>
                  </div>
                  {order.deliveryCharges > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery</span><span>{formatCurrency(order.deliveryCharges)}</span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline + Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-gray-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">Timeline</span>
                </div>
                <div className="space-y-2">
                  {timelineEntries.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-gray-500 w-36">{e.label}</span>
                      <span className="text-gray-700 font-medium">{formatDate(e.date!)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">Notes</span>
                </div>
                <div className="space-y-3 text-xs text-gray-600">
                  {order.specialInstructions && (
                    <div>
                      <p className="font-medium text-gray-700 mb-0.5">Special instructions</p>
                      <p>{order.specialInstructions}</p>
                    </div>
                  )}
                  {order.customerNotes && (
                    <div>
                      <p className="font-medium text-gray-700 mb-0.5">Customer notes</p>
                      <p>{order.customerNotes}</p>
                    </div>
                  )}
                  {order.internalNotes && (
                    <div>
                      <p className="font-medium text-gray-700 mb-0.5">Internal notes</p>
                      <p>{order.internalNotes}</p>
                    </div>
                  )}
                  {!order.specialInstructions && !order.customerNotes && !order.internalNotes && (
                    <p className="text-gray-400 italic">No notes on this order.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status update */}
          {possibleNextStatuses.length > 0 && (
            <Card className="border-gray-200">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Update order status</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                    <SelectTrigger className="w-full sm:w-64 h-9 text-sm">
                      <SelectValue placeholder="Select next status" />
                    </SelectTrigger>
                    <SelectContent>
                      {possibleNextStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleStatusUpdate}
                    disabled={!statusUpdate || updating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                  >
                    {updating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Updating...</> : "Apply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status history */}
          <Card className="border-gray-200">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Status history</p>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <ol className="border-l-2 border-gray-100 pl-5 space-y-3">
                  {order.statusHistory.map((h, idx) => (
                    <li key={`${h.status}-${idx}`} className="relative">
                      <span className="absolute -left-[1.4rem] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      <p className="text-xs">
                        <span className="font-medium text-gray-900 capitalize">{h.status.replace(/_/g, " ")}</span>
                        <span className="text-gray-400 ml-2">{formatDate(h.timestamp)}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-400 italic">Status history will appear as the order progresses.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

