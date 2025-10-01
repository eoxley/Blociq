import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { role: 'manager' },
          error: null
        }))
      })),
      in: vi.fn(() => ({
        lt: vi.fn(() => ({
          data: [
            {
              id: 'demand-1',
              total: 500.00,
              unit_id: 'unit-1',
              period_end: '2024-10-01',
              units: {
                id: 'unit-1',
                unit_number: 'A1',
                building_id: 'building-1'
              }
            }
          ],
          error: null
        }))
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          data: [
            {
              debit: 1000.00,
              credit: 0,
              gl_accounts: {
                id: 'account-1',
                code: '5000',
                name: 'Repairs & Maintenance - Lifts',
                type: 'EXPENSE'
              },
              gl_journals: {
                date: '2024-06-15',
                building_id: 'building-1'
              }
            }
          ],
          error: null
        }))
      }))
    })),
    rpc: vi.fn(() => ({
      data: 15000.00,
      error: null
    }))
  }))
};

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Finance APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Finance Summary API', () => {
    it('should return correct arrears, budget/actual, reserve, and deadlines', async () => {
      // Mock user building access
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { role: 'manager' },
              error: null
            }))
          }))
        }))
      });

      // Mock arrears data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              lt: vi.fn(() => ({
                data: [
                  {
                    id: 'demand-1',
                    total: 500.00,
                    unit_id: 'unit-1',
                    period_end: '2024-10-01',
                    units: {
                      id: 'unit-1',
                      unit_number: 'A1',
                      building_id: 'building-1'
                    }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock budget data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              {
                amount: 10000.00,
                gl_accounts: {
                  id: 'account-1',
                  code: '5000',
                  name: 'Repairs & Maintenance - Lifts',
                  type: 'EXPENSE'
                },
                budget_versions: {
                  year: 2024
                }
              }
            ],
            error: null
          }))
        }))
      });

      // Mock actual data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [
                  {
                    debit: 12000.00,
                    credit: 0,
                    gl_accounts: {
                      id: 'account-1',
                      code: '5000',
                      name: 'Repairs & Maintenance - Lifts',
                      type: 'EXPENSE'
                    },
                    gl_journals: {
                      date: '2024-06-15',
                      building_id: 'building-1'
                    }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock reserve fund data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'fund-1',
                name: 'Reserve',
                gl_accounts: {
                  id: 'reserve-account-1'
                }
              },
              error: null
            }))
          }))
        }))
      });

      // Mock reserve balance data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              { debit: 15000.00, credit: 0 }
            ],
            error: null
          }))
        }))
      });

      // Test the API endpoint
      const response = await fetch('/api/finance/summary?building_id=building-1');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.arrears.total).toBe(500.00);
      expect(data.data.arrears.overdue_units).toHaveLength(1);
      expect(data.data.arrears.overdue_units[0].unit_number).toBe('A1');
      expect(data.data.budget_vs_actual).toHaveLength(1);
      expect(data.data.budget_vs_actual[0].category).toBe('Repairs & Maintenance');
      expect(data.data.budget_vs_actual[0].budget).toBe(10000.00);
      expect(data.data.budget_vs_actual[0].actual).toBe(12000.00);
      expect(data.data.budget_vs_actual[0].variance).toBe(2000.00);
      expect(data.data.reserve_fund.balance).toBe(15000.00);
      expect(data.data.deadlines).toHaveLength(3);
    });

    it('should handle unauthorized access', async () => {
      // Mock unauthorized user
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      });

      const response = await fetch('/api/finance/summary?building_id=building-1');
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Building access denied');
    });
  });

  describe('Variance API', () => {
    it('should return variance data with narrative from budget_lines', async () => {
      // Mock user building access
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { role: 'manager' },
              error: null
            }))
          }))
        }))
      });

      // Mock budget data with narrative
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              {
                amount: 10000.00,
                narrative: 'Annual lift maintenance contract',
                gl_accounts: {
                  id: 'account-1',
                  code: '5000',
                  name: 'Repairs & Maintenance - Lifts',
                  type: 'EXPENSE'
                },
                budget_versions: {
                  year: 2024,
                  building_id: 'building-1'
                }
              }
            ],
            error: null
          }))
        }))
      });

      // Mock actual data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [
                  {
                    debit: 12000.00,
                    credit: 0,
                    gl_accounts: {
                      id: 'account-1',
                      code: '5000',
                      name: 'Repairs & Maintenance - Lifts',
                      type: 'EXPENSE'
                    },
                    gl_journals: {
                      date: '2024-06-15',
                      building_id: 'building-1',
                      memo: 'Lift maintenance invoice'
                    }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/finance/variance?building_id=building-1&category=Repairs & Maintenance');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.variances).toHaveLength(1);
      expect(data.data.variances[0].account_name).toBe('Repairs & Maintenance - Lifts');
      expect(data.data.variances[0].budget).toBe(10000.00);
      expect(data.data.variances[0].actual).toBe(12000.00);
      expect(data.data.variances[0].variance).toBe(2000.00);
      expect(data.data.variances[0].narrative).toBe('Annual lift maintenance contract');
      expect(data.data.variances[0].transactions).toHaveLength(1);
      expect(data.data.variances[0].transactions[0].memo).toBe('Lift maintenance invoice');
    });

    it('should filter by category correctly', async () => {
      // Mock user building access
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { role: 'manager' },
              error: null
            }))
          }))
        }))
      });

      // Mock budget data with multiple categories
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              {
                amount: 10000.00,
                narrative: 'Lift maintenance',
                gl_accounts: {
                  id: 'account-1',
                  code: '5000',
                  name: 'Repairs & Maintenance - Lifts',
                  type: 'EXPENSE'
                },
                budget_versions: {
                  year: 2024,
                  building_id: 'building-1'
                }
              },
              {
                amount: 5000.00,
                narrative: 'Insurance premium',
                gl_accounts: {
                  id: 'account-2',
                  code: '5100',
                  name: 'Insurance - Buildings',
                  type: 'EXPENSE'
                },
                budget_versions: {
                  year: 2024,
                  building_id: 'building-1'
                }
              }
            ],
            error: null
          }))
        }))
      });

      // Mock actual data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [
                  {
                    debit: 12000.00,
                    credit: 0,
                    gl_accounts: {
                      id: 'account-1',
                      code: '5000',
                      name: 'Repairs & Maintenance - Lifts',
                      type: 'EXPENSE'
                    },
                    gl_journals: {
                      date: '2024-06-15',
                      building_id: 'building-1',
                      memo: 'Lift maintenance'
                    }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/finance/variance?building_id=building-1&category=Repairs & Maintenance');
      const data = await response.json();

      expect(data.success).toBe(true);
      // Should only return the lift maintenance account, not insurance
      expect(data.data.variances).toHaveLength(1);
      expect(data.data.variances[0].account_name).toBe('Repairs & Maintenance - Lifts');
    });
  });
});




