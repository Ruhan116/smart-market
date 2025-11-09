import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { Product } from '@/types/models';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'high_sales'>('all');

  const fetchProducts = async () => {
    try {
      setError(null);
      const { mockProducts } = await import('@/services/mockData');
      await new Promise(resolve => setTimeout(resolve, 500));
      setProducts(mockProducts);
    } catch (err: any) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    if (filter === 'low_stock') return product.is_low_stock;
    if (filter === 'high_sales') return product.sales_metrics.sales_7d > 10;
    return true;
  });

  const getStockStatus = (product: Product) => {
    const percentage = (product.current_stock / product.reorder_point) * 100;
    if (percentage <= 50) return { color: 'bg-destructive', text: 'Critical' };
    if (percentage <= 100) return { color: 'bg-warning', text: 'Low' };
    return { color: 'bg-success', text: 'Good' };
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading product inventory..." />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Product Inventory</h1>

        {error && <ErrorBanner message={error} onRetry={fetchProducts} />}

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All Products
          </Button>
          <Button
            onClick={() => setFilter('low_stock')}
            variant={filter === 'low_stock' ? 'default' : 'outline'}
            size="sm"
          >
            Low Stock
          </Button>
          <Button
            onClick={() => setFilter('high_sales')}
            variant={filter === 'high_sales' ? 'default' : 'outline'}
            size="sm"
          >
            High Sales
          </Button>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No products found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const status = getStockStatus(product);
              const stockPercentage = Math.min(100, (product.current_stock / product.reorder_point) * 100);

              return (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>SKU: {product.sku}</span>
                        <span>•</span>
                        <span>৳{product.unit_price}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Stock</p>
                      <p className="text-xl font-bold">{product.current_stock}</p>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Stock Level</span>
                      <span className={`font-semibold ${status.color.replace('bg-', 'text-')}`}>
                        {status.text}
                      </span>
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

                  {/* Sales Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Sales (7d)</p>
                      <p className="font-semibold">{product.sales_metrics.sales_7d}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Sales (30d)</p>
                      <p className="font-semibold">{product.sales_metrics.sales_30d}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Avg Daily</p>
                      <p className="font-semibold">{product.sales_metrics.avg_daily.toFixed(1)}</p>
                    </div>
                  </div>

                  {product.is_low_stock && (
                    <Button size="sm" className="w-full">
                      🔔 Reorder Now
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
