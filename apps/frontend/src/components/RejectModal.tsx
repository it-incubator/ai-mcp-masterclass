import { Button, Form, Input, Modal } from 'antd';
import { useRejectTransaction } from '../api/hooks/transactions';
import { useFeedback } from '../lib/feedback';

export function RejectModal({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const [form] = Form.useForm<{ reason: string }>();
  const reject = useRejectTransaction();
  const { run } = useFeedback();

  async function submit({ reason }: { reason: string }) {
    if (!txId) return;
    const res = await run(reject.mutateAsync({ id: txId, reason: reason.trim() }), 'Transaction rejected');
    if (res) onClose();
  }

  return (
    <Modal
      open={!!txId}
      title="Reject transaction"
      onCancel={onClose}
      destroyOnHidden
      modalRender={(node) => <div data-testid="reject-modal">{node}</div>}
      footer={[
        <Button key="c" onClick={onClose} data-testid="reject-cancel">
          Cancel
        </Button>,
        <Button key="s" danger type="primary" loading={reject.isPending} onClick={() => form.submit()} data-testid="reject-submit">
          Reject
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, whitespace: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={3} data-testid="reject-reason" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
