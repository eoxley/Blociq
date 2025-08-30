export type AnyObj = Record<string, any>;
export function normaliseComplianceAsset<T extends AnyObj>(input: T): T { return input; }
export function normaliseMany<T extends AnyObj>(items: T[] = []): T[] { return items; }