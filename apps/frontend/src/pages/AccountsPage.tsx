import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Select, Typography } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAccounts } from '../api/hooks/accounts';
import { ACCOUNT_STATUSES, CURRENCIES } from '../api/types';
import type { AccountStatus, Currency } from '../api/types';
import { AccountDrawer } from '../components/AccountDrawer';
import { AccountsTable } from '../components/AccountsTable';
import { OpenAccountModal } from '../components/OpenAccountModal';
import { PageHeader } from '../components/PageHeader';
import { QueryError } from '../components/QueryState';
import { CustomerSelect } from '../components/Selects';

export function AccountsPage() {
  const [sp] = useSearchParams();
  const [customerId, setCustomerId] = useState<string | undefined>(sp.get('customerId') ?? undefined);
  const [status, setStatus] = useState<AccountStatus | undefined>((sp.get('status') as AccountStatus | null) ?? undefined);
  const [currency, setCurrency] = useState<Currency | undefined>((sp.get('currency') as Currency | null) ?? undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const q = useAccounts({ customerId, status, currency, page, limit });

  const reset1 = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div data-testid="accounts-page">
      <PageHeader
        title="Accounts"
        testId="accounts-title"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)} data-testid="new-account-btn">
            Open account
          </Button>
        }
      />
      <Flex gap={8} wrap style={{ marginBottom: 16 }} data-testid="accounts-filters">
        <CustomerSelect
          testId="accounts-filter-customer"
          placeholder="Customer"
          allowClear
          style={{ width: 300 }}
          value={customerId}
          onChange={reset1(setCustomerId)}
        />
        <Select<AccountStatus>
          placeholder="Status"
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={reset1(setStatus)}
          options={ACCOUNT_STATUSES.map((v) => ({ value: v, label: v }))}
          data-testid="accounts-filter-status"
        />
        <Select<Currency>
          placeholder="Currency"
          allowClear
          style={{ width: 130 }}
          value={currency}
          onChange={reset1(setCurrency)}
          options={CURRENCIES.map((v) => ({ value: v, label: v }))}
          data-testid="accounts-filter-currency"
        />
        <Button
          onClick={() => {
            setCustomerId(undefined);
            setStatus(undefined);
            setCurrency(undefined);
            setPage(1);
          }}
          data-testid="accounts-filter-reset"
        >
          Reset
        </Button>
      </Flex>
      {q.isError && <QueryError error={q.error} onRetry={() => q.refetch()} testId="accounts-error" />}
      <Typography.Text type="secondary" data-testid="accounts-total">
        {q.data ? `Total: ${q.data.total}` : ''}
      </Typography.Text>
      <AccountsTable
        testId="accounts-table"
        accounts={q.data?.items ?? []}
        loading={q.isLoading || q.isFetching}
        onView={(a) => setDrawerId(a.id)}
        pagination={{
          current: page,
          pageSize: limit,
          total: q.data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(ps !== limit ? 1 : p);
            setLimit(ps);
          },
        }}
      />
      <AccountDrawer accountId={drawerId} onClose={() => setDrawerId(null)} />
      <OpenAccountModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
