import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Page, Transaction, TransactionFilters } from '../types';

export function useTransactions(filters: TransactionFilters, enabled = true) {
  return useQuery({
    queryKey: ['transactions', 'list', filters],
    queryFn: () => api.get<Page<Transaction>>('/transactions', { ...filters }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', 'detail', id ?? ''],
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['accounts'] }),
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['reports'] }),
    ]);
}

interface Movement {
  amount: number;
  description?: string;
}

export function useDeposit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Movement & { accountId: string }) => api.post<Transaction>('/transactions/deposit', body),
    onSuccess: invalidate,
  });
}

export function useWithdraw() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Movement & { accountId: string }) => api.post<Transaction>('/transactions/withdraw', body),
    onSuccess: invalidate,
  });
}

export function useTransfer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Movement & { fromAccountId: string; toAccountId: string }) =>
      api.post<Transaction>('/transactions/transfer', body),
    onSuccess: invalidate,
  });
}

export function useApproveTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.post<Transaction>(`/transactions/${id}/approve`),
    onSuccess: invalidate,
  });
}

export function useRejectTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<Transaction>(`/transactions/${id}/reject`, { reason }),
    onSuccess: invalidate,
  });
}

export function useReverseTransaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.post<Transaction>(`/transactions/${id}/reverse`),
    onSuccess: invalidate,
  });
}
