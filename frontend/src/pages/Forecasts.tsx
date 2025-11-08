import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { toast } from 'sonner';

type BadgeStatus = {
  icon: string;
  text: string;
  color: string;
};

interface StockMovement {
  movement_id: string;
  movement_type: string;
  product_id: string;
  product_name: string;
  quantity_changed: number;
  created_at: string;
}

interface InventoryAlert {
  alert_id: string;
  product_id: string;
  product_name: string;
  alert_type: 'low_stock' | 'out_of_stock';
  is_acknowledged: boolean;
}

interface InventoryProduct {
  product_id: string;
  name: string;
  sku: string;
}

interface ForecastSummary {
  product_id: string;
  product_name: string;
  total_demand: number;
  avg_daily: number;
  peak_date: string | null;
  peak_qty: number;
  status: BadgeStatus;
  sku?: string;
}

const Forecasts: React.FC = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<ForecastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = async () => {
    try {
      setError(null);
      setLoading(true);

      const [productsRes, movementsRes, alertsRes] = await Promise.all([
        api.get('/data/inventory/products/'),
        api.get('/data/inventory/movements/'),
        api.get('/data/inventory/alerts/'),
      ]);

      const normalize = <T,>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        if (Array.isArray(payload?.results)) return payload.results as T[];
        return [];
      };

      const products = normalize<InventoryProduct>(productsRes.data);
      const movements = normalize<StockMovement>(movementsRes.data);
      const alerts = normalize<InventoryAlert>(alertsRes.data);

      const productLookup = new Map<string, InventoryProduct>(
        products.map((product) => [product.product_id, product])
      );

      const alertLookup = new Map<string, InventoryAlert>(
        alerts
          .filter((alert) => !alert.is_acknowledged)
          .map((alert) => [alert.product_id, alert])
      );

      const productDailySales = new Map<string, Map<string, number>>();

      movements.forEach((movement) => {
        if (movement.quantity_changed >= 0) {
          return;
        }

        const productId = movement.product_id;
        const productName = movement.product_name;
        const dayKey = new Date(movement.created_at).toISOString().slice(0, 10);
        const quantity = Math.abs(movement.quantity_changed);

        if (!productDailySales.has(productId)) {
          productDailySales.set(productId, new Map());
        }

        const dailySales = productDailySales.get(productId)!;
        dailySales.set(dayKey, (dailySales.get(dayKey) ?? 0) + quantity);
      });

      const buildStatus = (productId: string): BadgeStatus => {
        const alert = alertLookup.get(productId);

        if (alert) {
          if (alert.alert_type === 'out_of_stock') {
            return { icon: '🔴', text: 'Critical', color: 'text-destructive' };
          }
          return { icon: '🟡', text: 'Warning', color: 'text-warning' };
        }

        return { icon: '🟢', text: 'Stable', color: 'text-success' };
      };

      const summariesMap = new Map<string, ForecastSummary>();

      Array.from(productDailySales.entries()).forEach(([productId, dailySales]) => {
        const entries = Array.from(dailySales.entries()).sort(([a], [b]) => (a < b ? -1 : 1));

        if (entries.length === 0) {
          return;
        }

        const totalDemand = entries.reduce((sum, [, qty]) => sum + qty, 0);
        const firstDate = new Date(entries[0][0]);
        const lastDate = new Date(entries[entries.length - 1][0]);
        const diffMs = lastDate.getTime() - firstDate.getTime();
        const totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        const avgDaily = totalDemand / totalDays;

        let peakDate: string | null = null;
        let peakQty = 0;
        entries.forEach(([date, qty]) => {
          if (qty > peakQty) {
            peakQty = qty;
            peakDate = date;
          }
        });

        const productInfo = productLookup.get(productId);
        const productName = productInfo?.name ?? 'Unknown Product';

        summariesMap.set(productId, {
          product_id: productId,
          product_name: productName,
          total_demand: totalDemand,
          avg_daily: avgDaily,
          peak_date: peakDate,
          peak_qty: peakQty,
          status: buildStatus(productId),
          sku: productInfo?.sku,
        });
      });

      const ensureSummaryForProduct = (product: InventoryProduct) => {
        if (summariesMap.has(product.product_id)) {
          const existing = summariesMap.get(product.product_id)!;
          summariesMap.set(product.product_id, {
            ...existing,
            sku: product.sku,
            product_name: product.name,
            status: existing.status.text === 'Stable' ? buildStatus(product.product_id) : existing.status,
          });
          return;
        }

        summariesMap.set(product.product_id, {
          product_id: product.product_id,
          product_name: product.name,
          total_demand: 0,
          avg_daily: 0,
          peak_date: null,
          peak_qty: 0,
          status: buildStatus(product.product_id),
          sku: product.sku,
        });
      };

      products.forEach(ensureSummaryForProduct);

      const severityRank = (status: BadgeStatus) => {
        switch (status.text) {
          case 'Critical':
            return 0;
          case 'Warning':
            return 1;
          default:
            return 2;
        }
      };

      const summariesList: ForecastSummary[] = Array.from(summariesMap.values()).sort((a, b) => {
        const severityDiff = severityRank(a.status) - severityRank(b.status);
        if (severityDiff !== 0) return severityDiff;
        return b.total_demand - a.total_demand;
      });

      setSummaries(summariesList);
    } catch (err: any) {
      setError('Failed to load forecasts');
      toast.error(err.response?.data?.error || 'Failed to load demand insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const goToForecastDetails = (productId?: string) => {
    if (!productId) {
      if (summaries.length === 0) {
        toast.info('Upload more sales data to unlock analytics');
        return;
      }
      navigate(`/forecasts/${summaries[0].product_id}`);
      return;
    }
    navigate(`/forecasts/${productId}`);
  };

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h1 className="text-2xl font-bold">Demand Forecasts</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => goToForecastDetails()}
              variant="default"
              size="sm"
            >
              📊 View Detailed Analytics
            </Button>
            <Button
              onClick={fetchForecasts}
              variant="outline"
              size="sm"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchForecasts} />}

        {/* Forecasts List */}
        {summaries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">Not Enough Data</p>
            <p className="text-muted-foreground">
              You need at least 30 days of transaction data to generate forecasts.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Keep uploading your sales data!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => {
              return (
                <Card key={summary.product_id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{summary.product_name}</h3>
                    </div>
                    <div className={`flex items-center gap-2 ${summary.status.color} font-semibold`}>
                      <span className="text-2xl">{summary.status.icon}</span>
                      <span className="text-sm">{summary.status.text}</span>
                    </div>
                  </div>

                  {/* Forecast Summary */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Total Demand</p>
                        <p className="font-semibold">{summary.total_demand} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Avg Daily</p>
                        <p className="font-semibold">{summary.avg_daily.toFixed(1)} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Peak Day</p>
                        <p className="font-semibold">
                          {summary.peak_date ? new Date(summary.peak_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Peak Qty</p>
                        <p className="font-semibold">{summary.peak_qty} units</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => goToForecastDetails(summary.product_id)}
                  >
                    View Detailed Analytics →
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forecasts;
