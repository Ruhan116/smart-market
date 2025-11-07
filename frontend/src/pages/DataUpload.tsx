import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { toast } from 'sonner';
import { useUploadCsv, useUploadReceipt, useUploadStatus, UploadStatus } from '@/hooks/useDataUpload';

const DataUpload: React.FC = () => {
  const [uploadTab, setUploadTab] = useState<'csv' | 'receipt'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // API hooks
  const uploadCsvMutation = useUploadCsv();
  const uploadReceiptMutation = useUploadReceipt();
  const { data: uploadStatusData, isLoading: statusLoading } = useUploadStatus();
  const uploadHistory: UploadStatus[] = uploadStatusData?.results || [];

  const handleCsvSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('CSV file exceeds maximum size of 10MB');
        return;
      }
      setCsvFile(file);
      setError(null);
    }
  };

  const handleReceiptSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a JPG or PNG image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file exceeds maximum size of 5MB');
        return;
      }
      setReceiptFile(file);
      setError(null);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile) return;

    setError(null);
    try {
      await uploadCsvMutation.mutateAsync(csvFile);
      toast.success('CSV uploaded successfully! Processing has started.');
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = '';
      // Refetch upload status
      queryClient.refetchQueries({ queryKey: ['upload-status'] });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to upload CSV file';
      setError(message);
      toast.error(message);
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile) return;

    setError(null);
    try {
      const response = await uploadReceiptMutation.mutateAsync(receiptFile);
      toast.success('Receipt uploaded! Please review the extracted data.');
      setReceiptFile(null);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
      // Refetch upload status
      queryClient.refetchQueries({ queryKey: ['upload-status'] });
      // Navigate to receipt preview if imageId is in response
      if (response.data?.id) {
        window.location.href = `/receipts/${response.data.id}`;
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to upload receipt';
      setError(message);
      toast.error(message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 border-success/30';
      case 'processing':
        return 'bg-primary/10 border-primary/30';
      case 'failed':
        return 'bg-destructive/10 border-destructive/30';
      default:
        return 'bg-muted/50 border-muted/30';
    }
  };

  return (
    <div className="mobile-padding min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">📤 Upload Sales Data</h1>
          <p className="text-muted-foreground">
            Import transaction data from CSV files or receipt images
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-muted">
          <Button
            variant={uploadTab === 'csv' ? 'default' : 'ghost'}
            onClick={() => setUploadTab('csv')}
            className="rounded-b-none"
          >
            📋 CSV Upload
          </Button>
          <Button
            variant={uploadTab === 'receipt' ? 'default' : 'ghost'}
            onClick={() => setUploadTab('receipt')}
            className="rounded-b-none"
          >
            📸 Receipt Upload
          </Button>
        </div>

        {/* CSV Upload Tab */}
        {uploadTab === 'csv' && (
          <div className="space-y-6">
            {/* Upload Area */}
            <Card className="border-2 border-dashed border-muted p-8">
              <div className="text-center">
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                <p className="text-muted-foreground mb-6">
                  Import transaction data from a CSV file
                </p>

                {!csvFile ? (
                  <div className="space-y-4">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvSelect}
                      className="hidden"
                      disabled={uploadCsvMutation.isPending}
                    />
                    <Button
                      onClick={() => csvInputRef.current?.click()}
                      className="w-full"
                      disabled={uploadCsvMutation.isPending}
                    >
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Maximum file size: 10MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card className="p-4 bg-primary/5">
                      <p className="font-semibold text-sm">{csvFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(csvFile.size / 1024).toFixed(2)} KB
                      </p>
                    </Card>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadCsv}
                        disabled={uploadCsvMutation.isPending}
                        className="flex-1"
                      >
                        {uploadCsvMutation.isPending ? '⏳ Uploading...' : '✅ Upload'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCsvFile(null);
                          if (csvInputRef.current)
                            csvInputRef.current.value = '';
                        }}
                        disabled={uploadCsvMutation.isPending}
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* CSV Format Guide */}
            <Card className="p-6 bg-muted/30">
              <h4 className="font-semibold mb-4">📋 CSV Format Guide</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Your CSV file should include these columns:
              </p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-primary">Date *</span>
                  <span className="text-muted-foreground">YYYY-MM-DD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary">Product *</span>
                  <span className="text-muted-foreground">Product name</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary">Quantity *</span>
                  <span className="text-muted-foreground">Number</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary">Amount *</span>
                  <span className="text-muted-foreground">Price in Taka</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer</span>
                  <span className="text-muted-foreground">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span>PaymentMethod</span>
                  <span className="text-muted-foreground">
                    cash, bkash, nagad, etc
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * Required fields
              </p>
            </Card>
          </div>
        )}

        {/* Receipt Upload Tab */}
        {uploadTab === 'receipt' && (
          <div className="space-y-6">
            {/* Upload Area */}
            <Card className="border-2 border-dashed border-muted p-8">
              <div className="text-center">
                <div className="text-5xl mb-4">📸</div>
                <h3 className="text-lg font-semibold mb-2">Upload Receipt</h3>
                <p className="text-muted-foreground mb-6">
                  Take a photo of your receipt and we'll extract the data
                </p>

                {!receiptFile ? (
                  <div className="space-y-4">
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleReceiptSelect}
                      className="hidden"
                      disabled={uploadReceiptMutation.isPending}
                    />
                    <Button
                      onClick={() => receiptInputRef.current?.click()}
                      className="w-full"
                      disabled={uploadReceiptMutation.isPending}
                    >
                      Choose Image
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG (Max 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card className="p-4 bg-primary/5">
                      <p className="font-semibold text-sm">{receiptFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(receiptFile.size / 1024).toFixed(2)} KB
                      </p>
                    </Card>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadReceipt}
                        disabled={uploadReceiptMutation.isPending}
                        className="flex-1"
                      >
                        {uploadReceiptMutation.isPending ? '⏳ Processing...' : '✅ Upload'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setReceiptFile(null);
                          if (receiptInputRef.current)
                            receiptInputRef.current.value = '';
                        }}
                        disabled={uploadReceiptMutation.isPending}
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* OCR Info */}
            <Card className="p-6 bg-muted/30">
              <h4 className="font-semibold mb-4">🔍 How Receipt OCR Works</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  📤 Upload a clear photo of your receipt or invoice
                </p>
                <p>
                  🔍 Our AI extracts item names, quantities, and prices
                </p>
                <p>
                  ✅ Review extracted data before adding to your records
                </p>
                <p>
                  💾 Transactions are automatically created in your system
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Upload History */}
        {!statusLoading && uploadHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">📜 Recent Uploads</h3>
            <div className="space-y-3">
              {uploadHistory.map((upload) => {
                const progress = upload.total_rows > 0
                  ? (upload.processed_rows / upload.total_rows) * 100
                  : 0;

                return (
                  <Card
                    key={upload.id}
                    className={`p-4 border ${getStatusColor(upload.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{upload.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {upload.file_type.toUpperCase()} • Updated {new Date(upload.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-lg">
                        {getStatusIcon(upload.status)}
                      </span>
                    </div>

                    {upload.status === 'processing' && upload.total_rows > 0 && (
                      <div className="mb-2">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {upload.processed_rows} / {upload.total_rows} processed ({progress.toFixed(0)}%)
                        </p>
                      </div>
                    )}

                    {(upload.status === 'completed' || upload.status === 'failed') && (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-background/50 p-2 rounded">
                          <p className="text-muted-foreground text-xs">Total</p>
                          <p className="font-semibold">{upload.total_rows}</p>
                        </div>
                        <div className="bg-success/20 p-2 rounded">
                          <p className="text-muted-foreground text-xs">Processed</p>
                          <p className="font-semibold text-success">{upload.processed_rows}</p>
                        </div>
                        <div className="bg-destructive/20 p-2 rounded">
                          <p className="text-muted-foreground text-xs">Failed</p>
                          <p className="font-semibold text-destructive">{upload.failed_rows}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataUpload;
