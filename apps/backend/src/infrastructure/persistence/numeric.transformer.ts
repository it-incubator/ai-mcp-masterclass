import { ValueTransformer } from 'typeorm';
import { fromCents, toCents } from '../../domain/money';

/** numeric(14,2) string in DB <-> number (2 decimals) in code/API. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : fromCents(toCents(value))),
};
