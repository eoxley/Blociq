export type AnyObj = Record<string, any>;

export function normaliseComplianceAsset<T extends AnyObj>(input: T): T {
  return input;
}

export function normaliseMany<T extends AnyObj>(items: T[] = []): T[] {
  return items;
}

export function canonicaliseCategory(category: string): string {
  return category || 'Unknown';
}

export function canonicaliseTitle(title: string): string {
  return title || 'Untitled';
}

export function deriveFrequencyLabel(frequencyMonths: number): string {
  if (!frequencyMonths) return 'Unknown';
  if (frequencyMonths === 1) return 'Monthly';
  if (frequencyMonths === 3) return 'Quarterly';
  if (frequencyMonths === 6) return 'Semi-annually';
  if (frequencyMonths === 12) return 'Annually';
  if (frequencyMonths === 24) return 'Bi-annually';
  if (frequencyMonths === 60) return '5-yearly';
  return `${frequencyMonths} months`;
}