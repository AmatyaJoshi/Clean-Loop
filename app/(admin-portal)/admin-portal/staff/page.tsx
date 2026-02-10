"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { AdminShell } from "../_components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp, ChevronLeft, ChevronRight, Filter, Loader2, Search, Store, UserCheck, UserPlus, Users, UserX } from "lucide-react";

type AdminStaff = {
  id: string;
  position: string;
  isActive: boolean;
  user: { name: string | null; email: string | null; phone: string | null };
  outlet: { name: string; code: string };
};

type StaffResponse = { staff: AdminStaff[] };
type OutletItem = { id: string; name: string; code: string };
type MetricsResponse = { outlets: OutletItem[] };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  outlet_manager: "Outlet manager",
  staff: "Staff",
};

export default function AdminStaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [outletFilter, setOutletFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "outlet" | "position">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "staff" as "admin" | "outlet_manager" | "staff",
    outletId: "",
    position: "" as "" | "manager" | "cleaner" | "delivery_agent",
  });

  const { data, isLoading, mutate } = useSWR<StaffResponse>("/api/admin/staff", fetcher);
  const { data: metricsData } = useSWR<MetricsResponse>("/api/admin/metrics", fetcher);
  const staff = data?.staff ?? [];
  const outlets = metricsData?.outlets ?? [];

  const filtered = staff
    .filter((s) => {
      if (outletFilter !== "all" && s.outlet.code !== outletFilter) return false;
      if (positionFilter !== "all" && s.position !== positionFilter) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          s.user.name?.toLowerCase().includes(q) ||
          s.user.email?.toLowerCase().includes(q) ||
          s.user.phone?.toLowerCase().includes(q) ||
          s.outlet.name.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return dir * ((a.user.name ?? "").localeCompare(b.user.name ?? ""));
      if (sortBy === "outlet") return dir * a.outlet.name.localeCompare(b.outlet.name);
      if (sortBy === "position") return dir * a.position.localeCompare(b.position);
      return 0;
    });

  // Reset page when filters change
  const filterKey = `${query}|${outletFilter}|${positionFilter}|${statusFilter}|${sortBy}|${sortDir}`;
  useMemo(() => setPage(1), [filterKey]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique outlets & positions for filter dropdowns
  const outletCodes = Array.from(new Set(staff.map((s) => s.outlet.code))).sort();
  const outletMap = Object.fromEntries(staff.map((s) => [s.outlet.code, s.outlet.name]));
  const positions = Array.from(new Set(staff.map((s) => s.position))).sort();

  const activeCount = staff.filter((s) => s.isActive).length;
  const inactiveCount = staff.length - activeCount;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          ...(form.outletId && form.position ? { outletId: form.outletId, position: form.position } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to create team member"); return; }
      setDialogOpen(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "staff", outletId: "", position: "" });
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell
      active="staff"
      title="Staff"
      subtitle="Manage team members across all outlets"
      actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add team member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Create a portal account for Admin, Outlet manager, or Staff.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" required minLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Portal role</Label>
                  <Select value={form.role} onValueChange={(v: "admin" | "outlet_manager" | "staff") => setForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="outlet_manager">{ROLE_LABELS.outlet_manager}</SelectItem>
                      <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(form.role === "staff" || form.role === "outlet_manager") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Outlet</Label>
                    <Select value={form.outletId} onValueChange={(v) => setForm((f) => ({ ...f, outletId: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select value={form.position} onValueChange={(v: "manager" | "cleaner" | "delivery_agent") => setForm((f) => ({ ...f, position: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select position" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cleaner">Cleaner</SelectItem>
                        <SelectItem value="delivery_agent">Delivery agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...</> : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Staff</p>
          <p className="text-lg font-bold text-gray-900">{staff.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-lg font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center">
              <UserX className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-lg font-bold text-gray-900">{inactiveCount}</p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4 pb-0 px-0">
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters & Sort</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search by name, outlet, or position"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={outletFilter} onValueChange={setOutletFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All outlets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outlets</SelectItem>
                  {outletCodes.map((c) => (
                    <SelectItem key={c} value={c}>{outletMap[c]} ({c})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All positions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">Sort by:</span>
              <Select value={sortBy} onValueChange={(v: "name" | "outlet" | "position") => setSortBy(v)}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
                <ArrowDownUp className="w-3 h-3 mr-1" /> {sortDir === "asc" ? "A→Z" : "Z→A"}
              </Button>
              <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {staff.length} shown</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Loading staff...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">{query ? "No staff match your search" : "No staff members found"}</p>
            </div>
          ) : (
            <>
              {/* Top Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-t border-gray-100 bg-gray-50/30">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString("en-IN")} staff
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
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outlet</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-emerald-600">
                              {(s.user.name ?? "S").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{s.user.name ?? "Staff"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        <div>{s.user.phone}</div>
                        <div>{s.user.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Store className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-700">{s.outlet.name}</span>
                          <span className="text-gray-400">({s.outlet.code})</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-700 capitalize">{s.position.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
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
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString("en-IN")} staff
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

