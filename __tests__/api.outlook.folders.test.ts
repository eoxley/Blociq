import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/outlook/folders/route';

// Mock the Outlook auth helper
vi.mock('@/lib/outlook/auth', () => ({
  getOutlookAccessToken: vi.fn()
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Outlook Folders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns folders array with correct structure', async () => {
    // Mock successful token and Graph API responses
    const { getOutlookAccessToken } = await import('@/lib/outlook/auth');
    vi.mocked(getOutlookAccessToken).mockResolvedValue('mock-token');

    // Mock successful standard folder responses
    vi.mocked(fetch).mockImplementation((url: string) => {
      if (url.includes('/inbox')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'inbox-123',
            displayName: 'Inbox',
            unreadItemCount: 5,
            totalItemCount: 100
          })
        } as Response);
      }
      if (url.includes('/drafts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'drafts-123',
            displayName: 'Drafts',
            unreadItemCount: 0,
            totalItemCount: 10
          })
        } as Response);
      }
      if (url.includes('/mailFolders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            value: [
              {
                id: 'custom-123',
                displayName: 'Custom Folder',
                unreadItemCount: 2,
                totalItemCount: 25
              }
            ]
          })
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      } as Response);
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.folders)).toBe(true);
    expect(body.folders.length).toBeGreaterThan(0);
    
    // Check first folder has required properties
    const firstFolder = body.folders[0];
    expect(firstFolder).toHaveProperty('id');
    expect(firstFolder).toHaveProperty('name');
    expect(firstFolder).toHaveProperty('unread');
    expect(firstFolder).toHaveProperty('total');
    expect(firstFolder).toHaveProperty('isStandard');
  });

  it('provides fallback folders when API fails', async () => {
    // Mock token but failed Graph API calls
    const { getOutlookAccessToken } = await import('@/lib/outlook/auth');
    vi.mocked(getOutlookAccessToken).mockResolvedValue('mock-token');

    // Mock failed Graph API responses
    vi.mocked(fetch).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response);
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.folders)).toBe(true);
    expect(body.folders.length).toBeGreaterThan(0);
    
    // Should have fallback standard folders
    const folderNames = body.folders.map((f: any) => f.name);
    expect(folderNames).toContain('Inbox');
    expect(folderNames).toContain('Drafts');
    expect(folderNames).toContain('Sent');
  });

  it('handles missing token gracefully', async () => {
    // Mock missing token
    const { getOutlookAccessToken } = await import('@/lib/outlook/auth');
    vi.mocked(getOutlookAccessToken).mockResolvedValue('');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No Outlook token available');
  });

  it('handles Graph API errors gracefully', async () => {
    // Mock token but Graph API throws error
    const { getOutlookAccessToken } = await import('@/lib/outlook/auth');
    vi.mocked(getOutlookAccessToken).mockResolvedValue('mock-token');

    // Mock Graph API that throws
    vi.mocked(fetch).mockImplementation(() => {
      throw new Error('Network error');
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to list folders');
    expect(body.detail).toContain('Network error');
  });

  it('sorts folders correctly (standard first, then alphabetically)', async () => {
    // Mock successful responses with multiple folders
    const { getOutlookAccessToken } = await import('@/lib/outlook/auth');
    vi.mocked(getOutlookAccessToken).mockResolvedValue('mock-token');

    vi.mocked(fetch).mockImplementation((url: string) => {
      if (url.includes('/inbox')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'inbox-123',
            displayName: 'Inbox',
            unreadItemCount: 5,
            totalItemCount: 100
          })
        } as Response);
      }
      if (url.includes('/drafts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'drafts-123',
            displayName: 'Drafts',
            unreadItemCount: 0,
            totalItemCount: 10
          })
        } as Response);
      }
      if (url.includes('/mailFolders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            value: [
              {
                id: 'custom-a',
                displayName: 'Alpha Folder',
                unreadItemCount: 2,
                totalItemCount: 25
              },
              {
                id: 'custom-z',
                displayName: 'Zebra Folder',
                unreadItemCount: 1,
                totalItemCount: 15
              }
            ]
          })
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      } as Response);
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const folders = body.folders;
    
    // Standard folders should come first
    expect(folders[0].name).toBe('Inbox');
    expect(folders[1].name).toBe('Drafts');
    
    // Custom folders should be sorted alphabetically
    const customFolders = folders.filter((f: any) => !f.isStandard);
    expect(customFolders[0].name).toBe('Alpha Folder');
    expect(customFolders[1].name).toBe('Zebra Folder');
  });
});
