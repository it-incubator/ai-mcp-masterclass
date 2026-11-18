import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { Summary } from '../types';

export function useSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get<Summary>('/reports/summary'),
  });
}
