import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, InputNumber, Select, Typography, Input } from 'antd';
import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useTransactions } from '../api/hooks/transactions';
import { RISK_LEVELS, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../api/types';
import type { RiskLevel, TransactionStatus, TransactionType } from '../api/types';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { PageHeader } from '../components/PageHeader';
import { QueryError } from '../components/QueryState';
import { AccountSelect, CustomerSelect } from '../components/Selects';
import { TransactionsTable } from '../components/TransactionsTable';
import { endOfDayIso, startOfDayIso } from '../lib/format';

function Filters() {
  const [sp] = useSearchParams();
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : null);
  const [status, setStatus] = useState<TransactionStatus | undefined>((sp.get('status') as TransactionStatus | null) ?? undefined);
  const [type, setType] = useState<TransactionType | undefined>((sp.get('type') as TransactionType | null) ?? undefined);
  const [accountId, setAccountId] = useState<string | undefined>(sp.get('accountId') ?? undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(sp.get('customerId') ?? undefined);
  const [risk, setRisk] = useState<RiskLevel | undefined>((sp.get('customerRiskLevel') as RiskLevel | null) ?? undefined);
  const [minAmount, setMin] = useState<number | null>(num('minAmount'));
  const [maxAmount, setMax] = useState<number | null>(num('maxAmount'));
  const [dateFrom, setFrom] = useState('');
  const [dateTo, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [newOpen, setNewOpen] = useState(false);

  const q = useTransactions({
    status,
    type,
    accountId,
    customerId,
    customerRiskLevel: risk,
    minAmount: minAmount ?? undefined,
    maxAmount: maxAmount ?? undefined,
    dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
    dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
    page,
    limit,
  });

  const rp = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function reset() {
    setStatus(undefined);
    setType(undefined);
    setAccountId(undefined);
    setCustomerId(undefined);
    setRisk(undefined);
    setMin(null);
    setMax(null);
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div data-testid="transactions-page">
      <PageHeader
        title="Transactions"
        testId="transactions-title"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)} data-testid="new-transaction-btn">
            New transaction
          </Button>
        }
      />
      <Flex gap={8} wrap style={{ marginBottom: 16 }} data-testid="transactions-filters">
        <Select<TransactionStatus>
          placeholder="Status"
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={rp(setStatus)}
          options={TRANSACTION_STATUSES.map((v) => ({ value: v, label: v }))}
          data-testid="transactions-filter-status"
        />
        <Select<TransactionType>
          placeholder="Type"
          allowClear
          style={{ width: 140 }}
          value={type}
          onChange={rp(setType)}
          options={TRANSACTION_TYPES.map((v) => ({ value: v, label: v }))}
          data-testid="transactions-filter-type"
        />
        <CustomerSelect testId="transactions-filter-customer" placeholder="Customer" allowClear style={{ width: 260 }} value={customerId} onChange={rp(setCustomerId)} />
        <AccountSelect testId="transactions-filter-account" placeholder="Account" allowClear style={{ width: 320 }} value={accountId} onChange={rp(setAccountId)} />
        <Select<RiskLevel>
          placeholder="Customer risk"
          allowClear
          style={{ width: 150 }}
          value={risk}
          onChange={rp(setRisk)}
          options={RISK_LEVELS.map((v) => ({ value: v, label: v }))}
          data-testid="transactions-filter-risk"
        />
        <InputNumber placeholder="Min amount" min={0} value={minAmount} onChange={rp(setMin)} data-testid="transactions-filter-min-amount" />
        <InputNumber placeholder="Max amount" min={0} value={maxAmount} onChange={rp(setMax)} data-testid="transactions-filter-max-amount" />
        <Input type="date" style={{ width: 150 }} value={dateFrom} onChange={(e) => rp(setFrom)(e.target.value)} title="Date from" data-testid="transactions-filter-date-from" />
        <Input type="date" style={{ width: 150 }} value={dateTo} onChange={(e) => rp(setTo)(e.target.value)} title="Date to" data-testid="transactions-filter-date-to" />
        <Button onClick={reset} data-testid="transactions-filter-reset">
          Reset
        </Button>
      </Flex>
      {q.isError && <QueryError error={q.error} onRetry={() => q.refetch()} testId="transactions-error" />}
      <Typography.Text type="secondary" data-testid="transactions-total">
        {q.data ? `Total: ${q.data.total}` : ''}
      </Typography.Text>
      <TransactionsTable
        testId="transactions-table"
        transactions={q.data?.items ?? []}
        loading={q.isLoading || q.isFetching}
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
      <NewTransactionModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

/** Keyed by the query string so links like /transactions?status=PENDING re-initialise the filters. */
export function TransactionsPage() {
  const { search } = useLocation();
  return <Filters key={search} />;
}
