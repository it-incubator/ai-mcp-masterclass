import { Button, Empty, Space, Table, Typography } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { useState } from 'react';
import { useApproveTransaction, useReverseTransaction } from '../api/hooks/transactions';
import type { Transaction } from '../api/types';
import { formatDateTime, formatMoney } from '../lib/format';
import { useFeedback } from '../lib/feedback';
import { RejectModal } from './RejectModal';
import { RiskTag, TxStatusTag, TxTypeTag } from './Tags';
import type { RiskLevel } from '../api/types';

interface Props {
  testId: string;
  rowPrefix?: string;
  transactions: Transaction[];
  loading: boolean;
  actions?: boolean;
  pagination?: TablePaginationConfig | false;
}

function Party({ account, customer, risk, id, side }: { account?: string | null; customer?: string | null; risk?: RiskLevel | null; id: string; side: 'from' | 'to' }) {
  if (!account) return <span>-</span>;
  return (
    <div data-testid={`tx-${side}-${id}`}>
      <div>{account}</div>
      <Typography.Text type="secondary">
        {customer} {risk && <RiskTag value={risk} testId={`tx-${side}-risk-${id}`} />}
      </Typography.Text>
    </div>
  );
}

export function TransactionsTable({ testId, rowPrefix = 'tx', transactions, loading, actions = true, pagination = false }: Props) {
  const approve = useApproveTransaction();
  const reverse = useReverseTransaction();
  const { run, confirm } = useFeedback();
  const [rejectId, setRejectId] = useState<string | null>(null);

  return (
    <>
      <Table<Transaction>
        data-testid={testId}
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={transactions}
        pagination={pagination}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description={<span data-testid={`${testId}-empty`}>No transactions found</span>} /> }}
        onRow={(t) => ({ 'data-testid': `${rowPrefix}-row-${t.id}` }) as React.HTMLAttributes<HTMLElement>}
        columns={[
          { title: 'Date', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
          { title: 'Type', dataIndex: 'type', render: (v, t) => <TxTypeTag value={v} testId={`${rowPrefix}-type-${t.id}`} /> },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v, t) => (
              <div>
                <TxStatusTag value={v} testId={`${rowPrefix}-status-${t.id}`} />
                {t.rejectionReason && (
                  <div>
                    <Typography.Text type="secondary" data-testid={`${rowPrefix}-reason-${t.id}`}>
                      {t.rejectionReason}
                    </Typography.Text>
                  </div>
                )}
              </div>
            ),
          },
          {
            title: 'Amount',
            dataIndex: 'amount',
            align: 'right' as const,
            render: (v: number, t) => <span data-testid={`${rowPrefix}-amount-${t.id}`}>{formatMoney(v, t.currency)}</span>,
          },
          {
            title: 'From',
            key: 'from',
            render: (_: unknown, t) => (
              <Party account={t.fromAccountName ?? t.fromAccountId} customer={t.fromCustomerName} risk={t.fromCustomerRiskLevel} id={t.id} side="from" />
            ),
          },
          {
            title: 'To',
            key: 'to',
            render: (_: unknown, t) => (
              <Party account={t.toAccountName ?? t.toAccountId} customer={t.toCustomerName} risk={t.toCustomerRiskLevel} id={t.id} side="to" />
            ),
          },
          { title: 'Description', dataIndex: 'description', render: (v: string | null) => v ?? '' },
          ...(actions
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_: unknown, t: Transaction) => (
                    <Space size="small" wrap>
                      {t.status === 'PENDING' && (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            data-testid={`tx-approve-${t.id}`}
                            loading={approve.isPending && approve.variables === t.id}
                            onClick={() => run(approve.mutateAsync(t.id), 'Transaction approved')}
                          >
                            Approve
                          </Button>
                          <Button size="small" danger data-testid={`tx-reject-${t.id}`} onClick={() => setRejectId(t.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {t.status === 'COMPLETED' && (
                        <Button
                          size="small"
                          data-testid={`tx-reverse-${t.id}`}
                          onClick={() =>
                            confirm({
                              title: 'Reverse transaction?',
                              content: `${formatMoney(t.amount, t.currency)} ${t.type.toLowerCase()} will be reversed.`,
                              okText: 'Reverse',
                              danger: true,
                              onOk: () => run(reverse.mutateAsync(t.id), 'Transaction reversed'),
                            })
                          }
                        >
                          Reverse
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      {actions && <RejectModal txId={rejectId} onClose={() => setRejectId(null)} />}
    </>
  );
}
