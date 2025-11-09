import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Business, Recommendation } from '@/types/models';
import { useLanguage } from '@/context/LanguageContext';

const Home: React.FC = () => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const copy = useMemo(() => ({
    en: {
      heading: 'Dashboard',
      subheading: "Welcome back! Here's your business overview.",
  refresh: 'Refresh',
      stats: {
        revenue: 'Revenue (Week)',
        customers: 'Customers',
        products: 'Products',
        lowStock: 'Low Stock',
      },
      recommendationsTitle: 'AI Recommendations',
      viewAll: 'View All →',
      recommendationsEmptyTitle: 'No recommendations at this time',
      recommendationsEmptyBody: 'Keep uploading transaction data to get AI-powered insights',
      quickActions: {
        forecasts: 'Forecasts',
        inventory: 'Inventory',
        customers: 'Customers',
        sales: 'Sales',
      },
  error: 'Failed to load dashboard data',
    },
    bn: {
      heading: 'ড্যাশবোর্ড',
      subheading: 'স্বাগতম! আপনার ব্যবসার সারাংশ নিচে দেখুন।',
  refresh: 'রিফ্রেশ',
      stats: {
        revenue: 'রাজস্ব (সপ্তাহ)',
        customers: 'গ্রাহক',
        products: 'পণ্য',
        lowStock: 'কম মজুত',
      },
      recommendationsTitle: 'এআই সুপারিশ',
      viewAll: 'সব দেখুন →',
      recommendationsEmptyTitle: 'এই মুহূর্তে কোনো সুপারিশ নেই',
      recommendationsEmptyBody: 'এআই বিশ্লেষণ পেতে লেনদেনের ডেটা আপলোড করতে থাকুন',
      quickActions: {
        forecasts: 'পূর্বাভাস',
        inventory: 'ইনভেন্টরি',
        customers: 'গ্রাহক',
        sales: 'বিক্রয়',
      },
  error: 'ড্যাশবোর্ড ডেটা লোড করতে ব্যর্থ হয়েছে',
    },
  }), []);

  const activeCopy = copy[language];
  const isBangla = language === 'bn';
  const loadingMessage = isBangla ? 'ড্যাশবোর্ড লোড হচ্ছে...' : 'Loading your dashboard...';

  const urgencyLabel = (urgency: Recommendation['urgency']): string => {
    if (!isBangla) {
      return urgency;
    }
    switch (urgency) {
      case 'high':
        return 'উচ্চ';
      case 'medium':
        return 'মাঝারি';
      case 'low':
        return 'নিম্ন';
      default:
        return urgency;
    }
  };

  const recommendationTypeLabel = (type: Recommendation['type']): string => {
    if (!isBangla) {
      return type.replace('_', ' ');
    }
    switch (type) {
      case 'reorder':
        return 'পুনরায় অর্ডার';
      case 'retention':
        return 'গ্রাহক ধরে রাখা';
      case 'cash_warning':
        return 'ক্যাশ সতর্কতা';
      default:
        return type.replace('_', ' ');
    }
  };

  const fetchData = async () => {
    try {
      setError(null);
      // Use mock data for demo
      const { mockRecommendations } = await import('@/services/mockData');
      const mockBusiness: Business = {
        id: 1,
        name: 'Demo Shop',
        type: 'retail',
        stats: {
          products: 24,
          customers: 156,
          total_revenue: 125000,
          total_transactions: 342,
        },
      };
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setBusiness(mockBusiness);
      setRecommendations(mockRecommendations.slice(0, 3));
    } catch (err: any) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message={loadingMessage} />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{activeCopy.heading}</h1>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="min-w-[80px]"
            >
              {refreshing ? '⏳' : '🔄'} {activeCopy.refresh}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeCopy.subheading}
          </p>
        </div>

        {error && (
          <ErrorBanner
            message={isBangla ? activeCopy.error : error}
            onRetry={fetchData}
          />
        )}

        {/* Stats Grid */}
        {business && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label={activeCopy.stats.revenue}
              value={`৳${(business.stats.total_revenue / 1000).toFixed(1)}K`}
              icon="💰"
              trend="up"
              trendValue={12}
            />
            <StatCard
              label={activeCopy.stats.customers}
              value={business.stats.customers}
              icon="👥"
              trend="up"
              trendValue={8}
            />
            <StatCard
              label={activeCopy.stats.products}
              value={business.stats.products}
              icon="📦"
            />
            <StatCard
              label={activeCopy.stats.lowStock}
              value="3"
              icon="⚠️"
              trend="down"
              trendValue={5}
            />
          </div>
        )}

        {/* Recommendations Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{activeCopy.recommendationsTitle}</h2>
            <Button
              onClick={() => navigate('/recommendations')}
              variant="ghost"
              size="sm"
            >
              {activeCopy.viewAll}
            </Button>
          </div>

          {recommendations.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">{activeCopy.recommendationsEmptyTitle}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {activeCopy.recommendationsEmptyBody}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Card
                  key={rec.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    rec.urgency === 'high' ? 'urgency-high' : 
                    rec.urgency === 'medium' ? 'urgency-medium' : 
                    'urgency-low'
                  }`}
                  onClick={() => navigate('/recommendations')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase ${getUrgencyColor(rec.urgency)}`}>
                          {urgencyLabel(rec.urgency)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{recommendationTypeLabel(rec.type)}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                    <span className="text-2xl">
                      {rec.type === 'reorder' ? '📦' : 
                       rec.type === 'cash_warning' ? '💰' : 
                       rec.type === 'retention' ? '👥' : '📈'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => navigate('/forecasts')}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <span className="text-2xl">📈</span>
            <span className="text-sm">{activeCopy.quickActions.forecasts}</span>
          </Button>
          <Button
            onClick={() => navigate('/inventory')}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <span className="text-2xl">📦</span>
            <span className="text-sm">{activeCopy.quickActions.inventory}</span>
          </Button>
          <Button
            onClick={() => navigate('/customers')}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm">{activeCopy.quickActions.customers}</span>
          </Button>
          <Button
            onClick={() => navigate('/transactions')}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <span className="text-2xl">💳</span>
            <span className="text-sm">{activeCopy.quickActions.sales}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
