import { Button, Form, Input, Modal, Select } from 'antd';
import { useCreateCustomer, useUpdateCustomer } from '../api/hooks/customers';
import { RISK_LEVELS } from '../api/types';
import type { Customer, CustomerInput } from '../api/types';
import { useFeedback } from '../lib/feedback';

interface Props {
  open: boolean;
  customer?: Customer; // when set -> edit mode
  onClose: () => void;
}

export function CustomerFormModal({ open, customer, onClose }: Props) {
  const [form] = Form.useForm<CustomerInput>();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const { run } = useFeedback();
  const editing = !!customer;
  const pending = create.isPending || update.isPending;

  // destroyOnHidden remounts the form on every open, so initialValues are applied fresh each time
  const initialValues: Partial<CustomerInput> = customer
    ? {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone ?? '',
        country: customer.country,
        riskLevel: customer.riskLevel,
      }
    : { riskLevel: 'LOW' };

  async function submit(values: CustomerInput) {
    const body: CustomerInput = {
      ...values,
      country: values.country.trim().toUpperCase(),
      phone: values.phone?.trim() || undefined,
    };
    const res = customer
      ? await run(update.mutateAsync({ id: customer.id, body }), `Customer ${body.email} updated`)
      : await run(create.mutateAsync(body), `Customer ${body.email} created`);
    if (res) onClose();
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit customer' : 'New customer'}
      onCancel={onClose}
      destroyOnHidden
      modalRender={(node) => <div data-testid={editing ? 'edit-customer-modal' : 'new-customer-modal'}>{node}</div>}
      footer={[
        <Button key="c" onClick={onClose} data-testid="customer-form-cancel">
          Cancel
        </Button>,
        <Button key="s" type="primary" loading={pending} onClick={() => form.submit()} data-testid="customer-form-submit">
          {editing ? 'Save' : 'Create'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit} preserve={false} data-testid="customer-form">
        <Form.Item name="firstName" label="First name" rules={[{ required: true, message: 'First name is required' }]}>
          <Input data-testid="customer-form-first-name" />
        </Form.Item>
        <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: 'Last name is required' }]}>
          <Input data-testid="customer-form-last-name" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}
        >
          <Input data-testid="customer-form-email" />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input data-testid="customer-form-phone" />
        </Form.Item>
        <Form.Item
          name="country"
          label="Country (ISO-2)"
          rules={[{ required: true, message: 'Country is required' }, { len: 2, message: 'Use a 2-letter ISO code' }]}
        >
          <Input maxLength={2} style={{ textTransform: 'uppercase' }} data-testid="customer-form-country" />
        </Form.Item>
        <Form.Item name="riskLevel" label="Risk level">
          <Select
            data-testid="customer-form-risk-level"
            options={RISK_LEVELS.map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
