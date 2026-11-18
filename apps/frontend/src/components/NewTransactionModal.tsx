import { Button, Form, Input, InputNumber, Modal, Tabs } from 'antd';
import { useState } from 'react';
import { useDeposit, useTransfer, useWithdraw } from '../api/hooks/transactions';
import { useFeedback } from '../lib/feedback';
import { AccountSelect } from './Selects';

interface Values {
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;
  description?: string;
}

type Kind = 'deposit' | 'withdraw' | 'transfer';

function Amount({ testId }: { testId: string }) {
  return (
    <Form.Item
      name="amount"
      label="Amount"
      rules={[
        { required: true, message: 'Amount is required' },
        { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
      ]}
    >
      <InputNumber style={{ width: '100%' }} min={0} precision={2} step={100} data-testid={testId} />
    </Form.Item>
  );
}

function TxForm({ kind, onDone, onCancel }: { kind: Kind; onDone: () => void; onCancel: () => void }) {
  const [form] = Form.useForm<Values>();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const transfer = useTransfer();
  const { run } = useFeedback();
  const from = Form.useWatch('fromAccountId', form);
  const to = Form.useWatch('toAccountId', form);
  const pending = deposit.isPending || withdraw.isPending || transfer.isPending;
  const t = `tx-form-${kind}`;

  async function submit(v: Values) {
    const description = v.description?.trim() || undefined;
    let res;
    if (kind === 'deposit') {
      res = await run(deposit.mutateAsync({ accountId: v.accountId!, amount: v.amount, description }), 'Deposit created');
    } else if (kind === 'withdraw') {
      res = await run(withdraw.mutateAsync({ accountId: v.accountId!, amount: v.amount, description }), 'Withdrawal created');
    } else {
      res = await run(
        transfer.mutateAsync({ fromAccountId: v.fromAccountId!, toAccountId: v.toAccountId!, amount: v.amount, description }),
        (tx) => (tx.status === 'PENDING' ? 'Transfer created and is PENDING approval (four-eyes rule)' : 'Transfer completed'),
      );
    }
    if (res) onDone();
  }

  return (
    <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
      {kind === 'transfer' ? (
        <>
          <Form.Item name="fromAccountId" label="From account" rules={[{ required: true, message: 'Select source account' }]}>
            <AccountSelect testId={`${t}-from`} placeholder="Select source account" exclude={to} />
          </Form.Item>
          <Form.Item name="toAccountId" label="To account" rules={[{ required: true, message: 'Select destination account' }]}>
            <AccountSelect testId={`${t}-to`} placeholder="Select destination account" exclude={from} />
          </Form.Item>
        </>
      ) : (
        <Form.Item name="accountId" label="Account" rules={[{ required: true, message: 'Select an account' }]}>
          <AccountSelect testId={`${t}-account`} placeholder="Select account" />
        </Form.Item>
      )}
      <Amount testId={`${t}-amount`} />
      <Form.Item name="description" label="Description">
        <Input data-testid={`${t}-description`} />
      </Form.Item>
      <div style={{ textAlign: 'right' }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }} data-testid={`${t}-cancel`}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" loading={pending} data-testid={`${t}-submit`}>
          {kind === 'deposit' ? 'Deposit' : kind === 'withdraw' ? 'Withdraw' : 'Transfer'}
        </Button>
      </div>
    </Form>
  );
}

export function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Kind>('deposit');
  return (
    <Modal open={open} title="New transaction" onCancel={onClose} footer={null} destroyOnHidden width={560} modalRender={(node) => <div data-testid="tx-modal">{node}</div>}>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as Kind)}
        destroyOnHidden
        items={(['deposit', 'withdraw', 'transfer'] as Kind[]).map((k) => ({
          key: k,
          label: <span data-testid={`tx-tab-${k}`}>{k === 'deposit' ? 'Deposit' : k === 'withdraw' ? 'Withdraw' : 'Transfer'}</span>,
          children: <TxForm kind={k} onDone={onClose} onCancel={onClose} />,
        }))}
      />
    </Modal>
  );
}
