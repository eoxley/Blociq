import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountingPosting } from '@/lib/accounting/posting';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-account-id' },
          error: null
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-journal-id' },
          error: null
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null
      }))
    }))
  }))
};

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Invoice Posting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should post invoice £1000 gross → DR Expense £833.33, DR VAT £166.67, CR AP £1000', async () => {
    // Mock invoice data
    const mockInvoice = {
      id: 'test-invoice-id',
      contractor_id: 'test-contractor-id',
      building_id: 'test-building-id',
      schedule_id: 'test-schedule-id',
      date: '2025-01-15',
      gross_total: 1000.00,
      vat_total: 166.67,
      net_total: 833.33,
      status: 'approved',
      created_by: 'test-user-id',
      ap_invoice_lines: [
        {
          account_id: 'expense-account-id',
          net: 833.33,
          vat: 166.67,
          gross: 1000.00,
          description: 'Test expense'
        }
      ]
    };

    // Mock the invoice fetch
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockInvoice,
            error: null
          }))
        }))
      }))
    });

    // Mock account lookups
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'ap-account-id' },
            error: null
          }))
        }))
      }))
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'vat-account-id' },
            error: null
          }))
        }))
      }))
    });

    // Mock journal posting
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-journal-id' },
            error: null
          }))
        }))
      }))
    });

    // Mock journal lines insert
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        data: null,
        error: null
      }))
    });

    // Mock invoice status update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    });

    // Mock audit log
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        data: null,
        error: null
      }))
    });

    const result = await accountingPosting.postSupplierInvoice({
      invoice_id: 'test-invoice-id',
      lines: []
    });

    expect(result.success).toBe(true);

    // Verify journal was created with correct lines
    const journalInsertCall = mockSupabase.from().insert.mock.calls[0];
    expect(journalInsertCall[0]).toEqual({
      date: '2025-01-15',
      memo: 'Supplier Invoice - test-invoice-id',
      building_id: 'test-building-id',
      schedule_id: 'test-schedule-id',
      created_by: 'test-user-id'
    });

    // Verify journal lines were created
    const linesInsertCall = mockSupabase.from().insert.mock.calls[1];
    const journalLines = linesInsertCall[0];
    
    // Should have 3 lines: expense, VAT, and AP control
    expect(journalLines).toHaveLength(3);
    
    // Expense line: DR £833.33
    const expenseLine = journalLines.find((line: any) => line.account_id === 'expense-account-id');
    expect(expenseLine).toEqual({
      journal_id: 'test-journal-id',
      account_id: 'expense-account-id',
      debit: 833.33,
      credit: 0,
      contractor_id: 'test-contractor-id'
    });

    // VAT line: DR £166.67
    const vatLine = journalLines.find((line: any) => line.account_id === 'vat-account-id');
    expect(vatLine).toEqual({
      journal_id: 'test-journal-id',
      account_id: 'vat-account-id',
      debit: 166.67,
      credit: 0,
      contractor_id: 'test-contractor-id'
    });

    // AP Control line: CR £1000.00
    const apLine = journalLines.find((line: any) => line.account_id === 'ap-account-id');
    expect(apLine).toEqual({
      journal_id: 'test-journal-id',
      account_id: 'ap-account-id',
      debit: 0,
      credit: 1000.00,
      contractor_id: 'test-contractor-id'
    });

    // Verify invoice status was updated to posted
    const updateCall = mockSupabase.from().update.mock.calls[0];
    expect(updateCall[0]).toEqual({ status: 'posted' });
  });

  it('should handle invoice without VAT correctly', async () => {
    const mockInvoice = {
      id: 'test-invoice-id',
      contractor_id: 'test-contractor-id',
      building_id: 'test-building-id',
      schedule_id: 'test-schedule-id',
      date: '2025-01-15',
      gross_total: 500.00,
      vat_total: 0,
      net_total: 500.00,
      status: 'approved',
      created_by: 'test-user-id',
      ap_invoice_lines: [
        {
          account_id: 'expense-account-id',
          net: 500.00,
          vat: 0,
          gross: 500.00,
          description: 'Test expense'
        }
      ]
    };

    // Mock responses
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockInvoice,
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-journal-id' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    });

    const result = await accountingPosting.postSupplierInvoice({
      invoice_id: 'test-invoice-id',
      lines: []
    });

    expect(result.success).toBe(true);

    // Verify only 2 lines were created (expense + AP control, no VAT)
    const linesInsertCall = mockSupabase.from().insert.mock.calls[1];
    const journalLines = linesInsertCall[0];
    expect(journalLines).toHaveLength(2);
  });
});

