import { App } from 'antd';
import type { ButtonProps } from 'antd';
import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Unexpected error';
}

/**
 * Toast helpers. Errors always show the server message (ApiError.message).
 * `run` awaits a promise, toasts success text or the server error, and returns
 * the result (or undefined when it failed).
 */
export function useFeedback() {
  const { message, modal } = App.useApp();

  const success = (text: string) =>
    message.success({ content: <span data-testid="toast-success">{text}</span>, duration: 4 });
  const error = (e: unknown) =>
    message.error({ content: <span data-testid="toast-error">{errorMessage(e)}</span>, duration: 6 });

  async function run<T>(promise: Promise<T>, successText: string | ((r: T) => string)): Promise<T | undefined> {
    try {
      const r = await promise;
      success(typeof successText === 'function' ? successText(r) : successText);
      return r;
    } catch (e) {
      error(e);
      return undefined;
    }
  }

  function confirm(opts: {
    title: string;
    content?: ReactNode;
    okText: string;
    danger?: boolean;
    onOk: () => Promise<unknown>;
  }) {
    modal.confirm({
      title: opts.title,
      content: opts.content,
      okText: opts.okText,
      okButtonProps: { danger: opts.danger, 'data-testid': 'confirm-ok' } as ButtonProps,
      cancelButtonProps: { 'data-testid': 'confirm-cancel' } as ButtonProps,
      wrapClassName: 'confirm-modal',
      onOk: async () => {
        await opts.onOk();
      },
    });
  }

  return { success, error, run, confirm };
}
