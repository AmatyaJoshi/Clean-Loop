/**
 * Statistical Forecasting Engine
 *
 * Pure TypeScript implementation of time-series forecasting methods.
 * Used for generating numeric projections from historical DB data.
 *
 * Methods:
 * - Linear regression for trend extraction
 * - Simple exponential smoothing
 * - Holt-Winters additive seasonal model (monthly cycle)
 * - Confidence interval estimation
 */

export type DataPoint = { period: string; value: number };
export type Forecast = {
  period: string;
  predicted: number;
  lower: number; // 90% confidence lower bound
  upper: number; // 90% confidence upper bound
};

export type ForecastResult = {
  forecasts: Forecast[];
  trend: "growing" | "declining" | "stable";
  trendStrength: number; // 0-1 how strong the trend is
  seasonality: boolean;
  avgGrowthRate: number; // monthly growth rate %
  r2: number; // R² of the linear model fit
};

/* ─── Linear Regression ── */

function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const meanY = sumY / n;

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * i)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

/* ─── Seasonality Detection ── */

function detectSeasonality(values: number[], period = 12): number[] | null {
  if (values.length < period * 2) return null;
  // Detrend
  const { slope, intercept } = linearRegression(values);
  const detrended = values.map((v, i) => v - (intercept + slope * i));
  // Average seasonal indices
  const seasonal = new Array(period).fill(0);
  const counts = new Array(period).fill(0);
  detrended.forEach((v, i) => {
    seasonal[i % period] += v;
    counts[i % period]++;
  });
  for (let i = 0; i < period; i++) {
    seasonal[i] = counts[i] > 0 ? seasonal[i] / counts[i] : 0;
  }
  // Check if seasonality is significant (variance of seasonal > 10% of mean value)
  const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
  const seasonalVar = seasonal.reduce((s, v) => s + v * v, 0) / period;
  if (Math.sqrt(seasonalVar) < meanVal * 0.05) return null;
  return seasonal;
}

/* ─── Holt's Linear Trend Exponential Smoothing ── */

function holtsSmoothing(
  values: number[],
  alpha = 0.3,
  beta = 0.1,
  horizons = 6,
): number[] {
  if (values.length < 2) {
    return new Array(horizons).fill(values[0] ?? 0);
  }
  let level = values[0];
  let trend = values[1] - values[0];

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecasts: number[] = [];
  for (let h = 1; h <= horizons; h++) {
    forecasts.push(Math.max(0, level + trend * h));
  }
  return forecasts;
}

/* ─── Confidence Intervals ── */

function computeConfidence(
  historical: number[],
  predicted: number[],
  zScore = 1.645, // 90% CI
): { lower: number[]; upper: number[] } {
  // Use residual std from last 6 months, scaled by forecast horizon
  const recent = historical.slice(-Math.min(6, historical.length));
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
  const std = Math.sqrt(variance);

  const lower = predicted.map((p, i) => {
    const spread = std * zScore * Math.sqrt(1 + i * 0.15);
    return Math.max(0, p - spread);
  });
  const upper = predicted.map((p, i) => {
    const spread = std * zScore * Math.sqrt(1 + i * 0.15);
    return p + spread;
  });
  return { lower, upper };
}

/* ─── Month Label Generator ── */

function generateFutureMonths(lastPeriod: string, count: number): string[] {
  // lastPeriod format: "YYYY-MM"
  const [yearStr, monthStr] = lastPeriod.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    labels.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return labels;
}

function generateFutureYears(lastYear: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(lastYear + i + 1));
}

/* ─── Main Forecast Function ── */

export function forecastMonthly(
  data: DataPoint[],
  horizons = 6,
): ForecastResult {
  if (data.length < 3) {
    return {
      forecasts: [],
      trend: "stable",
      trendStrength: 0,
      seasonality: false,
      avgGrowthRate: 0,
      r2: 0,
    };
  }

  const values = data.map((d) => d.value);
  const lastPeriod = data[data.length - 1].period;

  // Linear regression for trend info
  const lr = linearRegression(values);

  // Seasonal component
  const seasonal = detectSeasonality(values);

  // Deseasonalize if seasonal
  let adjusted = values;
  if (seasonal) {
    adjusted = values.map((v, i) => v - seasonal[i % seasonal.length]);
  }

  // Holt's method on (possibly deseasonalized) data
  let predicted = holtsSmoothing(adjusted, 0.35, 0.15, horizons);

  // Re-add seasonality
  if (seasonal) {
    const startIdx = values.length;
    predicted = predicted.map((p, i) => Math.max(0, p + seasonal[(startIdx + i) % seasonal.length]));
  }

  // Confidence intervals
  const { lower, upper } = computeConfidence(values, predicted);

  // Generate period labels
  const isYearly = !lastPeriod.includes("-") || lastPeriod.length === 4;
  const futureLabels = isYearly
    ? generateFutureYears(parseInt(lastPeriod, 10), horizons)
    : generateFutureMonths(lastPeriod, horizons);

  const forecasts: Forecast[] = predicted.map((p, i) => ({
    period: futureLabels[i],
    predicted: Math.round(p * 100) / 100,
    lower: Math.round(lower[i] * 100) / 100,
    upper: Math.round(upper[i] * 100) / 100,
  }));

  // Trend classification
  const trendStrength = Math.min(1, Math.abs(lr.r2));
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
  const slopePercent = avgVal > 0 ? (lr.slope / avgVal) * 100 : 0;
  let trend: "growing" | "declining" | "stable" = "stable";
  if (slopePercent > 1 && lr.r2 > 0.2) trend = "growing";
  else if (slopePercent < -1 && lr.r2 > 0.2) trend = "declining";

  // Average month-over-month growth rate
  const growthRates: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      growthRates.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
    }
  }
  const avgGrowthRate = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0;

  return {
    forecasts,
    trend,
    trendStrength,
    seasonality: !!seasonal,
    avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
    r2: Math.round(lr.r2 * 1000) / 1000,
  };
}

/**
 * Forecast multiple metrics at once (revenue, orders, customers).
 */
export function forecastMultipleMetrics(
  datasets: Record<string, DataPoint[]>,
  horizons = 6,
): Record<string, ForecastResult> {
  const results: Record<string, ForecastResult> = {};
  for (const [key, data] of Object.entries(datasets)) {
    results[key] = forecastMonthly(data, horizons);
  }
  return results;
}
