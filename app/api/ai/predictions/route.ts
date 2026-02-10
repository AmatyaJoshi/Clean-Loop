import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forecastMultipleMetrics, type DataPoint, type ForecastResult } from "@/lib/forecasting";
import { analyticsGenerate, isHFAvailable } from "@/lib/huggingface";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["staff", "outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

/* ── In-memory prediction cache (10 min TTL) ── */
let predictionCache: { data: any; ts: number } | null = null;
const CACHE_TTL = 10 * 60_000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminLike((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return cache if fresh
  if (predictionCache && Date.now() - predictionCache.ts < CACHE_TTL) {
    return NextResponse.json(predictionCache.data);
  }

  try {
    // Fetch historical monthly data for forecasting
    const [monthlyRevenue, monthlyOrders, monthlyCustomers, yearlyRevenue] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT DATE_FORMAT(p.paidAt, '%Y-%m') AS period,
               CAST(SUM(p.amount) AS DECIMAL(15,2)) AS value
        FROM payment p
        WHERE p.status IN ('verified','completed') AND p.paidAt IS NOT NULL
        GROUP BY DATE_FORMAT(p.paidAt, '%Y-%m') ORDER BY period
      `) as Promise<DataPoint[]>,

      prisma.$queryRawUnsafe(`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS period,
               COUNT(*) AS value
        FROM \`order\`
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY period
      `) as Promise<DataPoint[]>,

      prisma.$queryRawUnsafe(`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS period,
               COUNT(*) AS value
        FROM customer
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY period
      `) as Promise<DataPoint[]>,

      prisma.$queryRawUnsafe(`
        SELECT YEAR(p.paidAt) AS yr,
               CAST(SUM(p.amount) AS DECIMAL(15,2)) AS value
        FROM payment p
        WHERE p.status IN ('verified','completed') AND p.paidAt IS NOT NULL
        GROUP BY YEAR(p.paidAt) ORDER BY yr
      `) as Promise<any[]>,
    ]);

    // Convert BigInt values to numbers
    const toNum = (arr: any[]): DataPoint[] =>
      arr.map((r) => ({
        period: String(r.period),
        value: Number(r.value),
      }));

    const toNumYearly = (arr: any[]): DataPoint[] =>
      arr.map((r) => ({
        period: String(r.yr),
        value: Number(r.value),
      }));

    const datasets = {
      revenue: toNum(monthlyRevenue),
      orders: toNum(monthlyOrders),
      customers: toNum(monthlyCustomers),
    };

    // Generate 6-month forecast for each metric
    const forecasts = forecastMultipleMetrics(datasets, 6);

    // Yearly forecast (3 years out)
    const yearlyForecasts = forecastMultipleMetrics(
      { revenue: toNumYearly(yearlyRevenue) },
      3,
    );

    // Generate AI narrative insight if HF is available
    let aiInsight: string | null = null;
    if (isHFAvailable()) {
      try {
        const revenueData = datasets.revenue.slice(-6);
        const orderData = datasets.orders.slice(-6);
        const revForecast = forecasts.revenue;

        const prompt = `You are a senior business analyst for CleanLoop, a premium laundry service chain in India.

Based on the following data, provide a concise business insight (3-4 sentences):

RECENT MONTHLY REVENUE (last 6 months):
${revenueData.map((d) => `${d.period}: ₹${d.value.toLocaleString("en-IN")}`).join("\n")}

RECENT MONTHLY ORDERS (last 6 months):
${orderData.map((d) => `${d.period}: ${d.value.toLocaleString("en-IN")}`).join("\n")}

FORECAST TREND: ${revForecast.trend} (avg monthly growth: ${revForecast.avgGrowthRate}%)
PROJECTED NEXT MONTH REVENUE: ₹${revForecast.forecasts[0]?.predicted.toLocaleString("en-IN") ?? "N/A"}
SEASONALITY DETECTED: ${revForecast.seasonality ? "Yes" : "No"}

Provide actionable insights about business trajectory, seasonal patterns, and recommendations. Use ₹ for currency. Be specific with numbers.`;

        aiInsight = await analyticsGenerate(
          "You are a data-driven business analyst. Give concise, actionable insights. Use bold for key metrics. Keep response under 100 words.",
          prompt,
          256,
        );
      } catch {
        // HF call failed — that's fine, we still have statistical forecasts
        aiInsight = null;
      }
    }

    // Build response
    const result = {
      forecasts,
      yearlyForecasts: { revenue: yearlyForecasts.yearlyRevenue },
      aiInsight,
      generatedAt: new Date().toISOString(),
      modelsUsed: {
        statistical: "Holt-Winters + Linear Regression",
        narrative: isHFAvailable() ? "Mistral-7B-Instruct-v0.3" : "none",
      },
    };

    predictionCache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Predictions error:", error);
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 });
  }
}
