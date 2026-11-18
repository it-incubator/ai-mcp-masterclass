import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Skeleton, Space, Statistic } from 'antd';
import { Link } from 'react-router';
import { useSummary } from '../api/hooks/reports';
import { CURRENCIES } from '../api/types';
import type { CurrencyMap } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { QueryError } from '../components/QueryState';
import { AccountStatusTag, KycTag } from '../components/Tags';
import { formatMoney } from '../lib/format';

function PerCurrency({ title, prefix, values }: { title: string; prefix: string; values: CurrencyMap }) {
  return (
    <Card title={title} data-testid={`${prefix}-card`}>
      <Row gutter={16}>
        {CURRENCIES.map((c) => (
          <Col span={8} key={c}>
            <Statistic
              title={c}
              valueRender={() => <span data-testid={`${prefix}-${c.toLowerCase()}`}>{formatMoney(values?.[c] ?? 0, c)}</span>}
              value={values?.[c] ?? 0}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
}

export function DashboardPage() {
  const q = useSummary();
  const s = q.data;

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title="Dashboard"
        testId="dashboard-title"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => q.refetch()} loading={q.isFetching} data-testid="dashboard-refresh-btn">
            Refresh
          </Button>
        }
      />
      {q.isError && <QueryError error={q.error} onRetry={() => q.refetch()} testId="dashboard-error" />}
      {q.isLoading && <div data-testid="dashboard-loading"><Skeleton active paragraph={{ rows: 8 }} /></div>}
      {s && (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card data-testid="stat-customers-card">
                <Statistic title="Customers" valueRender={() => <span data-testid="stat-customers">{s.customersTotal}</span>} value={s.customersTotal} />
                <Space size={4} wrap style={{ marginTop: 8 }}>
                  {(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((k) => (
                    <span key={k}>
                      <KycTag value={k} />
                      <span data-testid={`stat-kyc-${k.toLowerCase()}`}>{s.customersByKyc?.[k] ?? 0}</span>
                    </span>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card data-testid="stat-accounts-card">
                <Statistic title="Accounts" valueRender={() => <span data-testid="stat-accounts">{s.accountsTotal}</span>} value={s.accountsTotal} />
                <Space size={4} wrap style={{ marginTop: 8 }}>
                  {(['ACTIVE', 'FROZEN', 'CLOSED'] as const).map((k) => (
                    <span key={k}>
                      <AccountStatusTag value={k} />
                      <span data-testid={`stat-accounts-${k.toLowerCase()}`}>{s.accountsByStatus?.[k] ?? 0}</span>
                    </span>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Pending approvals" data-testid="pending-card" extra={<span>four-eyes queue</span>}>
                <Statistic title="Pending transactions" valueRender={() => <span data-testid="stat-pending">{s.pendingTransactions}</span>} value={s.pendingTransactions} />
                <div style={{ margin: '8px 0' }}>
                  {CURRENCIES.map((c) => (
                    <div key={c} data-testid={`stat-pending-amount-${c.toLowerCase()}`}>{formatMoney(s.pendingAmountByCurrency?.[c] ?? 0, c)}</div>
                  ))}
                </div>
                <Link to="/transactions?status=PENDING">
                  <Button type="primary" data-testid="pending-approvals-link">
                    Review pending approvals
                  </Button>
                </Link>
              </Card>
            </Col>
          </Row>
          <PerCurrency title="Total balance" prefix="stat-balance" values={s.totalBalanceByCurrency} />
          <PerCurrency title="Volume, last 30 days (completed)" prefix="stat-volume" values={s.volumeLast30Days} />
        </Space>
      )}
    </div>
  );
}
