import { ValueTransformer } from 'typeorm';

/** Money is handled in integer cents inside code to avoid float drift. */
export const toCents = (value: number | string): number => Math.round(Number(value) * 100);
export const fromCents = (cents: number): number => Math.round(cents) / 100;

/** numeric(14,2) string in DB <-> number (2 decimals) in code/API. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : fromCents(toCents(value))),
};
