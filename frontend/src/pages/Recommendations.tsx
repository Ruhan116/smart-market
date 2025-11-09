import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { Recommendation } from '@/types/models';
import { toast } from 'sonner';

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const fetchRecommendations = async () => {
    try {
      setError(null);
      const { mockRecommendations } = await import('@/services/mockData');
      await new Promise(resolve => setTimeout(resolve, 500));
      setRecommendations(mockRecommendations);
    } catch (err: any) {
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleExecute = async (id: number) => {
    try {
      await api.post(`/recommendations/${id}/execute`);
      toast.success('✅ Recommendation executed successfully!');
      fetchRecommendations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to execute recommendation');
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filter === 'pending') return !rec.engagement.is_executed;
    if (filter === 'completed') return rec.engagement.is_executed;
    return true;
  });

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'urgency-high bg-destructive/5';
      case 'medium': return 'urgency-medium bg-warning/5';
      case 'low': return 'urgency-low bg-success/5';
      default: return '';
    }
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
    return <LoadingSpinner fullScreen message="Loading recommendations..." />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">AI Recommendations</h1>

        {error && <ErrorBanner message={error} onRetry={fetchRecommendations} />}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All
          </Button>
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
          >
            Pending
          </Button>
          <Button
            onClick={() => setFilter('completed')}
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
          >
            Completed
          </Button>
        </div>

        {/* Recommendations List */}
        {filteredRecommendations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} recommendations</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => (
              <Card
                key={rec.id}
                className={`p-4 ${getUrgencyClass(rec.urgency)}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getUrgencyColor(rec.urgency)}`}>
                        {rec.urgency}
                      </span>
                      <span className="text-xs text-muted-foreground">{rec.type.replace('_', ' ')}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Priority: {rec.priority_score}</span>
                      {rec.engagement.is_executed && (
                        <span className="text-success">✓ Executed</span>
                      )}
                    </div>
                  </div>
                  <span className="text-3xl">
                    {rec.type === 'reorder' ? '📦' : 
                     rec.type === 'cash_warning' ? '💰' : 
                     rec.type === 'retention' ? '👥' : '📈'}
                  </span>
                </div>

                {!rec.engagement.is_executed && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExecute(rec.id)}
                      size="sm"
                      className="flex-1"
                    >
                      Execute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
