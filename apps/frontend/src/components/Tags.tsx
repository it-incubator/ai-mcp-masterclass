import { Tag } from 'antd';
import type { AccountStatus, KycStatus, RiskLevel, TransactionStatus, TransactionType } from '../api/types';

const KYC: Record<KycStatus, string> = { PENDING: 'gold', VERIFIED: 'green', REJECTED: 'red' };
const RISK: Record<RiskLevel, string> = { LOW: 'green', MEDIUM: 'orange', HIGH: 'red' };
const ACC: Record<AccountStatus, string> = { ACTIVE: 'green', FROZEN: 'blue', CLOSED: 'default' };
const TX: Record<TransactionStatus, string> = {
  PENDING: 'gold',
  COMPLETED: 'green',
  REJECTED: 'red',
  REVERSED: 'purple',
};
const TYPE: Record<TransactionType, string> = { DEPOSIT: 'cyan', WITHDRAWAL: 'magenta', TRANSFER: 'geekblue' };

interface P<T> {
  value: T;
  testId?: string;
}

export const KycTag = ({ value, testId }: P<KycStatus>) => (
  <Tag color={KYC[value]} data-testid={testId}>{value}</Tag>
);
export const RiskTag = ({ value, testId }: P<RiskLevel>) => (
  <Tag color={RISK[value]} data-testid={testId}>{value}</Tag>
);
export const AccountStatusTag = ({ value, testId }: P<AccountStatus>) => (
  <Tag color={ACC[value]} data-testid={testId}>{value}</Tag>
);
export const TxStatusTag = ({ value, testId }: P<TransactionStatus>) => (
  <Tag color={TX[value]} data-testid={testId}>{value}</Tag>
);
export const TxTypeTag = ({ value, testId }: P<TransactionType>) => (
  <Tag color={TYPE[value]} data-testid={testId}>{value}</Tag>
);
