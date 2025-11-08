import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Transaction } from '@/types/models';
import { useTransactionsList, TransactionsListParams } from '@/hooks/useDataUpload';

const numberize = (value: number | string | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const TransactionsList: React.FC = () => {
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [productFilter, setProductFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Build query params
  const queryParams: TransactionsListParams = {
    page: currentPage,
    limit: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
  };

  if (productFilter) queryParams.product_id = productFilter;
  if (customerFilter) queryParams.customer_id = customerFilter;
  if (paymentMethodFilter) queryParams.payment_method = paymentMethodFilter;
  if (dateFromFilter) queryParams.date_from = dateFromFilter;
  if (dateToFilter) queryParams.date_to = dateToFilter;

  // Fetch transactions with filters
  const { data, isLoading, error, refetch } = useTransactionsList(queryParams);
  const transactions: Transaction[] = data?.results || [];
  const totalCount = data?.count || 0;
  const totalRevenue = data?.total_revenue || 0;
  const avgValue = data?.average_value || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleApplyFilters = () => {
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setProductFilter('');
    setCustomerFilter('');
    setPaymentMethodFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (isLoading && transactions.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">📋 Transaction List</h1>
          <p className="text-muted-foreground">
            View and filter all your transactions with advanced search options
          </p>
        </div>

        {error && (
          <ErrorBanner message={error.message || 'Failed to load transactions'} onRetry={() => refetch()} />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-primary">৳{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{totalCount} transactions</p>
          </Card>
          <Card className="p-4 bg-accent/5 border-accent/20">
            <p className="text-sm text-muted-foreground mb-1">Average Value</p>
            <p className="text-2xl font-bold text-accent">৳{avgValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
          </Card>
          <Card className="p-4 bg-success/5 border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-success">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-2">All time</p>
          </Card>
        </div>

        {/* Filters Toggle */}
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full"
          >
            {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-6 mb-6 bg-muted/30">
            <h3 className="text-lg font-semibold mb-4">🔍 Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <input
                  type="text"
                  placeholder="Product name or ID"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <input
                  type="text"
                  placeholder="Customer name or ID"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="created_at">Created</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                ✓ Apply Filters
              </Button>
              <Button variant="outline" onClick={handleResetFilters} className="flex-1">
                ↺ Reset
              </Button>
            </div>
          </Card>
        )}

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">No Transactions Found</p>
            <p className="text-muted-foreground">
              {totalCount === 0
                ? 'No transactions yet. Upload your sales data to get started.'
                : 'No transactions match your filters.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction: Transaction) => (
              <Card key={transaction.transaction_id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{transaction.product_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>📅 {new Date(transaction.date).toLocaleDateString()}</span>
                      {transaction.customer_name && (
                        <>
                          <span>•</span>
                          <span>👤 {transaction.customer_name}</span>
                        </>
                      )}
                      {transaction.payment_method && (
                        <>
                          <span>•</span>
                          <span>💳 {transaction.payment_method}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-primary">৳{numberize(transaction.amount).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{transaction.quantity} units</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {transactions.length > 0 && totalPages > 1 && (
          <Card className="p-4 mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                Next →
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TransactionsList;
