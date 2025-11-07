import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import SaleRecorder from '@/components/SaleRecorder';
import api from '@/services/api';
import { toast } from 'sonner';

interface InventoryProduct {
  product_id: string;
  name: string;
  sku: string;
  current_stock: number;
  unit_price: number;
  reorder_point: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  movement_id: string;
  movement_type: string;
  product_name: string;
  quantity_changed: number;
  stock_before: number;
  stock_after: number;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_by_name: string;
  created_at: string;
}

interface StockAlert {
  alert_id: string;
  alert_type: string;
  product_name: string;
  current_stock: number;
  threshold: number;
  is_acknowledged: boolean;
  acknowledged_by_name: string;
  created_at: string;
  acknowledged_at: string;
}

interface InventoryReport {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  products_by_stock: Array<{
    product_id: string;
    name: string;
    sku: string;
    current_stock: number;
    unit_price: number;
    stock_value: number;
    reorder_point: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  }>;
  alerts: StockAlert[];
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [saleRecorderOpen, setSaleRecorderOpen] = useState(false);
  const [selectedProductIdForSale, setSelectedProductIdForSale] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchInventoryData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch all inventory data in parallel
      const [productsRes, alertsRes, reportRes, movementsRes] = await Promise.all([
        api.get('/inventory/products/'),
        api.get('/inventory/alerts/'),
        api.get('/inventory/report/'),
        api.get('/inventory/movements/'),
      ]);

      setProducts(productsRes.data.results || []);
      setAlerts(alertsRes.data.results || []);
      setReport(reportRes.data);
      setMovements(movementsRes.data.results || []);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load inventory data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const getStockStatus = (stock: number, reorderPoint: number): { color: string; text: string; badge: string } => {
    if (stock === 0) {
      return { color: 'bg-destructive', text: 'Out of Stock', badge: 'destructive' };
    }
    if (stock <= reorderPoint) {
      return { color: 'bg-warning', text: 'Low Stock', badge: 'warning' };
    }
    return { color: 'bg-success', text: 'In Stock', badge: 'success' };
  };

  const handleRecordSale = (productId: string) => {
    setSelectedProductIdForSale(productId);
    setSaleRecorderOpen(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/inventory/alerts/${alertId}/acknowledge/`);
      toast.success('Alert acknowledged');
      fetchInventoryData();
    } catch (err: any) {
      toast.error('Failed to acknowledge alert');
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const filteredProducts = products.filter(product => {
    const status = getStockStatus(product.current_stock, product.reorder_point);
    if (filter === 'in_stock') return status.text === 'In Stock';
    if (filter === 'low_stock') return status.text === 'Low Stock';
    if (filter === 'out_of_stock') return status.text === 'Out of Stock';
    return true;
  });

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels, movements, and alerts</p>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchInventoryData} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {report && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Products</p>
                    <p className="text-2xl font-bold">{report.total_products}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Stock Value</p>
                    <p className="text-2xl font-bold">৳{report.total_stock_value.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 border-warning/50">
                    <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
                    <p className="text-2xl font-bold text-warning">{report.low_stock_count}</p>
                  </Card>
                  <Card className="p-4 border-destructive/50">
                    <p className="text-xs text-muted-foreground mb-1">Out of Stock</p>
                    <p className="text-2xl font-bold text-destructive">{report.out_of_stock_count}</p>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="p-4 mb-6">
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => setActiveTab('products')}>
                      📦 View All Products
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/upload')}
                    >
                      📤 Upload Stock File
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab('alerts')}
                    >
                      🔔 View Alerts
                    </Button>
                  </div>
                </Card>

                {/* Top Products by Stock Value */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Top Products by Stock Value</h3>
                  <div className="space-y-3">
                    {report.products_by_stock.slice(0, 5).map((product) => {
                      const status = getStockStatus(product.current_stock, product.reorder_point);
                      return (
                        <div key={product.product_id} className="flex items-center justify-between pb-3 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.current_stock} units @ ৳{product.unit_price}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">৳{product.stock_value.toLocaleString()}</p>
                            <Badge variant={status.badge as any} className="mt-1">{status.text}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['all', 'in_stock', 'low_stock', 'out_of_stock'].map((f) => (
                <Button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                >
                  {f === 'all' && 'All Products'}
                  {f === 'in_stock' && '✓ In Stock'}
                  {f === 'low_stock' && '⚠ Low Stock'}
                  {f === 'out_of_stock' && '✗ Out of Stock'}
                </Button>
              ))}
            </div>

            {/* Products List */}
            {filteredProducts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No products found</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.current_stock, product.reorder_point);
                  const stockPercentage = Math.min(100, (product.current_stock / product.reorder_point) * 100);

                  return (
                    <Card key={product.product_id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <Badge variant={status.badge as any}>{status.text}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>SKU: {product.sku}</span>
                            <span>•</span>
                            <span>৳{product.unit_price}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Current Stock</p>
                          <p className="text-2xl font-bold">{product.current_stock}</p>
                        </div>
                      </div>

                      {/* Stock Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Stock Level</span>
                          <span className="font-semibold">{stockPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.color} transition-all`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reorder point: {product.reorder_point} units
                        </p>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Total Sales</p>
                          <p className="font-semibold">{product.total_sales}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Value</p>
                          <p className="font-semibold">৳{(product.current_stock * product.unit_price).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Last Updated</p>
                          <p className="font-semibold text-xs">{new Date(product.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRecordSale(product.product_id)}
                        >
                          📊 Record Sale
                        </Button>
                        {product.current_stock <= product.reorder_point && (
                          <Button size="sm" variant="outline" className="flex-1">
                            🔄 Reorder
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            {movements.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No stock movements yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {movements.map((movement) => {
                  const isNegative = movement.quantity_changed < 0;
                  const icon = {
                    sale: '📉',
                    initial_load: '📦',
                    adjustment: '⚙️',
                    return: '↩️',
                    damage: '❌',
                    restock: '📈',
                  }[movement.movement_type as keyof typeof icon] || '•';

                  return (
                    <Card key={movement.movement_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{icon}</span>
                            <h3 className="font-semibold">{movement.product_name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {movement.movement_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>By: {movement.created_by_name || 'System'}</span>
                            <span>•</span>
                            <span>{new Date(movement.created_at).toLocaleDateString()}</span>
                          </div>
                          {movement.notes && (
                            <p className="text-sm italic text-muted-foreground">{movement.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isNegative ? 'text-destructive' : 'text-success'}`}>
                            {isNegative ? '' : '+'}{movement.quantity_changed}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {movement.stock_before} → {movement.stock_after}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">🎉 No active alerts - inventory is healthy!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const isOutOfStock = alert.alert_type === 'out_of_stock';

                  return (
                    <Card
                      key={alert.alert_id}
                      className={`p-4 border-l-4 ${
                        isOutOfStock ? 'border-l-destructive' : 'border-l-warning'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{isOutOfStock ? '❌' : '⚠️'}</span>
                            <h3 className="font-semibold">{alert.product_name}</h3>
                            <Badge variant={isOutOfStock ? 'destructive' : 'warning'}>
                              {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Current: {alert.current_stock} units | Threshold: {alert.threshold}
                          </p>
                        </div>
                        {!alert.is_acknowledged && (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.alert_id)}
                          >
                            ✓ Acknowledge
                          </Button>
                        )}
                        {alert.is_acknowledged && (
                          <Badge variant="outline">✓ Acknowledged</Badge>
                        )}
                      </div>

                      {alert.is_acknowledged && (
                        <p className="text-xs text-muted-foreground">
                          Acknowledged by {alert.acknowledged_by_name} on{' '}
                          {new Date(alert.acknowledged_at).toLocaleDateString()}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sale Recorder Modal */}
        <SaleRecorder
          open={saleRecorderOpen}
          onOpenChange={setSaleRecorderOpen}
          defaultProductId={selectedProductIdForSale}
          onSaleRecorded={() => {
            fetchInventoryData();
            setSelectedProductIdForSale(undefined);
          }}
        />
      </div>
    </div>
  );
};

export default Inventory;
