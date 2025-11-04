import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ChartStyle, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/forecasting/chart';
import { Forecast } from '@/types/models';
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

type ChartDataPoint = {
  date: string;
  historical?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
};

const ForecastDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    historical: true,
    predicted: true,
    confidence: true,
  });

  useEffect(() => {
    const fetchForecastDetails = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Import mock data
        const { mockForecasts } = await import('@/services/mockData');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find the forecast for this product
        const forecastData = mockForecasts.find(f => f.product_id.toString() === productId);
        
        if (!forecastData) {
          setError('Forecast not found');
          return;
        }
        
        setForecast(forecastData);
        
        // Generate mock historical data (7 days before forecast)
        const historicalData: ChartDataPoint[] = Array.from({ length: 7 }, (_, i) => {
          const baseQty = forecastData.summary.avg_daily;
          const variance = baseQty * 0.2;
          const quantity = Math.max(1, Math.floor(baseQty + (Math.random() - 0.5) * variance * 2));
          return {
            date: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            historical: quantity,
            predicted: undefined,
            lowerBound: quantity * 0.9,
            upperBound: quantity * 1.1,
          };
        });
        
        // Transform forecast data into chart format with confidence bounds
        const predictedData: ChartDataPoint[] = forecastData.predicted_demand.map(pred => {
          const margin = pred.quantity * 0.15; // 15% confidence margin
          return {
            date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            historical: undefined,
            predicted: pred.quantity,
            lowerBound: Math.floor(pred.quantity - margin),
            upperBound: Math.ceil(pred.quantity + margin),
          };
        });
        
        setChartData([...historicalData, ...predictedData]);
      } catch (err: any) {
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

  const getRiskStatus = (forecast: Forecast) => {
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
            <p className="text-xs text-muted-foreground">{new Date(forecast.summary.peak_date).toLocaleDateString()}</p>
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
                  Stockout Risk in {forecast.stockout_risk.days_until_stockout} Days
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

        {/* Demand Forecast Chart */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Demand Forecast Visualization</h2>
          
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
                    strokeDasharray="5 5"
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
              Generated on {new Date(forecast.forecast_date).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForecastDetails;
