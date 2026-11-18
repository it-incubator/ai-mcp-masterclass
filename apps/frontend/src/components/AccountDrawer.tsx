import { Descriptions, Drawer, Spin, Typography } from 'antd';
import { useAccount } from '../api/hooks/accounts';
import { useTransactions } from '../api/hooks/transactions';
import { formatDateTime, formatMoney } from '../lib/format';
import { AccountStatusTag } from './Tags';
import { QueryError } from './QueryState';
import { TransactionsTable } from './TransactionsTable';

export function AccountDrawer({ accountId, onClose }: { accountId: string | null; onClose: () => void }) {
  const acc = useAccount(accountId ?? undefined);
  const txs = useTransactions({ accountId: accountId ?? undefined, limit: 10 }, !!accountId);
  const a = acc.data;

  return (
    <Drawer open={!!accountId} onClose={onClose} size={880} title={a ? `Account: ${a.name}` : 'Account'} destroyOnHidden drawerRender={(node) => <div data-testid="account-drawer" style={{ height: '100%' }}>{node}</div>}>
      {acc.isError && <QueryError error={acc.error} onRetry={() => acc.refetch()} testId="account-drawer-error" />}
      {acc.isLoading && <Spin data-testid="account-drawer-loading" />}
      {a && (
        <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Name"><span data-testid="account-drawer-name">{a.name}</span></Descriptions.Item>
          <Descriptions.Item label="Status"><AccountStatusTag value={a.status} testId="account-drawer-status" /></Descriptions.Item>
          <Descriptions.Item label="Customer">
            <span data-testid="account-drawer-customer">
              {a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : a.customerName}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Currency"><span data-testid="account-drawer-currency">{a.currency}</span></Descriptions.Item>
          <Descriptions.Item label="Balance"><span data-testid="account-drawer-balance">{formatMoney(a.balance, a.currency)}</span></Descriptions.Item>
          <Descriptions.Item label="Created">{formatDateTime(a.createdAt)}</Descriptions.Item>
        </Descriptions>
      )}
      <Typography.Title level={5}>Recent transactions</Typography.Title>
      {txs.isError && <QueryError error={txs.error} onRetry={() => txs.refetch()} testId="account-drawer-tx-error" />}
      <TransactionsTable
        testId="account-drawer-tx-table"
        rowPrefix="drawer-tx"
        transactions={txs.data?.items ?? []}
        loading={txs.isLoading}
        actions={false}
      />
    </Drawer>
  );
}
