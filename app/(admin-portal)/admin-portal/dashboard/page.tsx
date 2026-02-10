"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  Package,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  UserCog,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminShell } from "../_components/AdminShell";
import { formatCurrency } from "@/lib/utils";

type Overview = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalStaff: number;
  activeStaff: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
};

type MonthlyEntry = { month: string; revenue: number; orders: number; completed: number };
type YearlyEntry = { year: number; revenue: number; orders: number };
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
type RecentActivity = {
  thisMonthRevenue: number;
  thisMonthOrders: number;
  lastMonthRevenue: number;
  lastMonthOrders: number;
  growthPercent: number;
};

type MetricsResponse = {
  overview: Overview;
  monthly: MonthlyEntry[];
  yearly: YearlyEntry[];
  outlets: OutletMetric[];
  ordersByStatus: Record<string, number>;
  recentActivity: RecentActivity;
};

/* ── Forecast types ─────────────────────────── */
type ForecastPoint = { period: string; predicted: number; lower: number; upper: number };
type ForecastMetric = {
  forecasts: ForecastPoint[];
  trend: "growing" | "declining" | "stable";
  trendStrength: number;
  seasonality: boolean;
  avgGrowthRate: number;
  r2: number;
};
type PredictionsResponse = {
  forecasts: { revenue: ForecastMetric; orders: ForecastMetric; customers: ForecastMetric };
  yearlyForecasts: { revenue: ForecastMetric };
  aiInsight: string | null;
  generatedAt: string;
  modelsUsed: { statistical: string; narrative: string };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── Pure SVG mini-charts ─────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  delivered: "#059669",      // emerald-600
  pending: "#d97706",        // amber-600
  confirmed: "#047857",      // emerald-700
  picked_up: "#10b981",      // emerald-500
  in_progress: "#34d399",    // emerald-400
  quality_check: "#6ee7b7",  // emerald-300
  ready: "#a7f3d0",          // emerald-200
  out_for_delivery: "#065f46", // emerald-900
  cancelled: "#dc2626",      // red-600
};

function PieChart({ data, size = 180 }: { data: Record<string, number>; size?: number }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const slices = entries.map(([status, count]) => {
    const angle = (count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { status, count, d, pct: Math.round((count / total) * 100) };
  });
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => (
          <path key={s.status} d={s.d} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} stroke="white" strokeWidth={2} />
        ))}
      </svg>
      <div className="space-y-1.5 min-w-[140px]">
        {slices.map((s) => (
          <div key={s.status} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
            <span className="text-gray-600 capitalize flex-1">{s.status.replace(/_/g, " ")}</span>
            <span className="font-semibold text-gray-900">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, valueKey, label }: { data: { label: string; value: number }[]; valueKey: string; label: string }) {
  if (data.length < 2) return null;
  const W = 600, H = 200, PX = 48, PY = 24, PB = 36;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * chartW,
    y: PY + chartH - (d.value / maxVal) * chartH,
    ...d,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`;
  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PY + chartH - f * chartH,
    label: formatCurrency(f * maxVal),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#f3f4f6" strokeWidth={1} />
          <text x={PX - 6} y={t.y + 3} textAnchor="end" className="fill-gray-400" fontSize={8}>{t.label}</text>
        </g>
      ))}
      {/* Area + Line */}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#10b981" stroke="white" strokeWidth={1.5} />
      ))}
      {/* X labels */}
      {points.map((p, i) => (
        i % Math.max(1, Math.floor(points.length / 7)) === 0 || i === points.length - 1 ? (
          <text key={`l${i}`} x={p.x} y={H - 8} textAnchor="middle" className="fill-gray-500" fontSize={8}>{p.label}</text>
        ) : null
      ))}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function BarChart({ data }: { data: { label: string; value: number; orders: number }[] }) {
  if (data.length === 0) return null;
  const W = 600, H = 220, PX = 48, PY = 16, PB = 44;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(8, Math.min(36, chartW / data.length - 6));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PY + chartH - f * chartH,
    label: formatCurrency(f * maxVal),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#f3f4f6" strokeWidth={1} />
          <text x={PX - 6} y={t.y + 3} textAnchor="end" className="fill-gray-400" fontSize={8}>{t.label}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PX + (i + 0.5) * (chartW / data.length) - barW / 2;
        const barH = (d.value / maxVal) * chartH;
        return (
          <g key={i}>
            <rect x={x} y={PY + chartH - barH} width={barW} height={barH} rx={3} fill="#10b981" opacity={0.85} />
            <text x={x + barW / 2} y={H - PB + 14} textAnchor="middle" className="fill-gray-500" fontSize={7.5}>{d.label}</text>
            <text x={x + barW / 2} y={H - PB + 26} textAnchor="middle" className="fill-gray-400" fontSize={6.5}>{d.orders.toLocaleString("en-IN")} ord</text>
          </g>
        );
      })}
    </svg>
  );
}

function ForecastChart({ metric, label, format = "currency" }: { metric: ForecastMetric; label: string; format?: "currency" | "number" }) {
  const pts = metric.forecasts;
  if (pts.length < 2) return <p className="text-sm text-gray-400 py-4">Insufficient data for projection</p>;
  const W = 580, H = 200, PX = 54, PY = 20, PB = 36;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const allVals = pts.flatMap((p) => [p.upper, p.lower, p.predicted]);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;
  const toX = (i: number) => PX + (i / (pts.length - 1)) * chartW;
  const toY = (v: number) => PY + chartH - ((v - minVal) / range) * chartH;
  const predLine = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.predicted)}`).join(" ");
  const confArea = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.upper)}`).join(" ") +
    " " + [...pts].reverse().map((p, i) => `L ${toX(pts.length - 1 - i)} ${toY(p.lower)}`).join(" ") + " Z";
  const fmt = (v: number) => format === "currency" ? (v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`) : (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: PY + chartH - f * chartH, label: fmt(minVal + f * range) }));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`fcGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PX - 6} y={t.y + 3} textAnchor="end" className="fill-gray-400" fontSize={7.5}>{t.label}</text>
          </g>
        ))}
        <path d={confArea} fill={`url(#fcGrad-${label})`} />
        {/* Upper/lower boundary lines */}
        <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.upper)}`).join(" ")} fill="none" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" />
        <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.lower)}`).join(" ")} fill="none" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" />
        {/* Main predicted line */}
        <path d={predLine} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.predicted)} r={3.5} fill="white" stroke="#6366f1" strokeWidth={2} />
            <text x={toX(i)} y={H - 8} textAnchor="middle" className="fill-gray-500" fontSize={7.5}>{p.period}</text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 px-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-indigo-500 rounded" /> Predicted</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-indigo-300 rounded border-dashed" style={{ borderBottom: '1px dashed #a5b4fc', height: 0 }} /> Confidence Range</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-indigo-500/10" /> 90% Interval</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading: loading } = useSWR<MetricsResponse>("/api/admin/metrics", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const overview = data?.overview;
  const outlets = data?.outlets ?? [];
  const monthly = data?.monthly ?? [];
  const recent = data?.recentActivity;
  const maxMonthlyRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  const lineData = useMemo(() => monthly.map((m) => ({ label: m.month, value: m.revenue })), [monthly]);
  const barData = useMemo(() => monthly.map((m) => ({ label: m.month, value: m.revenue, orders: m.orders })), [monthly]);

  const { data: predictions, isLoading: predLoading } = useSWR<PredictionsResponse>("/api/ai/predictions", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });

  if (loading) {
    return (
      <AdminShell active="dashboard" title="Dashboard" subtitle="Business overview and performance">
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Loading metrics...</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell active="dashboard" title="Dashboard" subtitle="Business overview and performance">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Total Revenue</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.totalRevenue ?? 0)}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-600 font-medium">All-time collection</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Total Orders</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{(overview?.totalOrders ?? 0).toLocaleString("en-IN")}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-gray-500">{(overview?.completedOrders ?? 0).toLocaleString("en-IN")} delivered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Customers</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{(overview?.totalCustomers ?? 0).toLocaleString("en-IN")}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-500">Avg. value: {formatCurrency(overview?.avgOrderValue ?? 0)}/order</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Staff</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{(overview?.totalStaff ?? 0).toLocaleString("en-IN")}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-500">{(overview?.activeStaff ?? 0).toLocaleString("en-IN")} active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Comparison */}
      {recent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-gray-200">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 mb-1">Last Month Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(recent.lastMonthRevenue)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {recent.growthPercent >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                )}
                <span className={`text-xs font-medium ${recent.growthPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {recent.growthPercent >= 0 ? "+" : ""}{recent.growthPercent}% vs prior month
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 mb-1">Last Month Orders</p>
              <p className="text-xl font-bold text-gray-900">{recent.lastMonthOrders.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-2">This month so far: {recent.thisMonthOrders.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 mb-1">Active Orders</p>
              <p className="text-xl font-bold text-gray-900">{(overview?.activeOrders ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-2">
                {(overview?.cancelledOrders ?? 0).toLocaleString("en-IN")} cancelled all-time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Line Chart + Status Pie */}
      {monthly.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription className="text-xs mt-0.5">Monthly revenue from delivered orders</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart data={lineData} valueKey="revenue" label="Revenue" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order Status</CardTitle>
              <CardDescription className="text-xs mt-0.5">Distribution across all orders</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-2">
              {data?.ordersByStatus && <PieChart data={data.ordersByStatus} size={160} />}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Revenue Bar Chart */}
      {monthly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Revenue Breakdown</CardTitle>
            <CardDescription className="text-xs mt-0.5">Revenue and order count per month</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={barData} />
          </CardContent>
        </Card>
      )}

      {/* AI Forecast & Projections */}
      <Card className="border-indigo-100 bg-linear-to-br from-white to-indigo-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Brain className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">AI Forecast & Projections <Sparkles className="w-3.5 h-3.5 text-indigo-400" /></CardTitle>
                <CardDescription className="text-xs mt-0.5">6-month predictions powered by Holt-Winters + Linear Regression</CardDescription>
              </div>
            </div>
            {predictions?.modelsUsed && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-medium">{predictions.modelsUsed.statistical}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {predLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Brain className="w-6 h-6 text-indigo-400 animate-pulse mx-auto" />
                <p className="text-xs text-gray-400">Generating forecasts...</p>
              </div>
            </div>
          ) : !predictions ? (
            <p className="text-sm text-gray-400 py-6 text-center">Forecast data unavailable</p>
          ) : (
            <div className="space-y-6">
              {/* Trend Badges */}
              <div className="flex flex-wrap gap-2">
                {(["revenue", "orders", "customers"] as const).map((key) => {
                  const m = predictions.forecasts[key];
                  const TrendIcon = m.trend === "growing" ? TrendingUp : m.trend === "declining" ? TrendingDown : ArrowUpRight;
                  const colors = m.trend === "growing" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : m.trend === "declining" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-700 border-gray-200";
                  return (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${colors}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">{key}</span>
                      <span>{m.trend} ({m.avgGrowthRate >= 0 ? "+" : ""}{m.avgGrowthRate.toFixed(1)}%)</span>
                      {m.seasonality && <span className="text-[10px] opacity-70">· Seasonal</span>}
                    </div>
                  );
                })}
              </div>
              {/* Revenue Forecast Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Revenue Projection (6 months)</h4>
                <ForecastChart metric={predictions.forecasts.revenue} label="rev" format="currency" />
              </div>
              {/* Orders Forecast Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Orders Projection (6 months)</h4>
                <ForecastChart metric={predictions.forecasts.orders} label="ord" format="number" />
              </div>
              {/* AI Insight */}
              {predictions.aiInsight && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-indigo-700">AI-Generated Insight</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{predictions.aiInsight}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlet Performance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Outlet Performance</CardTitle>
              <CardDescription className="text-xs mt-0.5">All-time revenue and orders by location</CardDescription>
            </div>
            <Link href="/admin-portal/outlets">
              <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {outlets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No outlet data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-3 text-xs">Outlet</th>
                    <th className="text-right font-medium text-gray-500 pb-3 text-xs">Total Orders</th>
                    <th className="text-right font-medium text-gray-500 pb-3 text-xs">Revenue</th>
                    <th className="text-right font-medium text-gray-500 pb-3 text-xs">Turnaround</th>
                    <th className="text-right font-medium text-gray-500 pb-3 text-xs w-44">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {outlets.map((outlet) => (
                    <tr key={outlet.id} className="hover:bg-gray-50/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
                            <Store className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{outlet.name}</p>
                            <p className="text-xs text-gray-400">{outlet.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">{outlet.totalOrders.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(outlet.totalRevenue)}</td>
                      <td className="py-3 text-right text-gray-600">{Math.round(outlet.avgTurnaroundHours)}h</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                outlet.capacityLoadPercent >= 80 ? "bg-red-500" :
                                outlet.capacityLoadPercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(outlet.capacityLoadPercent, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-8 text-right ${
                            outlet.capacityLoadPercent >= 80 ? "text-red-600" :
                            outlet.capacityLoadPercent >= 60 ? "text-amber-600" : "text-gray-600"
                          }`}>
                            {outlet.capacityLoadPercent}%
                          </span>
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

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin-portal/orders", icon: Package, label: "Orders", sub: `${(overview?.activeOrders ?? 0).toLocaleString("en-IN")} active` },
          { href: "/admin-portal/customers", icon: Users, label: "Customers", sub: `${(overview?.totalCustomers ?? 0).toLocaleString("en-IN")} total` },
          { href: "/admin-portal/reports", icon: BarChart3, label: "Reports", sub: "Analytics & insights" },
          { href: "/admin-portal/staff", icon: UserCog, label: "Staff", sub: `${(overview?.totalStaff ?? 0).toLocaleString("en-IN")} members` },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer group">
              <CardContent className="pt-5 pb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
                  <link.icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
