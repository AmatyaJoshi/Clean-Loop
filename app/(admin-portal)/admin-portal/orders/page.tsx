"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AdminShell } from "../_components/AdminShell";
import {
  ArrowDownUp,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  totalAmount: number;
  pickupScheduledAt: string | null;
  deliveryScheduledAt: string | null;
  expectedCompletionAt: string | null;
  createdAt: string;
  delayRisk: number;
  outletLoadPercent: number;
  outlet: { id: string; name: string; code: string };
  customer: { user: { name: string | null; phone: string | null; email: string | null } };
};

type AdminOrdersResponse = { orders: AdminOrder[]; total: number; page: number; pageSize: number; totalPages: number };

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); });

function PaginationBar({ info, currentPage, setCurrentPage, label = "orders" }: {
  info: { total: number; page: number; pageSize: number; totalPages: number };
  currentPage: number;
  setCurrentPage: (fn: (p: number) => number) => void;
  label?: string;
}) {
  if (info.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-t border-gray-100 bg-gray-50/30">
      <p className="text-xs text-gray-500">
        Showing {(info.page - 1) * info.pageSize + 1}–{Math.min(info.page * info.pageSize, info.total)} of {info.total.toLocaleString("en-IN")} {label}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => p - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs text-gray-600 px-2">Page {info.page} of {info.totalPages}</span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage >= info.totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function buildUrl(status: string, outletId: string, q: string, page: number, sortBy: string, sortDir: string) {
  const p = new URLSearchParams();
  if (status && status !== "all") p.set("status", status);
  if (outletId && outletId !== "all") p.set("outletId", outletId);
  if (q) p.set("q", q);
  p.set("page", String(page));
  p.set("take", "25");
  if (sortBy) p.set("sortBy", sortBy);
  if (sortDir) p.set("sortDir", sortDir);
  return `/api/admin/orders?${p.toString()}`;
}

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [outletFilter, setOutletFilter] = useState(searchParams.get("outletId") ?? "all");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") ?? "createdAt");
  const [sortDir, setSortDir] = useState(searchParams.get("sortDir") ?? "desc");

  const url = buildUrl(statusFilter, outletFilter, query, currentPage, sortBy, sortDir);
  const { data, error, isLoading, mutate } = useSWR<AdminOrdersResponse>(url, fetcher, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const orders = data?.orders ?? [];
  const paginationInfo = data ? { total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages } : null;
  const loading = isLoading && !data;

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (outletFilter && outletFilter !== "all") params.set("outletId", outletFilter);
    if (query) params.set("q", query);
    router.push(`/admin-portal/orders?${params.toString()}`);
    setCurrentPage(1);
  }, [statusFilter, outletFilter, query, router]);

  const highRiskOrders = orders.filter((o) => o.delayRisk >= 60);
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const inProgressCount = orders.filter(o => ["in_progress", "picked_up", "quality_check"].includes(o.status)).length;
  const readyCount = orders.filter(o => ["ready", "out_for_delivery"].includes(o.status)).length;

  return (
    <AdminShell
      active="orders"
      title="Orders"
      subtitle="Manage and track all customer orders across outlets"
      notificationCount={highRiskOrders.length}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </Button>
        </div>
      }
    >
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-lg font-bold text-gray-900">{(paginationInfo?.total ?? orders.length).toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-lg font-bold text-gray-900">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-lg font-bold text-gray-900">{inProgressCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Ready / Delivering</p>
          <p className="text-lg font-bold text-gray-900">{readyCount}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters & Sort</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Order number, customer name, or phone"
                  className="pl-9 h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="picked_up">Picked up</SelectItem>
                <SelectItem value="in_progress">Processing</SelectItem>
                <SelectItem value="quality_check">Quality check</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outletFilter} onValueChange={setOutletFilter}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All outlets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outlets</SelectItem>
                {Array.from(new Map(orders.map((o) => [o.outlet.id, o.outlet])).values()).map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500">Sort by:</span>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date</SelectItem>
                <SelectItem value="totalAmount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="delayRisk">Delay Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSortDir((d) => d === "desc" ? "asc" : "desc"); setCurrentPage(1); }}>
              <ArrowDownUp className="w-3 h-3 mr-1" /> {sortDir === "desc" ? "Newest" : "Oldest"}
            </Button>
            <div className="ml-auto">
              <Button onClick={applyFilters} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Risk Alert */}
      {highRiskOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {highRiskOrders.length} order(s) with high delay risk
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highRiskOrders.slice(0, 8).map((order) => (
              <Link key={order.id} href={`/admin-portal/orders/${order.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs hover:border-amber-400 transition-colors">
                <span className="font-medium text-gray-700">{order.orderNumber}</span>
                <span className="text-amber-700 font-semibold">{order.delayRisk}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-0 px-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Loading orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Package className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">No orders found</p>
              <p className="text-xs text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <>
            {/* Top Pagination */}
            {paginationInfo && <PaginationBar info={paginationInfo} currentPage={currentPage} setCurrentPage={setCurrentPage} />}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outlet</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{order.customer.user.name ?? "Customer"}</p>
                        <p className="text-xs text-gray-400">{order.customer.user.phone ?? order.customer.user.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-gray-700">{order.outlet.name}</p>
                        <p className="text-xs text-gray-400">{order.outlet.code}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {order.pickupScheduledAt && (
                          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Pickup: {formatDate(order.pickupScheduledAt)}</div>
                        )}
                        {order.expectedCompletionAt && (
                          <div className="flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> ETA: {formatDate(order.expectedCompletionAt)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                order.delayRisk >= 70 ? "bg-red-500" :
                                order.delayRisk >= 40 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${order.delayRisk}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-7 text-right ${
                            order.delayRisk >= 70 ? "text-red-600" :
                            order.delayRisk >= 40 ? "text-amber-600" : "text-gray-500"
                          }`}>
                            {order.delayRisk}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin-portal/orders/${order.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            {paginationInfo && <PaginationBar info={paginationInfo} currentPage={currentPage} setCurrentPage={setCurrentPage} />}
            </>)}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}

