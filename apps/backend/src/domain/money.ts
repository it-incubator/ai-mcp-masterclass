/** Money is handled in integer cents inside code to avoid float drift. */
export const toCents = (value: number | string): number => Math.round(Number(value) * 100);
export const fromCents = (cents: number): number => Math.round(cents) / 100;
export const formatCents = (cents: number): string => fromCents(cents).toFixed(2);
