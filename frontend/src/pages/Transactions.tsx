import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';
import { Transaction } from '@/types/models';
import { toast } from 'sonner';

type InventoryProduct = {
  product_id: string;
  name: string;
  sku?: string | null;
  current_stock: number;
  unit_price: number;
};

type TransactionResponse = {
  transaction: Transaction;
  movement_id?: string;
  new_stock?: number;
  amount?: string;
};

const PAYMENT_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'bKash', value: 'bkash' },
  { label: 'Nagad', value: 'nagad' },
  { label: 'Rocket', value: 'rocket' },
  { label: 'Card', value: 'card' },
  { label: 'Credit', value: 'credit' },
  { label: 'Other', value: 'other' },
];

const numberize = (value: number | string | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapTransaction = (raw: Transaction): Transaction => ({
  ...raw,
  unit_price: numberize(raw.unit_price),
  amount: numberize(raw.amount),
});

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [formState, setFormState] = useState({
    productId: '',
    customerName: '',
    quantity: 1,
    unitPrice: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const selectedProduct = useMemo(
    () => products.find((product) => product.product_id === formState.productId),
    [formState.productId, products]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) {
      return products.slice(0, 25);
    }
    const term = productSearch.toLowerCase();
    return products
      .filter((product) =>
        product.name.toLowerCase().includes(term) ||
        (product.sku ? product.sku.toLowerCase().includes(term) : false)
      )
      .slice(0, 25);
  }, [productSearch, products]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      setLoading(true);
      const [transactionsRes, productsRes] = await Promise.all([
        api.get('/data/transactions/', {
          params: {
            limit: 50,
            sort_by: 'date',
            sort_order: 'desc',
          },
        }),
        api.get('/data/inventory/products/'),
      ]);

      const normalize = <T,>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload as T[];
        if (Array.isArray(payload?.results)) return payload.results as T[];
        return [];
      };

      const transactionPayload = transactionsRes.data;
      const transactionList: Transaction[] = normalize<Transaction>(transactionPayload).map(mapTransaction);
      setTransactions(transactionList);
      setTotalCount(transactionPayload?.count ?? transactionList.length);

      const productPayload = normalize<any>(productsRes.data);
      setProducts(
        productPayload.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          sku: item.sku,
          current_stock: numberize(item.current_stock),
          unit_price: numberize(item.unit_price),
        }))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const totalRevenue = transactions.reduce((sum, transaction) => sum + numberize(transaction.amount), 0);
  const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const resetForm = () => {
    setFormState({
      productId: '',
      customerName: '',
      quantity: 1,
      unitPrice: '',
      paymentMethod: 'cash',
      notes: '',
    });
    setProductSearch('');
  };

  const handleSelectProduct = (productId: string) => {
    const matching = products.find((product) => product.product_id === productId);
    setFormState((prev) => ({
      ...prev,
      productId,
      unitPrice: matching ? numberize(matching.unit_price).toString() : prev.unitPrice,
      quantity: 1,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.productId) {
      toast.error('Select a product to record a sale');
      return;
    }

    const quantity = Number(formState.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    const selected = products.find((product) => product.product_id === formState.productId);
    if (selected && quantity > selected.current_stock) {
      toast.error(`Cannot sell more than available stock (${selected.current_stock})`);
      return;
    }

    const unitPriceValue = formState.unitPrice ? Number(formState.unitPrice) : selected?.unit_price;
    if (!unitPriceValue || unitPriceValue <= 0) {
      toast.error('Provide a unit price greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        product_id: formState.productId,
        quantity,
        unit_price: unitPriceValue,
        payment_method: formState.paymentMethod,
      };

      if (formState.customerName.trim()) {
        payload.customer_name = formState.customerName.trim();
      }
      if (formState.notes.trim()) {
        payload.notes = formState.notes.trim();
      }

      const response = await api.post<TransactionResponse>('/data/inventory/transactions/', payload);
      const created = mapTransaction(response.data.transaction);

      setTransactions((prev) => [created, ...prev]);
      setTotalCount((prev) => prev + 1);
      if (selected) {
        const updatedStock = numberize(response.data.new_stock ?? selected.current_stock - quantity);
        setProducts((prev) =>
          prev.map((product) =>
            product.product_id === selected.product_id
              ? { ...product, current_stock: updatedStock }
              : product
          )
        );
      }

      toast.success('Transaction recorded');
      resetForm();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to record transaction';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Transaction History</h1>

        {error && <ErrorBanner message={error} onRetry={fetchTransactions} />}

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Record a New Sale</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Search Product</label>
                <Input
                  placeholder="Search by name or SKU"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Select Product</label>
                <Select value={formState.productId} onValueChange={handleSelectProduct}>
                  <SelectTrigger disabled={products.length === 0}>
                    <SelectValue placeholder={products.length ? 'Choose a product' : 'No products available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.length === 0 ? (
                      <SelectItem value="no-results" disabled>
                        No products found
                      </SelectItem>
                    ) : (
                      filteredProducts.map((product) => (
                        <SelectItem key={product.product_id} value={product.product_id}>
                          {product.name} • Stock {product.current_stock}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current stock: {selectedProduct.current_stock} units · Default price: ৳{numberize(selectedProduct.unit_price).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity Sold</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.quantity}
                  onChange={(event) => setFormState((prev) => ({
                    ...prev,
                    quantity: Number(event.target.value),
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit Price (৳)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.unitPrice}
                  onChange={(event) => setFormState((prev) => ({
                    ...prev,
                    unitPrice: event.target.value,
                  }))}
                  placeholder={selectedProduct ? numberize(selectedProduct.unit_price).toString() : '0.00'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Customer (optional)</label>
                <Input
                  placeholder="Enter customer name"
                  value={formState.customerName}
                  onChange={(event) => setFormState((prev) => ({
                    ...prev,
                    customerName: event.target.value,
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Method</label>
                <Select
                  value={formState.paymentMethod}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      paymentMethod: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <Textarea
                rows={3}
                placeholder="Add any context about this sale"
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Button type="submit" disabled={submitting || !formState.productId}>
                {submitting ? 'Recording…' : 'Record Transaction'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* Summary Card */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-primary">৳{totalRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transactions</p>
              <p className="text-xl font-bold">{totalCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Value</p>
              <p className="text-xl font-bold">৳{Math.round(avgTransaction).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">No Transactions Yet</p>
            <p className="text-muted-foreground">
              Record a sale using the form above or upload historical data to populate this list.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <Card key={transaction.transaction_id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{transaction.product_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      {transaction.customer_name && (
                        <>
                          <span>•</span>
                          <span>{transaction.customer_name}</span>
                        </>
                      )}
                      {transaction.payment_method && (
                        <>
                          <span>•</span>
                          <span>{transaction.payment_method}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ৳{numberize(transaction.amount).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{transaction.quantity} units</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
