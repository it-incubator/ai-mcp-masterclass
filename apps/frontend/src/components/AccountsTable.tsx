import { Button, Empty, Space, Table } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { Link } from 'react-router';
import { useCloseAccount, useFreezeAccount, useUnfreezeAccount } from '../api/hooks/accounts';
import type { Account } from '../api/types';
import { formatDateTime, formatMoney } from '../lib/format';
import { useFeedback } from '../lib/feedback';
import { AccountStatusTag } from './Tags';

interface Props {
  testId: string;
  accounts: Account[];
  loading: boolean;
  showCustomer?: boolean;
  pagination?: TablePaginationConfig | false;
  onView: (a: Account) => void;
}

export function AccountsTable({ testId, accounts, loading, showCustomer = true, pagination = false, onView }: Props) {
  const freeze = useFreezeAccount();
  const unfreeze = useUnfreezeAccount();
  const close = useCloseAccount();
  const { run, confirm } = useFeedback();

  return (
    <Table<Account>
      data-testid={testId}
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={accounts}
      pagination={pagination}
      locale={{ emptyText: <Empty description={<span data-testid={`${testId}-empty`}>No accounts found</span>} /> }}
      onRow={(a) => ({ 'data-testid': `account-row-${a.id}` }) as React.HTMLAttributes<HTMLElement>}
      columns={[
        {
          title: 'Name',
          dataIndex: 'name',
          render: (v: string, a) => <span data-testid={`account-name-${a.id}`}>{v}</span>,
        },
        ...(showCustomer
          ? [
              {
                title: 'Customer',
                dataIndex: 'customerName',
                render: (v: string | undefined, a: Account) => (
                  <Link to={`/customers/${a.customerId}`} data-testid={`account-customer-${a.id}`}>
                    {v ?? a.customerId}
                  </Link>
                ),
              },
            ]
          : []),
        { title: 'Currency', dataIndex: 'currency', render: (v: string, a) => <span data-testid={`account-currency-${a.id}`}>{v}</span> },
        {
          title: 'Balance',
          dataIndex: 'balance',
          align: 'right' as const,
          render: (v: number, a) => <span data-testid={`account-balance-${a.id}`}>{formatMoney(v, a.currency)}</span>,
        },
        { title: 'Status', dataIndex: 'status', render: (v, a) => <AccountStatusTag value={v} testId={`account-status-${a.id}`} /> },
        { title: 'Created', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
        {
          title: 'Actions',
          key: 'actions',
          render: (_: unknown, a) => (
            <Space size="small" wrap>
              <Button size="small" onClick={() => onView(a)} data-testid={`account-view-${a.id}`}>
                View
              </Button>
              {a.status === 'ACTIVE' && (
                <Button
                  size="small"
                  data-testid={`account-freeze-${a.id}`}
                  onClick={() => run(freeze.mutateAsync(a.id), `Account "${a.name}" frozen`)}
                >
                  Freeze
                </Button>
              )}
              {a.status === 'FROZEN' && (
                <Button
                  size="small"
                  data-testid={`account-unfreeze-${a.id}`}
                  onClick={() => run(unfreeze.mutateAsync(a.id), `Account "${a.name}" unfrozen`)}
                >
                  Unfreeze
                </Button>
              )}
              {a.status !== 'CLOSED' && (
                <Button
                  size="small"
                  danger
                  data-testid={`account-close-${a.id}`}
                  onClick={() =>
                    confirm({
                      title: 'Close account?',
                      content: `Account "${a.name}" will be closed. This cannot be undone.`,
                      okText: 'Close account',
                      danger: true,
                      onOk: () => run(close.mutateAsync(a.id), `Account "${a.name}" closed`),
                    })
                  }
                >
                  Close
                </Button>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
}
