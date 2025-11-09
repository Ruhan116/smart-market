import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { Customer } from '@/types/models';

type CustomersSummary = {
  total_customers: number;
  risk_counts: Record<'high' | 'medium' | 'low', number>;
  segment_counts: Record<'champion' | 'loyal' | 'potential' | 'at_risk' | 'dormant', number>;
  last_refreshed_at: string | null;
};

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'champion'>('all');

  const fetchCustomers = async (options?: { refresh?: boolean }) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get('data/customers/', {
        params: options?.refresh ? { refresh: 'true' } : undefined,
      });

      setCustomers(data.customers);
      setSummary(data.summary ?? null);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[customers] failed to load live data', err);
      try {
        const { mockCustomers } = await import('@/services/mockData');
        setCustomers(mockCustomers);
        setSummary(null);
        setIsFallback(true);
        setError('Live customer analytics unavailable. Showing sample data.');
      } catch (fallbackError) {
        console.error('[customers] failed to load mock data', fallbackError);
        setCustomers([]);
        setSummary(null);
        setIsFallback(true);
        setError('Failed to load customers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = customers.filter(customer => {
    if (filter === 'at_risk') return customer.churn_analysis.churn_risk_level === 'high';
    if (filter === 'champion') return customer.churn_analysis.rfm_segment === 'champion';
    return true;
  });

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'champion': return 'bg-success/10 text-success border-success/20';
      case 'loyal': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'potential': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'at_risk': return 'bg-warning/10 text-warning border-warning/20';
      case 'dormant': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading customers..." />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Customer Analysis</h1>

        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => void fetchCustomers({ refresh: !isFallback })}
          />
        )}

        {summary && !isFallback && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
              <p className="text-2xl font-semibold">{summary.total_customers}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">High Risk</p>
              <p className="text-2xl font-semibold text-destructive">
                {summary.risk_counts.high}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Champions</p>
              <p className="text-2xl font-semibold text-success">
                {summary.segment_counts.champion}
              </p>
            </Card>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All Customers
          </Button>
          <Button
            onClick={() => setFilter('at_risk')}
            variant={filter === 'at_risk' ? 'default' : 'outline'}
            size="sm"
          >
            At Risk
          </Button>
          <Button
            onClick={() => setFilter('champion')}
            variant={filter === 'champion' ? 'default' : 'outline'}
            size="sm"
          >
            Champions
          </Button>
        </div>

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No customers found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{customer.name}</h3>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground mb-2">📞 {customer.phone}</p>
                    )}
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getSegmentColor(customer.churn_analysis.rfm_segment)}`}>
                      {customer.churn_analysis.rfm_segment.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-xl font-bold">৳{customer.purchase_metrics.total_spent.toLocaleString()}</p>
                  </div>
                </div>

                {/* Purchase Metrics */}
                <div className="grid grid-cols-3 gap-3 text-sm mb-3 bg-muted/30 rounded-lg p-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Purchases</p>
                    <p className="font-semibold">{customer.purchase_metrics.purchase_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Avg Value</p>
                    <p className="font-semibold">৳{customer.purchase_metrics.avg_value.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Days Since</p>
                    <p className="font-semibold">{customer.purchase_metrics.days_since}d</p>
                  </div>
                </div>

                {/* Churn Risk */}
                <div className={`p-3 rounded-lg mb-3 ${
                  customer.churn_analysis.churn_risk_level === 'high' ? 'bg-destructive/10 border border-destructive/20' :
                  customer.churn_analysis.churn_risk_level === 'medium' ? 'bg-warning/10 border border-warning/20' :
                  'bg-success/10 border border-success/20'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getRiskIcon(customer.churn_analysis.churn_risk_level)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">
                        {customer.churn_analysis.churn_risk_level.toUpperCase()} Churn Risk ({customer.churn_analysis.churn_risk_score.toFixed(0)}%)
                      </p>
                      <p className="text-xs">{customer.churn_analysis.risk_reason}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View History
                  </Button>
                  <Button size="sm" className="flex-1">
                    📞 Contact
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
