"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../_components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  IndianRupee,
  Mail,
  Phone,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type AdminCustomer = {
  id: string;
  customerCode: string;
  totalOrders: number;
  lifetimeValue: number;
  loyaltyPoints: number;
  user: { name: string | null; email: string | null; phone: string | null };
};

type Totals = {
  totalCustomers: number;
  totalOrders: number;
  totalLifetimeValue: number;
  avgValue: number;
};

type CustomersResponse = {
  customers: AdminCustomer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: Totals;
};

export default function AdminCustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("lifetimeValue");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const pageSize = 50;

  const loadCustomers = useCallback(async (q: string, p: number, sb: string, sd: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      params.set("sortBy", sb);
      params.set("sortDir", sd);
      const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(search, page, sortBy, sortDir);
  }, [page, sortBy, sortDir]);

  const handleSearch = () => {
    setPage(1);
    loadCustomers(search, 1, sortBy, sortDir);
  };

  const toggleSortDir = () => setSortDir((d) => (d === "desc" ? "asc" : "desc"));

  const customers = data?.customers ?? [];
  const totals = data?.totals;

  const paginationBar = data && data.totalPages > 1 ? (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-t border-gray-100 bg-gray-50/30">
      <p className="text-xs text-gray-500">
        Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString("en-IN")} customers
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs text-gray-600 px-2">Page {data.page} of {data.totalPages}</span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= data.totalPages}
          onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <AdminShell active="customers" title="Customers" subtitle="Customer directory and lifetime value overview">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Customers</p>
          <p className="text-lg font-bold text-gray-900">{(totals?.totalCustomers ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-lg font-bold text-gray-900">{(totals?.totalOrders ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Lifetime Value</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totals?.totalLifetimeValue ?? 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Avg. Value / Customer</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totals?.avgValue ?? 0)}</p>
        </div>
      </div>

      {/* Search + Table */}
      <Card>
        <CardContent className="pt-4 pb-0 px-0">
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Search & Sort</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search by name, phone, email, or code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifetimeValue">Lifetime Value</SelectItem>
                  <SelectItem value="totalOrders">Total Orders</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="loyaltyPoints">Loyalty Points</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={toggleSortDir}>
                  <ArrowDownUp className="w-3.5 h-3.5 mr-1.5" />
                  {sortDir === "desc" ? "Desc" : "Asc"}
                </Button>
                <Button onClick={handleSearch} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-1">
                  Search
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Loading customers...</p>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                {search ? "No customers match your search" : "No customers found"}
              </p>
            </div>
          ) : (
            <>
              {/* Top Pagination */}
              {paginationBar}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lifetime Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-emerald-600">
                                {(c.user.name ?? "C").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{c.user.name ?? "Customer"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5 text-xs text-gray-500">
                            {c.user.phone && (
                              <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.user.phone}</div>
                            )}
                            {c.user.email && (
                              <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.user.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{c.customerCode}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-gray-900">{c.totalOrders}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-gray-900">{formatCurrency(c.lifetimeValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination */}
              {paginationBar}
            </>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

