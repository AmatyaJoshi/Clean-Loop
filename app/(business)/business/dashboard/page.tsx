"use client";

import Link from "next/link";
import { 
  Sparkles, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  Search,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Footer from "@/components/Footer";

export default function BusinessDashboard() {
  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      {/* Business Navbar */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-6">
              <Link href="/business/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300">
                <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">CleanLoop</h1>
                  <p className="text-xs text-emerald-600 font-semibold">Business Portal</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/business/dashboard" className="text-emerald-600 font-semibold border-b-2 border-emerald-600 pb-1">
                Dashboard
              </Link>
              <Link href="/business/orders" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                Orders
              </Link>
              <Link href="/business/employees" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                Employees
              </Link>
              <Link href="/business/billing" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                Billing
              </Link>
              <Link href="/business/reports" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
                Reports
              </Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Avatar>
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                  AC
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, Acme Corp! 👋</h1>
          <p className="text-gray-600 text-lg">Here's what's happening with your business today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              <Package className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">1,284</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          {/* Active Employees */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up animation-delay-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Employees</CardTitle>
              <Users className="w-5 h-5 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">47</div>
              <p className="text-xs text-teal-600 font-medium mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +3 this month
              </p>
            </CardContent>
          </Card>

          {/* Monthly Spending */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up animation-delay-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Spending</CardTitle>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">₹45,680</div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Current billing cycle
              </p>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up animation-delay-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">23</div>
              <p className="text-xs text-orange-600 font-medium mt-1">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="border-gray-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Recent Orders</CardTitle>
                    <CardDescription>Latest laundry orders from your team</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Search className="w-4 h-4" />
                    Search
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order 1 */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Order #ORD-2847</h4>
                        <p className="text-sm text-gray-600">John Doe - Wash & Iron (5 items)</p>
                        <p className="text-xs text-gray-500 mt-1">Today, 10:30 AM</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 mb-2">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        In Progress
                      </Badge>
                      <p className="text-sm font-semibold text-gray-900">₹250</p>
                    </div>
                  </div>

                  {/* Order 2 */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Order #ORD-2846</h4>
                        <p className="text-sm text-gray-600">Jane Smith - Dry Clean (3 items)</p>
                        <p className="text-xs text-gray-500 mt-1">Today, 9:15 AM</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 mb-2">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                      <p className="text-sm font-semibold text-gray-900">₹450</p>
                    </div>
                  </div>

                  {/* Order 3 */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Order #ORD-2845</h4>
                        <p className="text-sm text-gray-600">Mike Johnson - Steam Iron (8 items)</p>
                        <p className="text-xs text-gray-500 mt-1">Yesterday, 4:20 PM</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 mb-2">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                      <p className="text-sm font-semibold text-gray-900">₹240</p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-6" variant="outline">
                  View All Orders
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quick Actions & Team */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start gap-3" variant="outline">
                  <Package className="w-5 h-5" />
                  Place New Order
                </Button>
                <Button className="w-full justify-start gap-3" variant="outline">
                  <Users className="w-5 h-5" />
                  Add Employee
                </Button>
                <Button className="w-full justify-start gap-3" variant="outline">
                  <BarChart3 className="w-5 h-5" />
                  Generate Report
                </Button>
                <Button className="w-full justify-start gap-3" variant="outline">
                  <DollarSign className="w-5 h-5" />
                  View Invoices
                </Button>
              </CardContent>
            </Card>

            {/* Team Overview */}
            <Card className="border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Team Overview</CardTitle>
                <CardDescription>Recent user activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-500">Placed order 2h ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-teal-100 text-teal-700">JS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Jane Smith</p>
                    <p className="text-xs text-gray-500">Placed order 3h ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-purple-100 text-purple-700">MJ</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Mike Johnson</p>
                    <p className="text-xs text-gray-500">Order delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
