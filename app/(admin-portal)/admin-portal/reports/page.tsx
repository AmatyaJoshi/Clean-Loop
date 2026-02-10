"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AdminShell } from "../_components/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Brain,
  CheckCircle2,
  IndianRupee,
  Package,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
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

type OutletYearlyData = Record<string, { code: string; name: string; years: { year: number; revenue: number; orders: number }[] }>;

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

type MetricsResponse = {
  overview: Overview;
  monthly: MonthlyEntry[];
  yearly: YearlyEntry[];
  outlets: OutletMetric[];
  ordersByStatus: Record<string, number>;
  outletYearly: OutletYearlyData;
  recentActivity: {
    thisMonthRevenue: number;
    thisMonthOrders: number;
    lastMonthRevenue: number;
    lastMonthOrders: number;
    growthPercent: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── SVG Charts ─────────────────────────── */

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

function LineChart({ data }: { data: { label: string; value: number }[] }) {
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
      <path d={area} fill="url(#rptAreaGrad)" />
      <path d={line} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#10b981" stroke="white" strokeWidth={1.5} />
      ))}
      {points.map((p, i) =>
        i % Math.max(1, Math.floor(points.length / 7)) === 0 || i === points.length - 1 ? (
          <text key={`l${i}`} x={p.x} y={H - 8} textAnchor="middle" className="fill-gray-500" fontSize={8}>{p.label}</text>
        ) : null
      )}
      <defs>
        <linearGradient id="rptAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
        </linearGradient>
      </defs>
    </svg>
  );
}

const YEAR_COLORS = ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#059669", "#047857", "#10b981", "#34d399"];

function ForecastChart({ metric, label, format = "currency", height = 220 }: { metric: ForecastMetric; label: string; format?: "currency" | "number"; height?: number }) {
  const pts = metric.forecasts;
  if (pts.length < 2) return <p className="text-sm text-gray-400 py-4">Insufficient data</p>;
  const W = 600, H = height, PX = 54, PY = 20, PB = 36;
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
  const fmt = (v: number) => format === "currency" ? (v >= 10000000 ? `\u20b9${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `\u20b9${(v / 100000).toFixed(1)}L` : `\u20b9${(v / 1000).toFixed(0)}K`) : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: PY + chartH - f * chartH, label: fmt(minVal + f * range) }));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`rptFcGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
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
        <path d={confArea} fill={`url(#rptFcGrad-${label})`} />
        <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.upper)}`).join(" ")} fill="none" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" />
        <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.lower)}`).join(" ")} fill="none" stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" />
        <path d={predLine} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.predicted)} r={3.5} fill="white" stroke="#6366f1" strokeWidth={2} />
            {i % Math.max(1, Math.floor(pts.length / 8)) === 0 || i === pts.length - 1 ? (
              <text x={toX(i)} y={H - 8} textAnchor="middle" className="fill-gray-500" fontSize={7.5}>{p.period}</text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 px-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-indigo-500 rounded" /> Predicted</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-indigo-500/10" /> 90% Confidence</div>
        <div className="ml-auto text-[10px] text-gray-400">R² = {metric.r2.toFixed(3)}</div>
      </div>
    </div>
  );
}

function VerticalBarChart({ data, colorKey }: { data: { label: string; value: number; extra?: string }[]; colorKey?: string }) {
  if (data.length === 0) return null;
  const W = 600, H = 220, PX = 48, PY = 16, PB = 44;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(8, Math.min(52, chartW / data.length - 6));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PY + chartH - f * chartH,
    label: formatCurrency(f * maxVal),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        {data.map((_, i) => {
          const t = data.length > 1 ? i / (data.length - 1) : 0;
          const lightness = Math.round(82 - t * 36); // 82% → 46%  (lightest oldest → darkest newest)
          const saturation = Math.round(50 + t * 30); // 50% → 80%
          return (
            <linearGradient key={`bg${i}`} id={`barG${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`hsl(160, ${saturation}%, ${lightness - 5}%)`} />
              <stop offset="100%" stopColor={`hsl(160, ${saturation}%, ${lightness + 8}%)`} />
            </linearGradient>
          );
        })}
      </defs>
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
            <rect x={x} y={PY + chartH - barH} width={barW} height={barH} rx={4} fill={`url(#barG${i})`} />
            <text x={x + barW / 2} y={H - PB + 14} textAnchor="middle" className="fill-gray-500" fontSize={8}>{d.label}</text>
            {d.extra && <text x={x + barW / 2} y={H - PB + 26} textAnchor="middle" className="fill-gray-400" fontSize={6.5}>{d.extra}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function OutletBarChart({ outlets }: { outlets: OutletMetric[] }) {
  if (outlets.length === 0) return null;
  const sorted = [...outlets].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const W = 600, H = 240, PX = 48, PY = 16, PB = 52;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const maxVal = Math.max(...sorted.map((o) => o.totalRevenue), 1);
  const barW = Math.max(16, Math.min(48, chartW / sorted.length - 8));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PY + chartH - f * chartH,
    label: formatCurrency(f * maxVal),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        {sorted.map((_, i) => {
          // Highest revenue = darkest, progressively lighter
          const t = sorted.length > 1 ? i / (sorted.length - 1) : 0;
          const lightness = Math.round(38 + t * 40); // 38% → 78%
          const saturation = Math.round(76 - t * 20); // 76% → 56%
          return (
            <linearGradient key={`og${i}`} id={`outletG${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`hsl(160, ${saturation}%, ${lightness}%)`} />
              <stop offset="100%" stopColor={`hsl(160, ${saturation}%, ${lightness + 10}%)`} />
            </linearGradient>
          );
        })}
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#f3f4f6" strokeWidth={1} />
          <text x={PX - 6} y={t.y + 3} textAnchor="end" className="fill-gray-400" fontSize={8}>{t.label}</text>
        </g>
      ))}
      {sorted.map((o, i) => {
        const x = PX + (i + 0.5) * (chartW / sorted.length) - barW / 2;
        const barH = (o.totalRevenue / maxVal) * chartH;
        return (
          <g key={o.id}>
            <rect x={x} y={PY + chartH - barH} width={barW} height={barH} rx={4} fill={`url(#outletG${i})`} />
            <text x={x + barW / 2} y={H - PB + 14} textAnchor="middle" className="fill-gray-500" fontSize={7}>{o.code}</text>
            <text x={x + barW / 2} y={H - PB + 26} textAnchor="middle" className="fill-gray-400" fontSize={6}>{o.totalOrders.toLocaleString("en-IN")} ord</text>
          </g>
        );
      })}
    </svg>
  );
}

function OutletYearlyLineChart({ data }: { data: { code: string; name: string; years: { year: number; revenue: number; orders: number }[] } }) {
  const years = data.years;
  if (years.length < 2) {
    return <p className="text-sm text-gray-400 py-4">Not enough yearly data to plot a trend</p>;
  }

  // Compute YoY growth %
  const growthData = years.map((y, i) => {
    const prev = i > 0 ? years[i - 1].revenue : null;
    const growthPct = prev && prev > 0 ? ((y.revenue - prev) / prev) * 100 : null;
    return { ...y, growthPct };
  });

  const W = 640, H = 280, PX = 56, PY = 32, PB = 50;
  const chartW = W - PX * 2, chartH = H - PY - PB;
  const maxVal = Math.max(...years.map((y) => y.revenue), 1);
  const points = growthData.map((y, i) => ({
    x: PX + (i / (years.length - 1)) * chartW,
    y: PY + chartH - (y.revenue / maxVal) * chartH,
    ...y,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PY + chartH - f * chartH,
    label: formatCurrency(f * maxVal),
  }));

  const totalRevenue = years.reduce((s, y) => s + y.revenue, 0);
  const totalOrders = years.reduce((s, y) => s + y.orders, 0);
  const peakYear = years.reduce((best, y) => y.revenue > best.revenue ? y : best, years[0]);
  const overallGrowth = years[0].revenue > 0
    ? ((years[years.length - 1].revenue - years[0].revenue) / years[0].revenue) * 100
    : 0;
  const avgYoY = growthData.filter((g) => g.growthPct !== null).length > 0
    ? growthData.filter((g) => g.growthPct !== null).reduce((s, g) => s + (g.growthPct ?? 0), 0) / growthData.filter((g) => g.growthPct !== null).length
    : 0;

  const fmtGrowth = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

  return (
    <div>
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="text-sm font-bold text-emerald-800">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Total Orders</p>
          <p className="text-sm font-bold text-emerald-800">{totalOrders.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Peak Year</p>
          <p className="text-sm font-bold text-emerald-800">{peakYear.year} ({formatCurrency(peakYear.revenue)})</p>
        </div>
        <div className={`border rounded-lg px-3 py-2 ${overallGrowth >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className={`text-[10px] font-medium uppercase tracking-wide ${overallGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>Overall Growth ({years[0].year}→{years[years.length - 1].year})</p>
          <p className={`text-sm font-bold ${overallGrowth >= 0 ? "text-emerald-800" : "text-red-800"}`}>{fmtGrowth(overallGrowth)}</p>
        </div>
        <div className={`border rounded-lg px-3 py-2 ${avgYoY >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className={`text-[10px] font-medium uppercase tracking-wide ${avgYoY >= 0 ? "text-emerald-600" : "text-red-600"}`}>Avg YoY Growth</p>
          <p className={`text-sm font-bold ${avgYoY >= 0 ? "text-emerald-800" : "text-red-800"}`}>{fmtGrowth(avgYoY)}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="outletLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#e5e7eb" strokeWidth={0.8} strokeDasharray="4 3" />
            <text x={PX - 8} y={t.y + 3} textAnchor="end" className="fill-gray-400" fontSize={8}>{t.label}</text>
          </g>
        ))}
        {/* Area fill */}
        <path d={area} fill="url(#outletLineGrad)" />
        {/* Line */}
        <path d={line} fill="none" stroke="#059669" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points with YoY growth badges */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="white" stroke="#059669" strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={2.5} fill="#059669" />
            {/* Revenue value above point */}
            <text x={p.x} y={p.y - 16} textAnchor="middle" className="fill-emerald-700" fontSize={7.5} fontWeight={600}>{formatCurrency(p.revenue)}</text>
            {/* YoY growth badge */}
            {p.growthPct !== null && (
              <>
                <rect
                  x={p.x - 18} y={p.y - 14}
                  width={36} height={13} rx={3}
                  fill={p.growthPct >= 0 ? "#d1fae5" : "#fee2e2"}
                  stroke={p.growthPct >= 0 ? "#6ee7b7" : "#fca5a5"}
                  strokeWidth={0.6}
                />
                <text
                  x={p.x} y={p.y - 5}
                  textAnchor="middle"
                  fontSize={7} fontWeight={700}
                  fill={p.growthPct >= 0 ? "#047857" : "#dc2626"}
                >
                  {p.growthPct >= 0 ? "▲" : "▼"} {Math.abs(p.growthPct).toFixed(1)}%
                </text>
              </>
            )}
            {/* Year label */}
            <text x={p.x} y={H - PB + 16} textAnchor="middle" className="fill-gray-600" fontSize={9} fontWeight={600}>{p.year}</text>
            {/* Orders below year */}
            <text x={p.x} y={H - PB + 28} textAnchor="middle" className="fill-gray-400" fontSize={7}>{p.orders.toLocaleString("en-IN")} orders</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AdminReportsPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const { data, isLoading } = useSWR<MetricsResponse>("/api/admin/metrics", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const overview = data?.overview;
  const monthly = data?.monthly ?? [];
  const yearly = data?.yearly ?? [];
  const outlets = data?.outlets ?? [];
  const statusBreakdown = data?.ordersByStatus ?? {};
  const outletYearly = data?.outletYearly ?? {};

  const { data: predictions, isLoading: predLoading } = useSWR<PredictionsResponse>("/api/ai/predictions", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });

  const totalOutletOrders = outlets.reduce((s, o) => s + o.totalOrders, 0);
  const totalOutletRevenue = outlets.reduce((s, o) => s + o.totalRevenue, 0);
  const totalActiveOrders = outlets.reduce((s, o) => s + o.activeOrders, 0);
  const avgTurnaround = outlets.length
    ? Math.round(outlets.reduce((s, o) => s + (o.avgTurnaroundHours || 0), 0) / outlets.length)
    : 0;

  const lineData = useMemo(() => monthly.map((m) => ({ label: m.month, value: m.revenue })), [monthly]);
  const yearlyBarData = useMemo(
    () => yearly.map((y) => ({ label: String(y.year), value: y.revenue, extra: `${y.orders.toLocaleString("en-IN")} ord` })),
    [yearly],
  );

  return (
    <AdminShell active="reports" title="Reports" subtitle="Comprehensive business analytics from database">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Revenue", value: overview ? formatCurrency(overview.totalRevenue) : "—", icon: IndianRupee },
          { label: "Total Orders", value: overview ? overview.totalOrders.toLocaleString("en-IN") : "—", icon: Package },
          { label: "Delivered", value: overview ? overview.completedOrders.toLocaleString("en-IN") : "—", icon: CheckCircle2 },
          { label: "Cancelled", value: overview ? overview.cancelledOrders.toLocaleString("en-IN") : "—", icon: XCircle, warn: (overview?.cancelledOrders ?? 0) > 0 },
          { label: "Avg. Order Value", value: overview ? formatCurrency(overview.avgOrderValue) : "—", icon: TrendingUp },
          { label: "Active Orders", value: overview ? overview.activeOrders.toLocaleString("en-IN") : "—", icon: Activity },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${kpi.warn ? "bg-amber-50" : "bg-emerald-50"}`}>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.warn ? "text-amber-600" : "text-emerald-600"}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.warn ? "text-amber-700" : "text-gray-900"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Yearly Revenue — Vertical Bar Chart */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yearly Revenue</CardTitle>
          <CardDescription className="text-xs">Revenue from delivered orders by year</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : yearly.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No yearly data available</p>
          ) : (
            <VerticalBarChart data={yearlyBarData} colorKey="year" />
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue Line + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
            <CardDescription className="text-xs">Revenue over the last 14 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : monthly.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No monthly data available</p>
            ) : (
              <LineChart data={lineData} />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status</CardTitle>
            <CardDescription className="text-xs">Distribution across all orders</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-2">
            {Object.keys(statusBreakdown).length > 0 ? (
              <PieChart data={statusBreakdown} size={160} />
            ) : (
              <p className="text-sm text-gray-400 py-4">No status data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Forecast & Projections */}
      <Card className="border-indigo-100 bg-linear-to-br from-white to-indigo-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Brain className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">AI-Powered Forecasts <Sparkles className="w-3.5 h-3.5 text-indigo-400" /></CardTitle>
                <CardDescription className="text-xs mt-0.5">Statistical projections: revenue, orders, and customer growth</CardDescription>
              </div>
            </div>
            {predictions?.modelsUsed && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">{predictions.modelsUsed.statistical}</span>
                {predictions.modelsUsed.narrative !== "none" && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-medium">+ {predictions.modelsUsed.narrative.split("/").pop()}</span>
                )}
              </div>
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
              {/* Trend Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                {(["revenue", "orders", "customers"] as const).map((key) => {
                  const m = predictions.forecasts[key];
                  const TrendIcon = m.trend === "growing" ? TrendingUp : m.trend === "declining" ? TrendingDown : TrendingUp;
                  const colors = m.trend === "growing" ? "border-emerald-200 bg-emerald-50" : m.trend === "declining" ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50";
                  const textColor = m.trend === "growing" ? "text-emerald-700" : m.trend === "declining" ? "text-red-700" : "text-gray-700";
                  return (
                    <div key={key} className={`border rounded-lg p-3 ${colors}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendIcon className={`w-4 h-4 ${textColor}`} />
                        <span className={`text-xs font-semibold capitalize ${textColor}`}>{key}</span>
                      </div>
                      <p className={`text-lg font-bold ${textColor}`}>{m.avgGrowthRate >= 0 ? "+" : ""}{m.avgGrowthRate.toFixed(1)}%</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Avg. growth · {m.trend}{m.seasonality ? " · Seasonal" : ""}</p>
                    </div>
                  );
                })}
              </div>

              {/* Revenue Forecast */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Revenue Projection (6 months)</h4>
                <ForecastChart metric={predictions.forecasts.revenue} label="rptRev" format="currency" />
              </div>

              {/* Orders + Customers side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Orders Projection</h4>
                  <ForecastChart metric={predictions.forecasts.orders} label="rptOrd" format="number" height={180} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Growth Projection</h4>
                  <ForecastChart metric={predictions.forecasts.customers} label="rptCust" format="number" height={180} />
                </div>
              </div>

              {/* Yearly Revenue Projection */}
              {predictions.yearlyForecasts?.revenue && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Yearly Revenue Projection (3 years)</h4>
                  <ForecastChart metric={predictions.yearlyForecasts.revenue} label="rptYr" format="currency" />
                </div>
              )}

              {/* AI Insight */}
              {predictions.aiInsight && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-indigo-700">AI-Generated Business Insight</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{predictions.aiInsight}</p>
                </div>
              )}

              {/* Model Info */}
              <div className="text-[10px] text-gray-400 flex items-center gap-3">
                <span>Generated: {new Date(predictions.generatedAt).toLocaleString()}</span>
                <span>·</span>
                <span>Models: {predictions.modelsUsed.statistical}{predictions.modelsUsed.narrative !== "none" ? ` + ${predictions.modelsUsed.narrative.split("/").pop()}` : ""}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlet Revenue — Dropdown + Line Chart */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Outlet Revenue Over Years</CardTitle>
              <CardDescription className="text-xs">Yearly revenue trend per outlet</CardDescription>
            </div>
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets (comparison)</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedOutlet === "all" ? (
            <OutletBarChart outlets={outlets} />
          ) : outletYearly[selectedOutlet] ? (
            <OutletYearlyLineChart data={outletYearly[selectedOutlet]} />
          ) : (
            <p className="text-sm text-gray-400 py-4">No data available for this outlet</p>
          )}
        </CardContent>
      </Card>

      {/* Outlet Performance Comparison Table */}
      <Card className="border-gray-200">
        <CardContent className="pt-0 px-0">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Outlet Performance Comparison (All-Time)</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outlet</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Turnaround</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {outlets.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {o.name} <span className="text-gray-400 text-xs">({o.code})</span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-900">{o.totalOrders.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 text-right text-gray-900">{o.activeOrders.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(o.totalRevenue)}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{Math.round(o.avgTurnaroundHours)}h</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          o.capacityLoadPercent >= 80 ? "bg-red-50 text-red-700" :
                          o.capacityLoadPercent >= 60 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {o.capacityLoadPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-5 py-3 text-gray-900">Total</td>
                    <td className="px-5 py-3 text-right text-gray-900">{totalOutletOrders.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-gray-900">{totalActiveOrders.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(totalOutletRevenue)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{avgTurnaround}h avg</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

