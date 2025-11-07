import { useMutation, useQuery, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import api from '@/services/api';
import { useAuth } from './useAuth';

// Types
export interface UploadProgress {
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  fileName: string;
  uploadId: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface FailedJob {
  id: string;
  upload_id: string;
  file_name: string;
  row_number: number;
  error_message: string;
  original_data: Record<string, any>;
  created_at: string;
}

export interface UploadStatus {
  id: string;
  file_name: string;
  file_type: 'csv' | 'receipt';
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
  total_revenue?: number;
  average_value?: number;
}

// CSV Upload Hook
export const useUploadCsv = (): UseMutationResult<any, Error, File> => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // Don't manually set Content-Type - axios will handle multipart/form-data with proper boundary
      return api.post('/data/upload-csv/', formData);
    },
    onError: (error: any) => {
      console.error('CSV upload failed:', error);
    },
  });
};

// Receipt Upload Hook
export const useUploadReceipt = (): UseMutationResult<any, Error, File> => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      // Don't manually set Content-Type - axios will handle multipart/form-data with proper boundary
      return api.post('/data/upload-receipt/', formData);
    },
    onError: (error: any) => {
      console.error('Receipt upload failed:', error);
    },
  });
};

// Transactions List Hook
export interface TransactionsListParams {
  page?: number;
  limit?: number;
  product_id?: string;
  customer_id?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const useTransactionsList = (
  params: TransactionsListParams = {}
): UseQueryResult<PaginatedResponse<any>, Error> => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const response = await api.get('/data/transactions/', { params });
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Failed Jobs Hook
export const useFailedJobs = (): UseQueryResult<PaginatedResponse<FailedJob>, Error> => {
  return useQuery({
    queryKey: ['failed-jobs'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<FailedJob>>('/data/admin/failed-jobs/');
      return response.data;
    },
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 1 * 60 * 1000, // 1 minute
  });
};

// Retry Failed Job Hook
export const useRetryFailedJob = (): UseMutationResult<any, Error, string> => {
  return useMutation({
    mutationFn: async (jobId: string) => {
      return api.post(`/data/admin/failed-jobs/${jobId}/retry/`);
    },
    onError: (error: any) => {
      console.error('Failed job retry failed:', error);
    },
  });
};

// Upload Status Hook
export const useUploadStatus = (): UseQueryResult<PaginatedResponse<UploadStatus>, Error> => {
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;

  return useQuery({
    queryKey: ['upload-status'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<UploadStatus>>(
        '/data/admin/upload-status/'
      );
      return response.data;
    },
    staleTime: 2 * 1000, // 2 seconds (real-time updates)
    gcTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: isStaff ? 5 * 1000 : false,
    enabled: isStaff,
    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status;
      if (status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Receipt Preview Hook
export interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  confidence: number;
}

export interface ReceiptData {
  id: string;
  image_url: string;
  extracted_items: ExtractedItem[];
  total_amount: number;
  vendor_name?: string;
  transaction_date?: string;
  confidence_score: number;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

export const useReceiptPreview = (
  imageId: string | undefined
): UseQueryResult<ReceiptData, Error> => {
  return useQuery({
    queryKey: ['receipt', imageId],
    queryFn: async () => {
      if (!imageId) throw new Error('Image ID is required');
      const response = await api.get<ReceiptData>(`/data/receipts/${imageId}/`);
      return response.data;
    },
    enabled: !!imageId,
  });
};

// Confirm Receipt Hook
export const useConfirmReceipt = (): UseMutationResult<
  any,
  Error,
  { imageId: string; items: ExtractedItem[] }
> => {
  return useMutation({
    mutationFn: async ({ imageId, items }) => {
      return api.post(`/data/receipts/${imageId}/confirm/`, {
        items,
      });
    },
    onError: (error: any) => {
      console.error('Receipt confirmation failed:', error);
    },
  });
};

// Reject Receipt Hook
export const useRejectReceipt = (): UseMutationResult<any, Error, string> => {
  return useMutation({
    mutationFn: async (imageId: string) => {
      return api.post(`/data/receipts/${imageId}/reject/`);
    },
    onError: (error: any) => {
      console.error('Receipt rejection failed:', error);
    },
  });
};
