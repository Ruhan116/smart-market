import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { toast } from 'sonner';
import {
  useReceiptPreview,
  useConfirmReceipt,
  useRejectReceipt,
  ExtractedItem,
} from '@/hooks/useDataUpload';

const ReceiptPreview: React.FC = () => {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const [editingItems, setEditingItems] = useState<ExtractedItem[]>([]);

  // API hooks
  const { data: receipt, isLoading, error, isError } = useReceiptPreview(imageId);
  const confirmMutation = useConfirmReceipt();
  const rejectMutation = useRejectReceipt();

  // Initialize editing items when receipt loads
  React.useEffect(() => {
    if (receipt?.extracted_items) {
      setEditingItems(receipt.extracted_items);
    }
  }, [receipt]);

  type EditableField = 'name' | 'quantity' | 'unit_price';

  const handleItemChange = (index: number, field: EditableField, value: string) => {
    const updated = [...editingItems];
    const item = { ...updated[index] };

    if (field === 'quantity' || field === 'unit_price') {
      const numericValue = parseFloat(value);
      item[field] = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
      item.total_price = item.quantity * item.unit_price;
    } else {
      item.name = value;
    }

    updated[index] = item;
    setEditingItems(updated);
  };

  const handleAddItem = () => {
    const newItem: ExtractedItem = {
      name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      confidence: 1.0,
    };
    setEditingItems([...editingItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!imageId) return;

    try {
      await confirmMutation.mutateAsync({
        imageId,
        items: editingItems,
      });
      toast.success('Receipt confirmed and transactions created!');
      navigate('/transactions');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm receipt');
    }
  };

  const handleReject = async () => {
    if (!imageId) return;

    try {
      await rejectMutation.mutateAsync(imageId);
      toast.info('Receipt rejected');
      navigate('/upload');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject receipt');
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading receipt preview..." />;
  }

  if (isError || !receipt) {
    return (
      <div className="mobile-padding min-h-screen bg-background pb-24">
        <div className="max-w-4xl mx-auto">
          <ErrorBanner
            message={error?.message || 'Receipt not found'}
            onRetry={() => navigate('/upload')}
          />
        </div>
      </div>
    );
  }

  const totalExtracted = editingItems.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="mobile-padding min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🔍 Review Receipt</h1>
          <p className="text-muted-foreground">
            Verify and confirm the extracted receipt data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Receipt Image */}
          <Card className="lg:col-span-1 p-4 h-fit">
            <img
              src={receipt.image_url}
              alt="Receipt"
              className="w-full rounded-lg mb-4 border border-muted"
            />
            <div className="space-y-2 text-sm">
              {receipt.vendor_name && (
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-semibold">{receipt.vendor_name}</p>
                </div>
              )}
              {receipt.transaction_date && (
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">
                    {new Date(receipt.transaction_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${receipt.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-sm">
                    {(receipt.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Extracted Items */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="text-xl font-semibold mb-4">📦 Extracted Items</h2>

            {editingItems.length === 0 ? (
              <div className="p-8 text-center bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">No items extracted</p>
                <Button onClick={handleAddItem} variant="outline" className="mt-4">
                  ➕ Add Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {editingItems.map((item, index) => (
                  <Card key={index} className="p-4 bg-muted/20 border-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-input rounded bg-background text-sm"
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-input rounded bg-background text-sm"
                          min="1"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 border border-input rounded bg-background text-sm"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Total
                        </label>
                        <div className="w-full px-2 py-1 bg-primary/10 rounded text-sm font-semibold">
                          ৳{item.total_price.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="w-full"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                    {item.confidence < 0.8 && (
                      <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                        ⚠️ Low confidence ({(item.confidence * 100).toFixed(0)}%) - please verify
                      </div>
                    )}
                  </Card>
                ))}

                <Button onClick={handleAddItem} variant="outline" className="w-full">
                  ➕ Add Item
                </Button>
              </div>
            )}

            {/* Summary */}
            <Card className="p-4 mt-6 bg-primary/5 border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Extracted Total:</span>
                <span className="font-bold text-primary">৳{totalExtracted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt Total:</span>
                <span className="font-bold text-primary">৳{receipt.total_amount.toFixed(2)}</span>
              </div>
              {Math.abs(totalExtracted - receipt.total_amount) > 0.01 && (
                <div className="text-xs text-warning mt-2">
                  ⚠️ Amounts don't match - please review items
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending || editingItems.length === 0}
                className="flex-1"
              >
                {confirmMutation.isPending ? '⏳ Confirming...' : '✅ Confirm & Create'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="flex-1"
              >
                {rejectMutation.isPending ? '⏳ Rejecting...' : '✕ Reject'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/upload')}
                className="flex-1"
              >
                ← Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;
