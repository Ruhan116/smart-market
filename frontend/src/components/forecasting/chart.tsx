import React from 'react';

type ChartContainerProps = React.PropsWithChildren<{
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}>;

export const ChartStyle: React.FC = () => (
  <style>{`
  .chart-container {
    --chart-historical: #1E40AF; /* indigo-800 */
    --chart-predicted: #10B981; /* green-500 */
    --chart-band: #DBEAFE; /* indigo-100 */
    --chart-grid: #E5E7EB; /* gray-200 */
    --chart-axis: #6B7280; /* gray-500 */
  }
  .dark .chart-container {
    --chart-historical: #93c5fd;
    --chart-predicted: #34d399;
    --chart-band: rgba(99,102,241,0.12);
    --chart-grid: rgba(255,255,255,0.06);
    --chart-axis: rgba(203,213,225,0.8);
  }
`}</style>
);

export const ChartContainer: React.FC<ChartContainerProps> = ({ children, height = 300, className = '', style }) => {
  return (
    <div className={`chart-container ${className}`} style={style}>
      {/* container used by ResponsiveContainer; height prop forwarded */}
      <div style={{ width: '100%', height }}>{children}</div>
    </div>
  );
};

type TooltipRow = { color: string; name: string; value: number | string };

export const ChartTooltipContent: React.FC<{ payload?: any; label?: string }> = ({ payload, label }) => {
  const rows: TooltipRow[] = (payload || []).map((p: any) => ({ color: p.color || p.fill || p.stroke, name: p.name, value: p.value }));

  return (
    <div role="status" aria-live="polite" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-sm p-2 text-xs" style={{ minWidth: 160 }}>
      <div className="font-semibold mb-1">{label}</div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, background: r.color, display: 'inline-block', borderRadius: 2 }} aria-hidden />
            <span className="flex-1">{r.name}</span>
            <span className="font-mono">{typeof r.value === 'number' ? r.value.toLocaleString() : r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartLegendContent: React.FC<{ payload?: any; onToggle?: (dataKey: string) => void; active?: Record<string, boolean> }> = ({ payload = [], onToggle, active = {} }) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-3 flex-wrap text-xs" role="list">
      {payload.map((entry: any) => {
        const { dataKey, color, value } = entry;
        const isActive = active[dataKey] !== false;
        return (
          <button
            key={dataKey}
            role="listitem"
            aria-pressed={isActive}
            onClick={() => onToggle && onToggle(dataKey)}
            className={`flex items-center gap-2 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 ${isActive ? '' : 'opacity-40'}`}
            style={{ border: '1px solid transparent' }}
          >
            <span style={{ width: 10, height: 10, background: color, display: 'inline-block', borderRadius: 2 }} aria-hidden />
            <span>{value}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ChartContainer;
