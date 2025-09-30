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
    })),
    rpc: vi.fn(() => ({
      data: 1000.00,
      error: null
    }))
  }))
};

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Bank Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should post bank receipt reconciliation correctly', async () => {
    // Mock receipt data
    const mockReceipt = {
      id: 'test-receipt-id',
      amount: 500.00,
      date: '2025-01-15',
      description: 'Service charge payment',
      created_by: 'test-user-id',
      bank_accounts: {
        building_id: 'test-building-id'
      }
    };

    // Mock bank transaction data
    const mockBankTxn = {
      id: 'test-bank-txn-id',
      amount: 500.00,
      date: '2025-01-15',
      description: 'Service charge payment'
    };

    // Mock account lookups
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockReceipt,
            error: null
          }))
        }))
      }))
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockBankTxn,
            error: null
          }))
        }))
      }))
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'bank-account-id' },
            error: null
          }))
        }))
      }))
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'ar-account-id' },
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

    const result = await accountingPosting.postBankReceipt('test-receipt-id', 'test-bank-txn-id');

    expect(result.success).toBe(true);
    expect(result.journal_id).toBe('test-journal-id');

    // Verify journal was created with correct lines
    const journalInsertCall = mockSupabase.from().insert.mock.calls[0];
    expect(journalInsertCall[0]).toEqual({
      date: '2025-01-15',
      memo: 'Bank Receipt Reconciliation - Service charge payment',
      building_id: 'test-building-id',
      created_by: 'test-user-id'
    });

    // Verify journal lines
    const linesInsertCall = mockSupabase.from().insert.mock.calls[1];
    const journalLines = linesInsertCall[0];
    
    expect(journalLines).toHaveLength(2);
    
    // Bank debit
    const bankLine = journalLines.find((line: any) => line.account_id === 'bank-account-id');
    expect(bankLine).toEqual({
      journal_id: 'test-journal-id',
      account_id: 'bank-account-id',
      debit: 500.00,
      credit: 0
    });

    // AR credit
    const arLine = journalLines.find((line: any) => line.account_id === 'ar-account-id');
    expect(arLine).toEqual({
      journal_id: 'test-journal-id',
      account_id: 'ar-account-id',
      debit: 0,
      credit: 500.00
    });
  });

  it('should post bank payment reconciliation correctly', async () => {
    // Mock payment data
    const mockPayment = {
      id: 'test-payment-id',
      amount: 250.00,
      date: '2025-01-15',
      description: 'Supplier payment',
      created_by: 'test-user-id',
      bank_accounts: {
        building_id: 'test-building-id'
      }
    };

    // Mock bank transaction data (negative amount for payment)
    const mockBankTxn = {
      id: 'test-bank-txn-id',
      amount: -250.00,
      date: '2025-01-15',
      description: 'Supplier payment'
    };

    // Mock responses
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockPayment,
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
      }))
    });

    // Mock bank transaction separately
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockBankTxn,
            error: null
          }))
        }))
      }))
    });

    const result = await accountingPosting.postBankPayment('test-payment-id', 'test-bank-txn-id');

    expect(result.success).toBe(true);
    expect(result.journal_id).toBe('test-journal-id');

    // Verify journal lines handle negative amounts correctly
    const linesInsertCall = mockSupabase.from().insert.mock.calls[1];
    const journalLines = linesInsertCall[0];
    
    // AP debit (positive amount)
    const apLine = journalLines.find((line: any) => line.account_id === 'ap-account-id');
    expect(apLine.debit).toBe(250.00); // Should be positive

    // Bank credit (positive amount)
    const bankLine = journalLines.find((line: any) => line.account_id === 'bank-account-id');
    expect(bankLine.credit).toBe(250.00); // Should be positive
  });

  it('should validate bank account balance', async () => {
    const mockBalance = 1500.75;

    mockSupabase.from.mockReturnValueOnce({
      rpc: vi.fn(() => ({
        data: mockBalance,
        error: null
      }))
    });

    const result = await accountingPosting.validateBankBalance('test-bank-account-id', '2025-01-15');

    expect(result.success).toBe(true);
    expect(result.balance).toBe(mockBalance);

    // Verify RPC was called with correct parameters
    const rpcCall = mockSupabase.from().rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('get_bank_account_balance');
    expect(rpcCall[1]).toEqual({
      account_uuid: 'test-bank-account-id',
      as_of_date: '2025-01-15'
    });
  });

  it('should handle reconciliation errors gracefully', async () => {
    // Mock receipt not found
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: 'Receipt not found' }
          }))
        }))
      }))
    });

    const result = await accountingPosting.postBankReceipt('invalid-receipt-id', 'test-bank-txn-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Receipt or bank transaction not found');
  });

  it('should handle account lookup failures', async () => {
    // Mock successful receipt and bank transaction
    const mockReceipt = {
      id: 'test-receipt-id',
      amount: 500.00,
      date: '2025-01-15',
      description: 'Service charge payment',
      created_by: 'test-user-id',
      bank_accounts: {
        building_id: 'test-building-id'
      }
    };

    const mockBankTxn = {
      id: 'test-bank-txn-id',
      amount: 500.00,
      date: '2025-01-15',
      description: 'Service charge payment'
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockReceipt,
            error: null
          }))
        }))
      }))
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockBankTxn,
            error: null
          }))
        }))
      }))
    });

    // Mock bank account not found
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    });

    const result = await accountingPosting.postBankReceipt('test-receipt-id', 'test-bank-txn-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Bank account not found');
  });
});


