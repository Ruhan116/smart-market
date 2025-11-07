import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBanner } from '@/components/ErrorBanner';
import { toast } from 'sonner';
import {
  useFailedJobs,
  useUploadStatus,
  useRetryFailedJob,
  FailedJob,
  UploadStatus,
} from '@/hooks/useDataUpload';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'failed-jobs' | 'upload-status'>('failed-jobs');
  const queryClient = useQueryClient();

  // API hooks
  const { data: failedJobsData, isLoading: failedJobsLoading, error: failedJobsError, refetch: refetchFailedJobs } = useFailedJobs();
  const { data: uploadStatusData, isLoading: uploadStatusLoading, error: uploadStatusError } = useUploadStatus();

  const retryJobMutation = useRetryFailedJob();

  const failedJobs: FailedJob[] = failedJobsData?.results || [];
  const uploadStatuses: UploadStatus[] = uploadStatusData?.results || [];

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJobMutation.mutateAsync(jobId);
      toast.success('Job retry initiated!');
      queryClient.refetchQueries({ queryKey: ['failed-jobs'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to retry job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 border-success/30 text-success';
      case 'processing':
        return 'bg-primary/10 border-primary/30 text-primary';
      case 'failed':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      default:
        return 'bg-muted/50 border-muted/30 text-muted-foreground';
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

  const loading = failedJobsLoading || uploadStatusLoading;
  const error = failedJobsError || uploadStatusError;

  if (loading && failedJobs.length === 0 && uploadStatuses.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="mobile-padding min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">⚙️ Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor uploads and manage failed jobs</p>
        </div>

        {error && (
          <ErrorBanner message={error?.message || 'Failed to load data'} onRetry={() => refetchFailedJobs()} />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <p className="text-sm text-muted-foreground mb-1">Failed Jobs</p>
            <p className="text-2xl font-bold text-destructive">{failedJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Awaiting retry</p>
          </Card>
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Active Uploads</p>
            <p className="text-2xl font-bold text-primary">
              {uploadStatuses.filter((u) => u.status === 'processing').length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Currently processing</p>
          </Card>
          <Card className="p-4 bg-success/5 border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Completed Uploads</p>
            <p className="text-2xl font-bold text-success">
              {uploadStatuses.filter((u) => u.status === 'completed').length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Successfully processed</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-muted">
          <Button
            variant={activeTab === 'failed-jobs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('failed-jobs')}
            className="rounded-b-none"
          >
            ❌ Failed Jobs ({failedJobs.length})
          </Button>
          <Button
            variant={activeTab === 'upload-status' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('upload-status')}
            className="rounded-b-none"
          >
            📊 Upload Status
          </Button>
        </div>

        {/* Failed Jobs Tab */}
        {activeTab === 'failed-jobs' && (
          <div className="space-y-4">
            {failedJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-lg font-semibold mb-2">No Failed Jobs</p>
                <p className="text-muted-foreground">All uploads processed successfully!</p>
              </Card>
            ) : (
              failedJobs.map((job) => (
                <Card key={job.id} className="p-4 border-destructive/30 bg-destructive/5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive mb-1">
                        Row {job.row_number}: {job.file_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        📤 {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-2xl">❌</span>
                  </div>

                  <Card className="p-3 bg-muted/30 mb-3">
                    <p className="text-sm font-mono text-destructive mb-2">
                      Error: {job.error_message}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold mb-1">Original Data:</p>
                      <pre className="bg-background p-2 rounded overflow-x-auto">
                        {JSON.stringify(job.original_data, null, 2)}
                      </pre>
                    </div>
                  </Card>

                  <Button
                    onClick={() => handleRetryJob(job.id)}
                    disabled={retryJobMutation.isPending}
                    className="w-full"
                  >
                    {retryJobMutation.isPending ? '⏳ Retrying...' : '🔄 Retry'}
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Upload Status Tab */}
        {activeTab === 'upload-status' && (
          <div className="space-y-4">
            {uploadStatuses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-lg font-semibold mb-2">No Uploads Yet</p>
                <p className="text-muted-foreground">No uploads have been processed</p>
              </Card>
            ) : (
              uploadStatuses.map((upload) => {
                const progress = upload.total_rows > 0 ? (upload.processed_rows / upload.total_rows) * 100 : 0;
                return (
                  <Card key={upload.id} className={`p-4 border ${getStatusColor(upload.status)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{upload.file_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {upload.file_type.toUpperCase()} • Uploaded{' '}
                          {new Date(upload.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-2xl">{getStatusIcon(upload.status)}</span>
                    </div>

                    {/* Progress Bar */}
                    {upload.status === 'processing' && (
                      <div className="mb-3">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {upload.processed_rows} / {upload.total_rows} rows processed ({progress.toFixed(0)}%)
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-background/50 p-2 rounded">
                        <p className="text-muted-foreground text-xs">Total Rows</p>
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
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Refresh Info */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-muted text-center">
          <p className="text-xs text-muted-foreground">
            🔄 This page auto-refreshes every 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
