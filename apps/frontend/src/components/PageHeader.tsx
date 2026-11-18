import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

export function PageHeader({ title, testId, extra }: { title: string; testId: string; extra?: ReactNode }) {
  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }} data-testid={testId}>
        {title}
      </Typography.Title>
      <div>{extra}</div>
    </Flex>
  );
}
