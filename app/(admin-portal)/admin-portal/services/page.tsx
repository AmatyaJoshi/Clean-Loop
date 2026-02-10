"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { AdminShell } from "../_components/AdminShell";
import {
  AlertCircle,
  Check,
  Edit2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Shirt,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

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
  isActive: boolean;
  categoryId: string;
  category: ServiceCategory;
  createdAt: string;
};

type ServicesResponse = {
  services: Service[];
  categories: ServiceCategory[];
};

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); });

const emptyForm = {
  name: "",
  code: "",
  description: "",
  basePrice: 0,
  processingTimeHours: 24,
  unit: "piece" as string,
  isExpressAvailable: false,
  expressMultiplier: 1.5,
  categoryId: "",
  isActive: true,
};

export default function AdminServicesPage() {
  const { data, isLoading, mutate } = useSWR<ServicesResponse>("/api/admin/services", fetcher, {
    revalidateOnFocus: false,
  });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const services = data?.services ?? [];
  const categories = data?.categories ?? [];

  const filtered = services.filter((s) => {
    if (!showInactive && !s.isActive) return false;
    if (categoryFilter !== "all" && s.categoryId !== categoryFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    }
    return true;
  });

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      code: service.code,
      description: service.description ?? "",
      basePrice: Number(service.basePrice),
      processingTimeHours: service.processingTimeHours,
      unit: service.unit,
      isExpressAvailable: service.isExpressAvailable,
      expressMultiplier: Number(service.expressMultiplier),
      categoryId: service.categoryId,
      isActive: service.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const url = editingService
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      const method = editingService ? "PATCH" : "POST";

      const payload = editingService
        ? {
            name: form.name,
            description: form.description || undefined,
            basePrice: form.basePrice,
            processingTimeHours: form.processingTimeHours,
            unit: form.unit,
            isExpressAvailable: form.isExpressAvailable,
            expressMultiplier: form.expressMultiplier,
            categoryId: form.categoryId,
            isActive: form.isActive,
          }
        : {
            ...form,
            description: form.description || undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }

      setDialogOpen(false);
      mutate();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: Service) => {
    await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    mutate();
  };

  const deleteService = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"? This cannot be undone if the service has no orders.`)) return;
    await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
    mutate();
  };

  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.filter((s) => !s.isActive).length;

  return (
    <AdminShell
      active="services"
      title="Services Management"
      subtitle="Add, edit, or remove services offered to customers"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Service
          </Button>
        </div>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Total Services</p>
          <p className="text-lg font-bold text-gray-900">{services.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-lg font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-lg font-bold text-gray-400">{inactiveCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Categories</p>
          <p className="text-lg font-bold text-gray-900">{categories.length}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-sm w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showInactive ? "default" : "outline"}
              size="sm"
              className={`h-9 text-xs ${showInactive ? "bg-gray-800 hover:bg-gray-700" : ""}`}
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? <PowerOff className="w-3.5 h-3.5 mr-1" /> : <Power className="w-3.5 h-3.5 mr-1" />}
              {showInactive ? "Showing inactive" : "Show inactive"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardContent className="pt-0 px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500">Loading services...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Shirt className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">No services found</p>
              <Button size="sm" onClick={openCreate} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add your first service
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Express</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((service) => (
                    <tr key={service.id} className={`hover:bg-gray-50/50 transition-colors ${!service.isActive ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-400">{service.code}</p>
                        {service.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="secondary" className="text-xs">{service.category.name}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                        {formatCurrency(Number(service.basePrice))}
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-500 capitalize">{service.unit}</td>
                      <td className="px-5 py-3.5 text-center text-gray-500">{service.processingTimeHours}h</td>
                      <td className="px-5 py-3.5 text-center">
                        {service.isExpressAvailable ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            {Number(service.expressMultiplier)}x
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge className={service.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-600" onClick={() => openEdit(service)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-amber-600" onClick={() => toggleActive(service)}>
                            {service.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600" onClick={() => deleteService(service)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Service Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Wash & Iron"
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Code * {editingService && <span className="text-gray-400">(readonly)</span>}</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  placeholder="WASH_IRON"
                  className="h-9 text-sm mt-1"
                  disabled={!!editingService}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the service"
                className="h-9 text-sm mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Base Price (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Per Piece</SelectItem>
                    <SelectItem value="kg">Per Kg</SelectItem>
                    <SelectItem value="set">Per Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Processing (hrs) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.processingTimeHours}
                  onChange={(e) => setForm({ ...form, processingTimeHours: Number(e.target.value) })}
                  className="h-9 text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isExpressAvailable}
                  onChange={(e) => setForm({ ...form, isExpressAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Express available</span>
              </label>
              {form.isExpressAvailable && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Multiplier:</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.1}
                    value={form.expressMultiplier}
                    onChange={(e) => setForm({ ...form, expressMultiplier: Number(e.target.value) })}
                    className="h-8 w-20 text-sm"
                  />
                </div>
              )}
            </div>

            {editingService && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Active (visible to customers)</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.name || !form.categoryId || form.basePrice <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-3.5 h-3.5 mr-1" /> {editingService ? "Update" : "Create"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
