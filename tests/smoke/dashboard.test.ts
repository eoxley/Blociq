import { describe, it, expect } from 'vitest';

describe('Inbox Dashboard API', () => {
  const site = process.env.SITE_URL;
  if (!site) {
    it.skip('skipped: SITE_URL missing', () => {});
    return;
  }

  it('returns a complete JSON shape (no 500, no empty body)', async () => {
    const url = `${site}/api/inbox/dashboard?timeRange=week`;
    const res = await fetch(url, { method: 'GET' });
    expect(res.status).toBe(200);

    const body = await res.json();
    // Required keys
    const required = [
      'total','unread','handled','urgent',
      'categories','propertyBreakdown','recentActivity','smartSuggestions',
      'urgencyDistribution','topProperties','aiInsightsSummary',
      'needsConnect','outlookConnectionRequired'
    ];
    for (const k of required) {
      expect(Object.prototype.hasOwnProperty.call(body, k)).toBe(true);
    }

    // Types / shapes
    expect(typeof body.total).toBe('number');
    expect(typeof body.unread).toBe('number');
    expect(typeof body.handled).toBe('number');
    expect(typeof body.urgent).toBe('number');
    expect(typeof body.categories).toBe('object');
    expect(Array.isArray(body.recentActivity)).toBe(true);
    expect(typeof body.needsConnect).toBe('boolean');
    expect(typeof body.outlookConnectionRequired).toBe('boolean');
  }, 20000);
});
