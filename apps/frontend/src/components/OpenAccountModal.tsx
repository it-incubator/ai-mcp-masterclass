import { Button, Form, Input, Modal, Select } from 'antd';
import { useOpenAccount } from '../api/hooks/accounts';
import { CURRENCIES } from '../api/types';
import type { Currency } from '../api/types';
import { useFeedback } from '../lib/feedback';
import { CustomerSelect } from './Selects';

interface Values {
  customerId: string;
  currency: Currency;
  name: string;
}

interface Props {
  open: boolean;
  customerId?: string; // fixed customer (customer details page)
  onClose: () => void;
}

export function OpenAccountModal({ open, customerId, onClose }: Props) {
  const [form] = Form.useForm<Values>();
  const openAccount = useOpenAccount();
  const { run } = useFeedback();

  async function submit(values: Values) {
    const res = await run(
      openAccount.mutateAsync({ ...values, customerId: customerId ?? values.customerId, name: values.name.trim() }),
      (a) => `Account "${a.name}" (${a.currency}) opened`,
    );
    if (res) onClose();
  }

  return (
    <Modal
      open={open}
      title="Open account"
      onCancel={onClose}
      destroyOnHidden
      modalRender={(node) => <div data-testid="open-account-modal">{node}</div>}
      footer={[
        <Button key="c" onClick={onClose} data-testid="account-form-cancel">
          Cancel
        </Button>,
        <Button
          key="s"
          type="primary"
          loading={openAccount.isPending}
          onClick={() => form.submit()}
          data-testid="account-form-submit"
        >
          Open account
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false} initialValues={{ currency: 'USD' }}>
        {!customerId && (
          <Form.Item name="customerId" label="Customer" rules={[{ required: true, message: 'Select a customer' }]}>
            <CustomerSelect testId="account-form-customer" placeholder="Select customer" />
          </Form.Item>
        )}
        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select data-testid="account-form-currency" options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name="name" label="Account name" rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
          <Input data-testid="account-form-name" placeholder="e.g. Main" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
