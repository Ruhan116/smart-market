import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import api from '@/services/api';
import { Transaction } from '@/types/models';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    try {
      setError(null);
      const { mockTransactions } = await import('@/services/mockData');
      await new Promise(resolve => setTimeout(resolve, 500));
      setTransactions(mockTransactions);
    } catch (err: unknown) {
      setError('Failed to load transactions');
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

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgTransaction = totalRevenue / (transactions.length || 1);

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <div>
            <button
              className="px-3 py-2 rounded bg-primary text-white text-sm"
              onClick={() => navigate('/barcode-scanner')}
            >
              Scan Barcode
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={fetchTransactions} />}

        {/* Summary Card */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-primary">৳{totalRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Transactions</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Value</p>
              <p className="text-xl font-bold">৳{avgTransaction.toFixed(0)}</p>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">No Transactions Yet</p>
            <p className="text-muted-foreground">Upload your sales data to see transactions</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
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
                    <p className="text-lg font-bold">৳{transaction.amount}</p>
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
