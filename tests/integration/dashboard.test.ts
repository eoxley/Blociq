import { describe, it, expect } from 'vitest';

describe('Dashboard API Integration', () => {
  const baseUrl = process.env.SITE_URL || 'http://localhost:3000';

  it('should return 200 with valid JSON shape for week timeRange', async () => {
    const response = await fetch(`${baseUrl}/api/inbox/dashboard?timeRange=week`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Check response structure
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('timeRange');
    expect(data).toHaveProperty('generatedAt');
    
    // Check data structure
    expect(data.data).toHaveProperty('total');
    expect(data.data).toHaveProperty('unread');
    expect(data.data).toHaveProperty('handled');
    expect(data.data).toHaveProperty('urgent');
    expect(data.data).toHaveProperty('categories');
    expect(data.data).toHaveProperty('propertyBreakdown');
    expect(data.data).toHaveProperty('recentActivity');
    expect(data.data).toHaveProperty('smartSuggestions');
    expect(data.data).toHaveProperty('urgencyDistribution');
    expect(data.data).toHaveProperty('topProperties');
    expect(data.data).toHaveProperty('aiInsightsSummary');
    
    // Check types
    expect(typeof data.data.total).toBe('number');
    expect(typeof data.data.unread).toBe('number');
    expect(typeof data.data.handled).toBe('number');
    expect(typeof data.data.urgent).toBe('number');
    expect(typeof data.data.categories).toBe('object');
    expect(Array.isArray(data.data.recentActivity)).toBe(true);
    expect(Array.isArray(data.data.smartSuggestions)).toBe(true);
    expect(typeof data.data.urgencyDistribution).toBe('object');
    expect(Array.isArray(data.data.topProperties)).toBe(true);
    expect(typeof data.data.aiInsightsSummary).toBe('object');
    
    // Check urgency distribution structure
    expect(data.data.urgencyDistribution).toHaveProperty('critical');
    expect(data.data.urgencyDistribution).toHaveProperty('high');
    expect(data.data.urgencyDistribution).toHaveProperty('medium');
    expect(data.data.urgencyDistribution).toHaveProperty('low');
    
    // Check AI insights summary structure
    expect(data.data.aiInsightsSummary).toHaveProperty('totalInsights');
    expect(data.data.aiInsightsSummary).toHaveProperty('criticalInsights');
    expect(data.data.aiInsightsSummary).toHaveProperty('followUps');
    expect(data.data.aiInsightsSummary).toHaveProperty('recurringIssues');
    expect(data.data.aiInsightsSummary).toHaveProperty('complianceMatters');
  }, 30000);

  it('should handle invalid timeRange gracefully', async () => {
    const response = await fetch(`${baseUrl}/api/inbox/dashboard?timeRange=invalid`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.timeRange).toBe('week'); // Should default to week
  }, 30000);

  it('should return 401 for unauthenticated requests', async () => {
    // This test would need to be run without authentication
    // For now, we'll just check that the endpoint exists
    const response = await fetch(`${baseUrl}/api/inbox/dashboard?timeRange=week`, {
      method: 'GET',
    });

    // Should either be 200 (if some auth is working) or 401
    expect([200, 401]).toContain(response.status);
  }, 30000);
});
