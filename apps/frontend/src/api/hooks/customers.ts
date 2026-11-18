import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Customer, CustomerDetails, CustomerFilters, CustomerInput, KycStatus, Page } from '../types';

export const customerKeys = {
  all: ['customers'] as const,
  list: (f: CustomerFilters) => ['customers', 'list', f] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => api.get<Page<Customer>>('/customers', { ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: () => api.get<CustomerDetails>(`/customers/${id}`),
    enabled: !!id,
  });
}

/** Invalidate everything a customer change could affect. */
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['accounts'] }),
      qc.invalidateQueries({ queryKey: ['reports'] }),
    ]);
}

export function useCreateCustomer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: CustomerInput) => api.post<Customer>('/customers', body),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CustomerInput> }) =>
      api.patch<Customer>(`/customers/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useSetKycStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<KycStatus, 'PENDING'> }) =>
      api.post<Customer>(`/customers/${id}/kyc`, { status }),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/customers/${id}`),
    onSuccess: invalidate,
  });
}
