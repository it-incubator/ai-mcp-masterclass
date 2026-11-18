// MCP presentation helpers (no business logic): shape use-case results/errors as MCP tool results.
import { DomainError } from '../../domain/errors';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

const text = (value: unknown): ToolResult['content'] => [{ type: 'text', text: JSON.stringify(value, null, 2) }];

/**
 * Runs a use case (a bus call) and returns JSON text content.
 * Domain errors (not found / conflict / business rule) become `isError: true` results carrying the SAME message
 * the REST API returns, so the LLM can read the reason and react. Anything else is rethrown (-> generic internal error).
 */
export async function runUseCase(useCase: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const result = await useCase();
    return { content: text(result === undefined ? { ok: true } : result) };
  } catch (e) {
    if (e instanceof DomainError) return { isError: true, content: [{ type: 'text', text: e.message }] };
    throw e;
  }
}
