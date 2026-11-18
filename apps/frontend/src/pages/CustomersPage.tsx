import { PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Empty, Flex, Input, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useCustomers, useDeleteCustomer, useSetKycStatus } from '../api/hooks/customers';
import { KYC_STATUSES, RISK_LEVELS } from '../api/types';
import type { Customer, KycStatus, RiskLevel } from '../api/types';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { PageHeader } from '../components/PageHeader';
import { QueryError } from '../components/QueryState';
import { KycTag, RiskTag } from '../components/Tags';
import { formatDateTime } from '../lib/format';
import { useFeedback } from '../lib/feedback';
import { useDebounced } from '../lib/hooks';

export function CustomersPage() {
  const [sp] = useSearchParams();
  const [search, setSearch] = useState('');
  const [kyc, setKyc] = useState<KycStatus | undefined>((sp.get('kycStatus') as KycStatus | null) ?? undefined);
  const [risk, setRisk] = useState<RiskLevel | undefined>((sp.get('riskLevel') as RiskLevel | null) ?? undefined);
  const [country, setCountry] = useState('');
  const [pending, setPending] = useState(sp.get('hasPendingTransactions') === 'true');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>();

  const dSearch = useDebounced(search.trim());
  const dCountry = useDebounced(country.trim().toUpperCase());
  const q = useCustomers({
    search: dSearch || undefined,
    kycStatus: kyc,
    riskLevel: risk,
    country: dCountry || undefined,
    hasPendingTransactions: pending || undefined,
    page,
    limit,
  });
  const setKycStatus = useSetKycStatus();
  const del = useDeleteCustomer();
  const { run, confirm } = useFeedback();

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function reset() {
    setSearch('');
    setKyc(undefined);
    setRisk(undefined);
    setCountry('');
    setPending(false);
    setPage(1);
  }

  return (
    <div data-testid="customers-page">
      <PageHeader
        title="Customers"
        testId="customers-title"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewOpen(true)} data-testid="new-customer-btn">
            New customer
          </Button>
        }
      />
      <Flex gap={8} wrap style={{ marginBottom: 16 }} data-testid="customers-filters">
        <Input
          placeholder="Search name or email"
          allowClear
          style={{ width: 260 }}
          value={search}
          onChange={(e) => resetPage(setSearch)(e.target.value)}
          data-testid="customers-filter-search"
        />
        <Select<KycStatus>
          placeholder="KYC status"
          allowClear
          style={{ width: 150 }}
          value={kyc}
          onChange={resetPage(setKyc)}
          options={KYC_STATUSES.map((v) => ({ value: v, label: v }))}
          data-testid="customers-filter-kyc"
        />
        <Select<RiskLevel>
          placeholder="Risk level"
          allowClear
          style={{ width: 150 }}
          value={risk}
          onChange={resetPage(setRisk)}
          options={RISK_LEVELS.map((v) => ({ value: v, label: v }))}
          data-testid="customers-filter-risk"
        />
        <Input
          placeholder="Country (ISO-2)"
          maxLength={2}
          allowClear
          style={{ width: 140 }}
          value={country}
          onChange={(e) => resetPage(setCountry)(e.target.value)}
          data-testid="customers-filter-country"
        />
        <Checkbox checked={pending} onChange={(e) => resetPage(setPending)(e.target.checked)} data-testid="customers-filter-has-pending">
          Has pending transactions
        </Checkbox>
        <Button onClick={reset} data-testid="customers-filter-reset">
          Reset
        </Button>
      </Flex>
      {q.isError && <QueryError error={q.error} onRetry={() => q.refetch()} testId="customers-error" />}
      <Typography.Text type="secondary" data-testid="customers-total">
        {q.data ? `Total: ${q.data.total}` : ''}
      </Typography.Text>
      <Table<Customer>
        data-testid="customers-table"
        rowKey="id"
        loading={q.isLoading || q.isFetching}
        dataSource={q.data?.items ?? []}
        locale={{ emptyText: <Empty description={<span data-testid="customers-empty">No customers found</span>} /> }}
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
        onRow={(c) => ({ 'data-testid': `customer-row-${c.email}` }) as React.HTMLAttributes<HTMLElement>}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'Name',
            key: 'name',
            render: (_: unknown, c) => (
              <Link to={`/customers/${c.id}`} data-testid={`customer-link-${c.email}`}>
                {c.firstName} {c.lastName}
              </Link>
            ),
          },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Country', dataIndex: 'country' },
          { title: 'KYC', dataIndex: 'kycStatus', render: (v, c) => <KycTag value={v} testId={`customer-kyc-${c.email}`} /> },
          { title: 'Risk', dataIndex: 'riskLevel', render: (v, c) => <RiskTag value={v} testId={`customer-risk-${c.email}`} /> },
          {
            title: 'Accounts',
            dataIndex: 'accountsCount',
            align: 'right' as const,
            render: (v: number | undefined, c) => <span data-testid={`customer-accounts-${c.email}`}>{v ?? 0}</span>,
          },
          { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, c) => (
              <Space size="small" wrap>
                <Link to={`/customers/${c.id}`}>
                  <Button size="small" data-testid={`customer-view-${c.email}`}>View</Button>
                </Link>
                <Button size="small" onClick={() => setEditing(c)} data-testid={`customer-edit-${c.email}`}>
                  Edit
                </Button>
                {c.kycStatus !== 'VERIFIED' && (
                  <Button
                    size="small"
                    data-testid={`customer-kyc-verify-${c.email}`}
                    onClick={() => run(setKycStatus.mutateAsync({ id: c.id, status: 'VERIFIED' }), `KYC verified for ${c.email}`)}
                  >
                    Verify KYC
                  </Button>
                )}
                {c.kycStatus !== 'REJECTED' && (
                  <Button
                    size="small"
                    data-testid={`customer-kyc-reject-${c.email}`}
                    onClick={() => run(setKycStatus.mutateAsync({ id: c.id, status: 'REJECTED' }), `KYC rejected for ${c.email}`)}
                  >
                    Reject KYC
                  </Button>
                )}
                <Button
                  size="small"
                  danger
                  data-testid={`customer-delete-${c.email}`}
                  onClick={() =>
                    confirm({
                      title: 'Delete customer?',
                      content: `${c.firstName} ${c.lastName} (${c.email}) will be permanently deleted.`,
                      okText: 'Delete',
                      danger: true,
                      onOk: () => run(del.mutateAsync(c.id), `Customer ${c.email} deleted`),
                    })
                  }
                >
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <CustomerFormModal open={newOpen} onClose={() => setNewOpen(false)} />
      <CustomerFormModal open={!!editing} customer={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
