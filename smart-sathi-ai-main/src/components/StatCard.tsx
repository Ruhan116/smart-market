import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  icon?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  trend, 
  trendValue, 
  icon,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
        <div className="h-8 bg-muted rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-2xl" role="img" aria-label={label}>{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      {trendValue !== undefined && trend && (
        <p className={`text-sm flex items-center gap-1 ${
          trend === 'up' ? 'text-success' : 
          trend === 'down' ? 'text-destructive' : 
          'text-muted-foreground'
        }`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{Math.abs(trendValue)}%</span>
        </p>
      )}
    </div>
  );
};
