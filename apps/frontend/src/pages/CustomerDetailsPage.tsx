import { Alert, Button, Card, Descriptions, Skeleton, Space, Typography } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/client';
import { useCustomer } from '../api/hooks/customers';
import { AccountDrawer } from '../components/AccountDrawer';
import { AccountsTable } from '../components/AccountsTable';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { OpenAccountModal } from '../components/OpenAccountModal';
import { PageHeader } from '../components/PageHeader';
import { QueryError } from '../components/QueryState';
import { KycTag, RiskTag } from '../components/Tags';
import { formatDateTime } from '../lib/format';

export function CustomerDetailsPage() {
  const { id } = useParams();
  const q = useCustomer(id);
  const c = q.data;
  const [editOpen, setEditOpen] = useState(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  return (
    <div data-testid="customer-details-page">
      <PageHeader
        title={c ? `${c.firstName} ${c.lastName}` : 'Customer'}
        testId="customer-details-title"
        extra={
          <Space>
            <Link to="/customers"><Button data-testid="customer-detail-back">Back to customers</Button></Link>
            <Button onClick={() => setEditOpen(true)} disabled={!c} data-testid="customer-detail-edit-btn">Edit</Button>
            <Button type="primary" onClick={() => setOpenAcc(true)} disabled={!c} data-testid="open-account-btn">
              Open account
            </Button>
          </Space>
        }
      />
      {q.isLoading && <div data-testid="customer-details-loading"><Skeleton active paragraph={{ rows: 6 }} /></div>}
      {q.isError &&
        (q.error instanceof ApiError && q.error.status === 404 ? (
          <Alert type="warning" showIcon title="Customer not found" description={q.error.message} data-testid="customer-details-not-found" />
        ) : (
          <QueryError error={q.error} onRetry={() => q.refetch()} testId="customer-details-error" />
        ))}
      {c && (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Card title="Profile" data-testid="customer-profile">
            <Descriptions column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="Name"><span data-testid="customer-detail-name">{c.firstName} {c.lastName}</span></Descriptions.Item>
              <Descriptions.Item label="Email"><span data-testid="customer-detail-email">{c.email}</span></Descriptions.Item>
              <Descriptions.Item label="Phone"><span data-testid="customer-detail-phone">{c.phone || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="Country"><span data-testid="customer-detail-country">{c.country}</span></Descriptions.Item>
              <Descriptions.Item label="KYC"><KycTag value={c.kycStatus} testId="customer-detail-kyc" /></Descriptions.Item>
              <Descriptions.Item label="Risk"><RiskTag value={c.riskLevel} testId="customer-detail-risk" /></Descriptions.Item>
              <Descriptions.Item label="Created">{formatDateTime(c.createdAt)}</Descriptions.Item>
            </Descriptions>
            <Space>
              <Link to={`/accounts?customerId=${c.id}`} data-testid="customer-detail-accounts-link">All accounts</Link>
              <Link to={`/transactions?customerId=${c.id}`} data-testid="customer-detail-transactions-link">Transactions</Link>
            </Space>
          </Card>
          <Card title={<Typography.Text>Accounts</Typography.Text>} data-testid="customer-accounts-card">
            <AccountsTable
              testId="customer-accounts-table"
              accounts={c.accounts ?? []}
              loading={q.isFetching && !c.accounts}
              showCustomer={false}
              onView={(a) => setDrawerId(a.id)}
            />
          </Card>
        </Space>
      )}
      <CustomerFormModal open={editOpen} customer={c} onClose={() => setEditOpen(false)} />
      <OpenAccountModal open={openAcc} customerId={c?.id} onClose={() => setOpenAcc(false)} />
      <AccountDrawer accountId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
