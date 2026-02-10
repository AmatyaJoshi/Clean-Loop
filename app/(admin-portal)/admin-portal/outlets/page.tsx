"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { AdminShell } from "../_components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, ArrowDownUp, ChevronLeft, ChevronRight, Clock, IndianRupee, Package, Store, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type OutletMetric = {
  id: string;
  code: string;
  name: string;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  capacityLoadPercent: number;
  avgTurnaroundHours: number;
};

type MetricsResponse = {
  outlets: OutletMetric[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminOutletsPage() {
  const { data, isLoading } = useSWR<MetricsResponse>("/api/admin/metrics", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const outlets = data?.outlets ?? [];

  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "capacity" | "turnaround" | "name">("revenue");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const sorted = useMemo(() => {
    const copy = [...outlets];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortBy === "revenue") return dir * (a.totalRevenue - b.totalRevenue);
      if (sortBy === "orders") return dir * (a.totalOrders - b.totalOrders);
      if (sortBy === "capacity") return dir * (a.capacityLoadPercent - b.capacityLoadPercent);
      if (sortBy === "turnaround") return dir * (a.avgTurnaroundHours - b.avgTurnaroundHours);
      if (sortBy === "name") return dir * a.name.localeCompare(b.name);
      return 0;
    });
    return copy;
  }, [outlets, sortBy, sortDir]);

  // Reset page when sort changes
  const sortKey = `${sortBy}|${sortDir}`;
  useMemo(() => setPage(1), [sortKey]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalOrders = outlets.reduce((s, o) => s + o.totalOrders, 0);
  const totalRevenue = outlets.reduce((s, o) => s + o.totalRevenue, 0);
  const avgCapacity = outlets.length > 0
    ? Math.round(outlets.reduce((s, o) => s + o.capacityLoadPercent, 0) / outlets.length)
    : 0;

  return (
    <AdminShell active="outlets" title="Outlets" subtitle="Outlet performance and capacity overview">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Outlets</p>
          <p className="text-lg font-bold text-gray-900">{outlets.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-lg font-bold text-gray-900">{totalOrders.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Avg. Capacity</p>
          <p className="text-lg font-bold text-gray-900">{avgCapacity}%</p>
        </div>
      </div>

      {/* Outlets table */}
      <Card>
        <CardContent className="pt-0 px-0">
          {/* Sort controls */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">Sort by:</span>
            <Select value={sortBy} onValueChange={(v: "revenue" | "orders" | "capacity" | "turnaround" | "name") => setSortBy(v)}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Total Orders</SelectItem>
                <SelectItem value="capacity">Capacity</SelectItem>
                <SelectItem value="turnaround">Turnaround</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}>
              <ArrowDownUp className="w-3 h-3 mr-1" /> {sortDir === "desc" ? "High → Low" : "Low → High"}
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Loading outlets...</p>
              </div>
            </div>
          ) : outlets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Store className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">No outlets found</p>
            </div>
          ) : (
            <>
              {/* Top Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50/30">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} outlets
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outlet</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Turnaround</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{o.name}</p>
                            <p className="text-xs text-gray-400">{o.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">{o.totalOrders.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">{o.activeOrders.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">{formatCurrency(o.totalRevenue)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 text-gray-700">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{Math.round(o.avgTurnaroundHours)}h</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                o.capacityLoadPercent >= 80 ? "bg-red-500" :
                                o.capacityLoadPercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${o.capacityLoadPercent}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-8 text-right ${
                            o.capacityLoadPercent >= 80 ? "text-red-600" :
                            o.capacityLoadPercent >= 60 ? "text-amber-600" : "text-gray-500"
                          }`}>
                            {o.capacityLoadPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-t border-gray-100 bg-gray-50/30">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} outlets
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

