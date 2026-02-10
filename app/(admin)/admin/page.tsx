"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Package, Users, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { formatCurrency, getOrderStatusColor } from "@/lib/utils";
import Footer from "@/components/Footer";

// Mock data - In production, this would come from an API
const mockOrders = [
  {
    id: "ORD-001",
    customerName: "Rajesh Kumar",
    outlet: "Koramangala",
    status: "in_progress",
    items: 8,
    total: 1250,
    pickupDate: "2026-02-09",
    createdAt: "2026-02-08"
  },
  {
    id: "ORD-002",
    customerName: "Priya Sharma",
    outlet: "Indiranagar",
    status: "ready",
    items: 12,
    total: 2100,
    pickupDate: "2026-02-09",
    createdAt: "2026-02-07"
  },
  {
    id: "ORD-003",
    customerName: "Amit Patel",
    outlet: "HSR Layout",
    status: "picked_up",
    items: 5,
    total: 850,
    pickupDate: "2026-02-10",
    createdAt: "2026-02-09"
  },
  {
    id: "ORD-004",
    customerName: "Sneha Reddy",
    outlet: "Whitefield",
    status: "delivered",
    items: 15,
    total: 3200,
    pickupDate: "2026-02-08",
    createdAt: "2026-02-06"
  },
  {
    id: "ORD-005",
    customerName: "Vikram Singh",
    outlet: "Koramangala",
    status: "confirmed",
    items: 6,
    total: 980,
    pickupDate: "2026-02-10",
    createdAt: "2026-02-09"
  },
];

const stats = [
  { label: "Total Orders", value: "1,234", change: "+12%", icon: Package, color: "blue" },
  { label: "Active Customers", value: "856", change: "+8%", icon: Users, color: "green" },
  { label: "Revenue (Today)", value: "₹45,680", change: "+15%", icon: TrendingUp, color: "purple" },
  { label: "Pending Orders", value: "23", change: "-5%", icon: Clock, color: "orange" },
];

export default function AdminDashboard() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = mockOrders.filter(order => {
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-emerald-600" />
                <h1 className="text-2xl font-bold text-gray-900">CleanLoop Admin</h1>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="text-emerald-600 font-medium">Dashboard</Link>
              <Link href="/admin/orders" className="text-gray-600 hover:text-gray-900">Orders</Link>
              <Link href="/admin/customers" className="text-gray-600 hover:text-gray-900">Customers</Link>
              <Link href="/admin/outlets" className="text-gray-600 hover:text-gray-900">Outlets</Link>
              <Link href="/admin/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              Profile
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className={`text-sm font-semibold ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-2xl font-bold">Recent Orders</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outlet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500">{order.createdAt}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.outlet}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.items} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.pickupDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-emerald-600 hover:text-emerald-900 mr-3 transition-colors">View</button>
                      <button className="text-green-600 hover:text-green-900 transition-colors">Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
