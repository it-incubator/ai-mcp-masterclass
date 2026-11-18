import { Alert, Button } from 'antd';
import { errorMessage } from '../lib/feedback';

export function QueryError({ error, onRetry, testId = 'error-state' }: { error: unknown; onRetry?: () => void; testId?: string }) {
  return (
    <Alert
      type="error"
      showIcon
      data-testid={testId}
      title="Failed to load data"
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Button size="small" onClick={onRetry} data-testid={`${testId}-retry`}>
            Retry
          </Button>
        ) : undefined
      }
      style={{ marginBottom: 16 }}
    />
  );
}
