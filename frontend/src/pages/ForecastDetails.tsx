import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ChartStyle, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/forecasting/chart';
import api from '@/services/api';
import { Transaction } from '@/types/models';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface InventoryProduct {
  product_id: string;
  name: string;
  sku: string;
  current_stock: number;
  reorder_point: number;
  unit_price?: number;
  total_sales?: number;
}

interface ForecastInsight {
  product_id: string;
  product_name: string;
  summary: {
    total_demand: number;
    avg_daily: number;
    peak_date: string | null;
    peak_qty: number;
  };
  stockout_risk: {
    will_stockout: boolean;
    days_until_stockout: number;
    confidence: number;
    recommendation: string;
  };
  accuracy: {
    mape: number;
    data_points_used: number;
  };
  sku?: string;
  current_stock?: number;
}

type ChartDataPoint = {
  date: string;
  historical?: number | null;
  predicted?: number | null;
  lowerBound?: number;
  upperBound?: number;
};

interface ReorderSuggestion {
  recommendedQuantity: number;
  predictedDemand: number;
  currentStock: number;
  netPosition: number;
  coverageDays: number | null;
  avgDailyPredicted: number;
  reorderPoint: number;
  horizonDays: number;
}

const ForecastDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<ForecastInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    historical: true,
    predicted: false,
    confidence: false,
  });
  const [historicalPoints, setHistoricalPoints] = useState<ChartDataPoint[]>([]);
  const [forecastActivated, setForecastActivated] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [reorderSuggestion, setReorderSuggestion] = useState<ReorderSuggestion | null>(null);

  useEffect(() => {
    const normalize = <T,>(payload: any): T[] => {
      if (Array.isArray(payload)) return payload as T[];
      if (Array.isArray(payload?.results)) return payload.results as T[];
      return [];
    };

    const numberize = (value: number | string | undefined | null): number => {
      if (value === undefined || value === null) return 0;
      if (typeof value === 'number') return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const fetchForecastDetails = async () => {
      try {
  setError(null);
  setLoading(true);
  setForecastActivated(false);
  setReorderSuggestion(null);
  setVisibleLines({ historical: true, predicted: false, confidence: false });

        const [productsRes, transactionsRes] = await Promise.all([
          api.get('/data/inventory/products/'),
          api.get('/data/transactions/', {
            params: {
              limit: 1000,
              sort_by: 'date',
              sort_order: 'asc',
              product_id: productId,
            },
          }),
        ]);

        const products = normalize<InventoryProduct>(productsRes.data);
        const transactions = normalize<Transaction>(transactionsRes.data);

        const product = products.find((p) => p.product_id === productId);
        if (!product) {
          setError('Product not found');
          return;
        }

        const dailySales = new Map<string, number>();

        transactions.forEach((transaction) => {
          if (transaction.product_id !== productId) return;
          const quantity = numberize(transaction.quantity);
          if (quantity <= 0) return;
          const txnDate = transaction.date || transaction.created_at;
          if (!txnDate) return;
          const dayKey = new Date(txnDate).toISOString().slice(0, 10);
          dailySales.set(dayKey, (dailySales.get(dayKey) ?? 0) + quantity);
        });

        const sortedEntries = Array.from(dailySales.entries()).sort(([a], [b]) => (a < b ? -1 : 1));

        if (sortedEntries.length === 0) {
          setForecast({
            product_id: product.product_id,
            product_name: product.name,
            sku: product.sku,
            current_stock: product.current_stock,
            summary: {
              total_demand: 0,
              avg_daily: 0,
              peak_date: null,
              peak_qty: 0,
            },
            stockout_risk: {
              will_stockout: false,
              days_until_stockout: Number.POSITIVE_INFINITY,
              confidence: 0,
              recommendation: 'Not enough sales data to estimate risk',
            },
            accuracy: {
              mape: 0,
              data_points_used: 0,
            },
          });
            setHistoricalPoints([]);
            setChartData([]);
            setGeneratedAt(new Date().toISOString());
          return;
        }

        const totalDemand = sortedEntries.reduce((acc, [, qty]) => acc + qty, 0);
        const firstDate = new Date(sortedEntries[0][0]);
        const lastDate = new Date(sortedEntries[sortedEntries.length - 1][0]);
        const totalDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const avgDaily = totalDemand / totalDays;

        let peakDate: string | null = null;
        let peakQty = 0;
        sortedEntries.forEach(([date, qty]) => {
          if (qty > peakQty) {
            peakQty = qty;
            peakDate = date;
          }
        });

        const historicalData: ChartDataPoint[] = sortedEntries.map(([date, qty]) => {
          const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return {
            date: label,
            historical: qty,
            predicted: null,
          };
        });

        const volatility = Math.sqrt(
          sortedEntries.reduce((sum, [, qty]) => {
            const diff = qty - avgDaily;
            return sum + diff * diff;
          }, 0) / sortedEntries.length
        );
        setHistoricalPoints(historicalData);
        setChartData(historicalData);
        setGeneratedAt(new Date().toISOString());

        const daysUntilStockout = avgDaily > 0 ? product.current_stock / avgDaily : Number.POSITIVE_INFINITY;
        const willStockout = Number.isFinite(daysUntilStockout) && daysUntilStockout <= 30;
        const stockoutConfidence = Math.min(0.95, Math.max(0.4, (avgDaily > 0 ? (avgDaily / Math.max(1, product.reorder_point)) : 0.4)));

        const errorMargin = avgDaily > 0 ? (volatility / Math.max(avgDaily, 1)) * 100 : 0;

        setForecast({
          product_id: product.product_id,
          product_name: product.name,
          sku: product.sku,
          current_stock: product.current_stock,
          summary: {
            total_demand: totalDemand,
            avg_daily: avgDaily,
            peak_date: peakDate,
            peak_qty: peakQty,
          },
          stockout_risk: {
            will_stockout: willStockout,
            days_until_stockout: Number.isFinite(daysUntilStockout) ? Math.max(0, Math.round(daysUntilStockout)) : Number.POSITIVE_INFINITY,
            confidence: willStockout ? stockoutConfidence : 0.45,
            recommendation: willStockout
              ? `Reorder stock within ${Math.max(1, Math.round(daysUntilStockout))} days to avoid a stockout.`
              : 'Stock levels look stable based on recent demand.',
          },
          accuracy: {
            mape: Number.isFinite(errorMargin) ? Math.min(100, Math.max(0, errorMargin)) : 0,
            data_points_used: sortedEntries.length,
          },
        });
      } catch (err) {
        setError('Failed to load forecast details');
      } finally {
        setLoading(false);
      }
    };

    fetchForecastDetails();
  }, [productId]);

  const toggleLine = (dataKey: string) => {
    setVisibleLines(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const activateForecast = async () => {
    if (!productId || forecastActivated) return;

    try {
      setForecastLoading(true);
      const response = await api.get(`/data/forecast/${productId}/`, {
        params: { periods: 30 },
      });

      const forecastPoints: ChartDataPoint[] = (response.data?.forecast ?? []).map((entry: any) => {
        const baseDate = entry?.date ? new Date(`${entry.date}T00:00:00`) : new Date();
        const formatNumber = (value: any) => {
          const numeric = Number(value);
          return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
        };

        return {
          date: baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          predicted: formatNumber(entry?.predicted),
          lowerBound: formatNumber(entry?.lower),
          upperBound: formatNumber(entry?.upper),
        };
      });

      if (forecastPoints.length === 0) {
        toast.info('Forecast model did not return any future points.');
        return;
      }

      setChartData([...historicalPoints, ...forecastPoints]);
      setVisibleLines(prev => ({ ...prev, predicted: true, confidence: true }));
      setForecastActivated(true);

      if (response.data?.generated_at) {
        setGeneratedAt(response.data.generated_at);
      }

      if (response.data?.metrics) {
        const { mape, data_points } = response.data.metrics;
        setForecast(curr =>
          curr
            ? {
                ...curr,
                accuracy: {
                  mape: typeof mape === 'number' ? mape : curr.accuracy.mape,
                  data_points_used: typeof data_points === 'number' ? data_points : curr.accuracy.data_points_used,
                },
              }
            : curr
        );
      }

      if (response.data?.reorder) {
        const reorder = response.data.reorder;
        const toNumber = (value: unknown): number => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const normalizeCoverage = (): number | null => {
          const raw = reorder.coverage_days;
          if (raw === null || raw === undefined) {
            return null;
          }
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : null;
        };

        const horizonCandidate = Number(response.data?.periods ?? 30);
        setReorderSuggestion({
          recommendedQuantity: Math.max(0, Math.round(toNumber(reorder.recommended_quantity))),
          predictedDemand: toNumber(reorder.predicted_demand),
          currentStock: toNumber(reorder.current_stock),
          netPosition: toNumber(reorder.net_position),
          coverageDays: normalizeCoverage(),
          avgDailyPredicted: toNumber(reorder.avg_daily_predicted),
          reorderPoint: toNumber(reorder.reorder_point),
          horizonDays: Number.isFinite(horizonCandidate) ? horizonCandidate : 30,
        });
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to generate forecast';
      toast.error(message);
    } finally {
      setForecastLoading(false);
    }
  };

  const getRiskStatus = (forecast: ForecastInsight) => {
    if (forecast.stockout_risk.will_stockout && forecast.stockout_risk.days_until_stockout <= 3) {
      return { icon: '🔴', text: 'Critical', color: 'text-red-600 dark:text-red-400' };
    }
    if (forecast.stockout_risk.will_stockout && forecast.stockout_risk.days_until_stockout <= 7) {
      return { icon: '🟡', text: 'Warning', color: 'text-yellow-600 dark:text-yellow-400' };
    }
    return { icon: '🟢', text: 'Safe', color: 'text-green-600 dark:text-green-400' };
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !forecast) {
    return (
      <div className="mobile-padding min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-6">
          <Button onClick={() => navigate('/forecasts')} variant="ghost" size="sm" className="mb-4">
            ← Back to Forecasts
          </Button>
          <ErrorBanner message={error || 'Forecast not found'} onRetry={() => navigate('/forecasts')} />
        </div>
      </div>
    );
  }

  const status = getRiskStatus(forecast);
  const generatedAtLabel = generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString();

  const formattedPeakDate = forecast.summary.peak_date
    ? new Date(forecast.summary.peak_date + 'T00:00:00').toLocaleDateString()
    : '—';

  const formattedStockout = Number.isFinite(forecast.stockout_risk.days_until_stockout)
    ? `${forecast.stockout_risk.days_until_stockout}`
    : 'N/A';

  return (
    <div className="mobile-padding min-h-screen bg-background pb-24">
      <ChartStyle />
      <div className="max-w-6xl mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <Button onClick={() => navigate('/forecasts')} variant="ghost" size="sm" className="mb-4">
            ← Back to Forecasts
          </Button>
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{forecast.product_name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>SKU: {forecast.product_id}</span>
                <span>SKU: {forecast.sku ?? forecast.product_id}</span>
                <span>•</span>
                <span>Model Accuracy: {(100 - forecast.accuracy.mape).toFixed(0)}%</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${status.color} font-semibold`}>
              <span className="text-2xl">{status.icon}</span>
              <span className="text-sm">{status.text}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Total Forecast Demand</p>
            <p className="text-2xl font-bold">{forecast.summary.total_demand}</p>
            <p className="text-xs text-muted-foreground">units</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Average Daily</p>
            <p className="text-2xl font-bold">{forecast.summary.avg_daily.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">units/day</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Peak Demand</p>
            <p className="text-2xl font-bold">{forecast.summary.peak_qty}</p>
            <p className="text-xs text-muted-foreground">{formattedPeakDate}</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Model Error (MAPE)</p>
            <p className="text-2xl font-bold">{forecast.accuracy.mape.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{forecast.accuracy.data_points_used} data points</p>
          </Card>
        </div>

        {/* Stockout Risk Alert */}
        {forecast.stockout_risk.will_stockout && (
          <Card className="p-4 mb-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Stockout Risk in {formattedStockout} Days
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                  {forecast.stockout_risk.recommendation}
                </p>
                <div className="text-xs text-red-700 dark:text-red-300">
                  Risk Confidence: {(forecast.stockout_risk.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </Card>
        )}

        {forecastActivated && reorderSuggestion && (
          <Card className="p-6 mb-6 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Reorder Guidance ({reorderSuggestion.horizonDays} Day Horizon)</h2>
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  {reorderSuggestion.recommendedQuantity > 0
                    ? `Plan to reorder ${reorderSuggestion.recommendedQuantity} units to remain stocked for the next ${reorderSuggestion.horizonDays} days.`
                    : `Current inventory comfortably covers the next ${reorderSuggestion.horizonDays} days of projected demand.`}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm w-full md:w-auto">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Current Stock</p>
                  <p className="font-semibold">{Math.round(reorderSuggestion.currentStock)} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Predicted Demand</p>
                  <p className="font-semibold">{Math.round(reorderSuggestion.predictedDemand)} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Coverage</p>
                  <p className="font-semibold">
                    {Number.isFinite(reorderSuggestion.coverageDays ?? NaN)
                      ? `${Math.max(0, Math.floor(reorderSuggestion.coverageDays ?? 0))} days`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Projected Balance</p>
                  <p className={`font-semibold ${reorderSuggestion.netPosition < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {reorderSuggestion.netPosition >= 0
                      ? `+${Math.round(reorderSuggestion.netPosition)} units`
                      : `${Math.round(reorderSuggestion.netPosition)} units`}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Reorder point: {Math.round(reorderSuggestion.reorderPoint)} units
            </p>
          </Card>
        )}

        {/* Demand Forecast Chart */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Demand Forecast Visualization</h2>
          <div className="flex justify-end mb-4">
            <Button
              variant={forecastActivated ? 'secondary' : 'default'}
              size="sm"
              onClick={activateForecast}
              disabled={forecastActivated || forecastLoading}
            >
              {forecastActivated ? 'Forecast Ready' : forecastLoading ? 'Generating…' : 'Forecast'}
            </Button>
          </div>

          {chartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Not enough sales movements yet to draw a chart. Record new transactions to unlock this view.
            </div>
          ) : (
            <>
              <ChartContainer height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--chart-axis)"
                      style={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="var(--chart-axis)"
                      style={{ fontSize: 12 }}
                      label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend
                      content={
                        <ChartLegendContent
                          onToggle={toggleLine}
                          active={visibleLines}
                        />
                      }
                    />

                    {/* Confidence Band */}
                    {visibleLines.confidence && (
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        stackId="confidence"
                        stroke="none"
                        fill="var(--chart-band)"
                        fillOpacity={0.3}
                        name="Confidence Band"
                      />
                    )}

                    {/* Historical Data Line */}
                    {visibleLines.historical && (
                      <Line
                        type="monotone"
                        dataKey="historical"
                        stroke="var(--chart-historical)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Historical"
                        connectNulls={false}
                      />
                    )}

                    {/* Predicted Data Line */}
                    {visibleLines.predicted && (
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="var(--chart-predicted)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Predicted"
                        connectNulls={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p>• <strong>Historical:</strong> Past sales data used to train the model</p>
                <p>• <strong>Predicted:</strong> Forecasted demand for upcoming days</p>
                <p>• <strong>Confidence Band:</strong> Expected range of demand (80% confidence interval)</p>
              </div>
            </>
          )}
        </Card>

        {/* Model Performance Metrics */}
  <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Model Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Mean Absolute Percentage Error</p>
              <p className="text-3xl font-bold">{forecast.accuracy.mape.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Training Data Points</p>
              <p className="text-3xl font-bold">{forecast.accuracy.data_points_used}</p>
              <p className="text-xs text-muted-foreground mt-1">Historical data used</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm">
              <strong>Model Used:</strong> Facebook Prophet (Time Series Forecasting)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated on {generatedAtLabel}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForecastDetails;
