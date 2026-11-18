import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Account, AccountDetails, AccountFilters, Currency, Page } from '../types';

export function useAccounts(filters: AccountFilters, enabled = true) {
  return useQuery({
    queryKey: ['accounts', 'list', filters],
    queryFn: () => api.get<Page<Account>>('/accounts', { ...filters }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['accounts', 'detail', id ?? ''],
    queryFn: () => api.get<AccountDetails>(`/accounts/${id}`),
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['accounts'] }),
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['reports'] }),
    ]);
}

export function useOpenAccount() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { customerId: string; currency: Currency; name: string }) =>
      api.post<Account>('/accounts', body),
    onSuccess: invalidate,
  });
}

export function useAccountAction(action: 'freeze' | 'unfreeze' | 'close') {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.post<Account>(`/accounts/${id}/${action}`),
    onSuccess: invalidate,
  });
}

export const useFreezeAccount = () => useAccountAction('freeze');
export const useUnfreezeAccount = () => useAccountAction('unfreeze');
export const useCloseAccount = () => useAccountAction('close');
