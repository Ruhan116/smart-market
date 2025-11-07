import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/services/api';
import { toast } from 'sonner';

const saleSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').max(1000, 'Quantity too high'),
  unit_price: z.coerce.number().positive('Price must be greater than 0'),
  customer_id: z.string().optional(),
  payment_method: z.enum(['cash', 'bkash', 'nagad', 'rocket', 'card', 'credit', 'other']),
  notes: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface Product {
  product_id: string;
  name: string;
  current_stock: number;
  unit_price: number;
  sku: string;
}

interface Customer {
  customer_id: string;
  name: string;
  phone: string;
}

interface SaleRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleRecorded?: () => void;
  defaultProductId?: string;
}

const SaleRecorder: React.FC<SaleRecorderProps> = ({
  open,
  onOpenChange,
  onSaleRecorded,
  defaultProductId,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      payment_method: 'cash',
      product_id: defaultProductId,
    },
  });

  const selectedProductId = watch('product_id');
  const quantity = watch('quantity');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.product_id === selectedProductId);
      setSelectedProduct(product || null);
      if (product) {
        setValue('unit_price', product.unit_price);
      }
    }
  }, [selectedProductId, products, setValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, customersRes] = await Promise.all([
        api.get('/data/inventory/products/?limit=1000'),
        api.get('/customers/?limit=1000'),
      ]);
      setProducts(productsRes.data.results || []);
      setCustomers(customersRes.data.results || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SaleFormData) => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (quantity > selectedProduct.current_stock) {
      toast.error(
        `Insufficient stock. Available: ${selectedProduct.current_stock} units`
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...data,
        unit_price: selectedProduct.unit_price,
      };

  const response = await api.post<{ new_stock: number }>('/data/inventory/transactions/', payload);

      toast.success(
        `Sale recorded! New stock: ${response.data.new_stock} units`
      );

      reset();
      onOpenChange(false);
      onSaleRecorded?.();
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      const message = error.response?.data?.error || 'Failed to record sale';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>📊 Record a Sale</DialogTitle>
          <DialogDescription>
            Record a new sale transaction and update inventory
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product Selection */}
            <div>
              <Label htmlFor="product">Product *</Label>
              <Select
                onValueChange={(value) => setValue('product_id', value)}
                defaultValue={defaultProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.product_id} value={product.product_id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({product.current_stock} in stock)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && (
                <p className="text-sm text-destructive mt-1">
                  {errors.product_id.message}
                </p>
              )}

              {selectedProduct && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <p>
                    <span className="text-muted-foreground">Stock: </span>
                    <span className="font-semibold">{selectedProduct.current_stock}</span>
                    <span className="text-muted-foreground"> units</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-semibold">৳{selectedProduct.unit_price}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive mt-1">
                  {errors.quantity.message}
                </p>
              )}
              {selectedProduct && quantity > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Total: ৳{(quantity * selectedProduct.unit_price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Customer */}
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select onValueChange={(value) => setValue('customer_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Walk-in Customer</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customer_id} value={customer.customer_id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                defaultValue="cash"
                onValueChange={(value) =>
                  setValue(
                    'payment_method',
                    value as
                      | 'cash'
                      | 'bkash'
                      | 'nagad'
                      | 'rocket'
                      | 'card'
                      | 'credit'
                      | 'other'
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="bkash">📱 bKash</SelectItem>
                  <SelectItem value="nagad">📱 Nagad</SelectItem>
                  <SelectItem value="rocket">📱 Rocket</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="credit">📝 Credit</SelectItem>
                  <SelectItem value="other">❓ Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-destructive mt-1">
                  {errors.payment_method.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes (optional)"
                className="min-h-20"
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedProduct}>
                {submitting ? 'Recording...' : '✓ Record Sale'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SaleRecorder;
