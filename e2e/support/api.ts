export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api';

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const resetData = () => api('/dev/reset', { method: 'POST' });

export async function customerByEmail(email: string) {
  const r = await api<{ items: any[] }>(`/customers?search=${encodeURIComponent(email)}&limit=100`);
  const c = r.items.find((x) => x.email === email);
  if (!c) throw new Error(`customer ${email} not found`);
  return c;
}

export async function customerWithAccounts(email: string) {
  const c = await customerByEmail(email);
  return api<any>(`/customers/${c.id}`);
}

export async function listTransactions(query: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
  return api<{ items: any[]; total: number }>(`/transactions?${qs}`);
}
