import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { Forecast } from '@/types/models';
import { toast } from 'sonner';

const Forecasts: React.FC = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(7);

  const fetchForecasts = async () => {
    try {
      setError(null);
      const { mockForecasts } = await import('@/services/mockData');
      await new Promise(resolve => setTimeout(resolve, 500));
      setForecasts(mockForecasts);
    } catch (err: any) {
      setError('Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [horizon]);

  const getRiskStatus = (forecast: Forecast) => {
    if (forecast.stockout_risk.will_stockout && forecast.stockout_risk.days_until_stockout <= 3) {
      return { icon: '🔴', text: 'Critical', color: 'text-destructive' };
    }
    if (forecast.stockout_risk.will_stockout && forecast.stockout_risk.days_until_stockout <= 7) {
      return { icon: '🟡', text: 'Warning', color: 'text-warning' };
    }
    return { icon: '🟢', text: 'Safe', color: 'text-success' };
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Demand Forecasts</h1>
          <Button
            onClick={fetchForecasts}
            variant="outline"
            size="sm"
          >
            🔄 Refresh
          </Button>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchForecasts} />}

        {/* Horizon Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            onClick={() => setHorizon(7)}
            variant={horizon === 7 ? 'default' : 'outline'}
            size="sm"
          >
            7 Days
          </Button>
          <Button
            onClick={() => setHorizon(14)}
            variant={horizon === 14 ? 'default' : 'outline'}
            size="sm"
          >
            14 Days
          </Button>
          <Button
            onClick={() => setHorizon(30)}
            variant={horizon === 30 ? 'default' : 'outline'}
            size="sm"
          >
            30 Days
          </Button>
        </div>

        {/* Forecasts List */}
        {forecasts.length === 0 ? (
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
            {forecasts.map((forecast) => {
              const status = getRiskStatus(forecast);
              return (
                <Card key={forecast.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{forecast.product_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>SKU: {forecast.product_id}</span>
                        <span>•</span>
                        <span>Accuracy: {(100 - forecast.accuracy.mape).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${status.color} font-semibold`}>
                      <span className="text-2xl">{status.icon}</span>
                      <span className="text-sm">{status.text}</span>
                    </div>
                  </div>

                  {/* Forecast Summary */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Total Demand</p>
                        <p className="font-semibold">{forecast.summary.total_demand} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Avg Daily</p>
                        <p className="font-semibold">{forecast.summary.avg_daily.toFixed(1)} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Peak Day</p>
                        <p className="font-semibold">{new Date(forecast.summary.peak_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Peak Qty</p>
                        <p className="font-semibold">{forecast.summary.peak_qty} units</p>
                      </div>
                    </div>
                  </div>

                  {/* Stockout Risk */}
                  {forecast.stockout_risk.will_stockout && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="font-semibold text-destructive text-sm mb-1">
                            Stockout Risk in {forecast.stockout_risk.days_until_stockout} days
                          </p>
                          <p className="text-sm text-destructive/80">
                            {forecast.stockout_risk.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    View Detailed Forecast →
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
