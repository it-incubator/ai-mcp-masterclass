/**
 * Domain errors carry the business message and nothing HTTP-specific.
 * HTTP maps them in one place (presentation/http/domain-exception.filter.ts),
 * MCP maps them to `isError: true` tool results (presentation/mcp/tool-result.ts).
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The referenced entity does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string | null) {
    super(`${entity} with id ${id} not found`);
  }
}

/** Uniqueness violation or an operation blocked by existing data. */
export class ConflictError extends DomainError {}

/** A business rule or an invalid state transition. */
export class BusinessRuleError extends DomainError {}

/** Input that is structurally invalid for the domain. */
export class ValidationError extends DomainError {}
