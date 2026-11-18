import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { useAccounts } from '../api/hooks/accounts';
import { useCustomers } from '../api/hooks/customers';
import type { Account, AccountFilters } from '../api/types';
import { formatMoney } from '../lib/format';

type Base = Pick<SelectProps<string>, 'value' | 'onChange' | 'placeholder' | 'allowClear' | 'style' | 'disabled'> & {
  testId: string;
};

/** Searchable customer select (limit=100). Option label = "First Last (email)". */
export function CustomerSelect({ testId, ...rest }: Base) {
  const q = useCustomers({ limit: 100 });
  return (
    <Select<string>
      {...rest}
      data-testid={testId}
      showSearch
      optionFilterProp="label"
      loading={q.isLoading}
      status={q.isError ? 'error' : undefined}
      notFoundContent={q.isError ? 'Failed to load customers' : undefined}
      options={(q.data?.items ?? []).map((c) => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName} (${c.email})`,
      }))}
    />
  );
}

export function accountLabel(a: Account): string {
  const status = a.status === 'ACTIVE' ? '' : ` [${a.status}]`;
  return `${a.name} - ${a.customerName ?? ''} - ${a.currency} ${formatMoney(a.balance, a.currency)}${status}`;
}

/** Searchable account select (limit=100). Option label = "Name - Customer - EUR €2,500.00". */
export function AccountSelect({
  testId,
  filters,
  exclude,
  ...rest
}: Base & { filters?: Omit<AccountFilters, 'limit' | 'page'>; exclude?: string }) {
  const q = useAccounts({ ...filters, limit: 100 });
  return (
    <Select<string>
      {...rest}
      data-testid={testId}
      showSearch
      optionFilterProp="label"
      loading={q.isLoading}
      status={q.isError ? 'error' : undefined}
      notFoundContent={q.isError ? 'Failed to load accounts' : undefined}
      options={(q.data?.items ?? [])
        .filter((a) => a.id !== exclude)
        .map((a) => ({ value: a.id, label: accountLabel(a) }))}
    />
  );
}
