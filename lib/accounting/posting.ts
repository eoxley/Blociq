import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Types for posting operations
export interface JournalLine {
  account_id: string;
  debit: number;
  credit: number;
  unit_id?: string;
  contractor_id?: string;
  works_order_id?: string;
  fund_id?: string;
}

export interface PostJournalParams {
  date: string;
  memo: string;
  building_id: string;
  schedule_id?: string;
  lines: JournalLine[];
  created_by: string;
}

export interface PostDemandParams {
  header_id: string;
}

export interface PostReceiptParams {
  receipt_id: string;
  allocations: Array<{
    demand_header_id: string;
    amount: number;
  }>;
}

export interface PostSupplierInvoiceParams {
  invoice_id: string;
  lines: Array<{
    account_id: string;
    amount: number;
    narrative?: string;
  }>;
}

export interface PostSupplierPaymentParams {
  payment_id: string;
  allocations: Array<{
    invoice_id: string;
    amount: number;
  }>;
}

export interface PostFundTransferParams {
  from_fund: string;
  to_fund: string;
  amount: number;
  building_id: string;
  memo: string;
  created_by: string;
}

// Validation schemas
const JournalLineSchema = z.object({
  account_id: z.string().uuid(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  unit_id: z.string().uuid().optional(),
  contractor_id: z.string().uuid().optional(),
  fund_id: z.string().uuid().optional(),
});

const PostJournalSchema = z.object({
  date: z.string(),
  memo: z.string(),
  building_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  lines: z.array(JournalLineSchema).min(2),
  created_by: z.string().uuid(),
});

export class AccountingPostingService {
  private supabase = createClient();

  /**
   * Post a journal entry with double-entry validation
   */
  async postJournal(params: PostJournalParams): Promise<{ success: boolean; journal_id?: string; error?: string }> {
    try {
      // Validate input
      const validatedParams = PostJournalSchema.parse(params);
      
      // Validate double-entry (sum of debits must equal sum of credits)
      const totalDebits = validatedParams.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = validatedParams.lines.reduce((sum, line) => sum + line.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Journal is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
        };
      }

      // Validate that each line has either debit or credit, not both
      for (const line of validatedParams.lines) {
        if (line.debit > 0 && line.credit > 0) {
          return {
            success: false,
            error: 'Each journal line must have either debit or credit, not both'
          };
        }
        if (line.debit === 0 && line.credit === 0) {
          return {
            success: false,
            error: 'Each journal line must have either debit or credit amount'
          };
        }
      }

      // Create journal
      const { data: journal, error: journalError } = await this.supabase
        .from('gl_journals')
        .insert({
          date: validatedParams.date,
          memo: validatedParams.memo,
          building_id: validatedParams.building_id,
          schedule_id: validatedParams.schedule_id,
          created_by: validatedParams.created_by,
        })
        .select()
        .single();

      if (journalError) {
        return { success: false, error: journalError.message };
      }

      // Create journal lines
      const lines = validatedParams.lines.map(line => ({
        journal_id: journal.id,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        unit_id: line.unit_id,
        contractor_id: line.contractor_id,
        works_order_id: line.works_order_id,
        fund_id: line.fund_id,
      }));

      const { error: linesError } = await this.supabase
        .from('gl_lines')
        .insert(lines);

      if (linesError) {
        // Rollback journal if lines fail
        await this.supabase
          .from('gl_journals')
          .delete()
          .eq('id', journal.id);
        
        return { success: false, error: linesError.message };
      }

      // Log audit trail
      await this.logAudit('gl_journals', 'create', journal.id, {
        memo: validatedParams.memo,
        total_debits: totalDebits,
        total_credits: totalCredits,
      });

      return { success: true, journal_id: journal.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post a service charge demand
   */
  async postDemand(params: PostDemandParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Get demand header and lines
      const { data: header, error: headerError } = await this.supabase
        .from('ar_demand_headers')
        .select(`
          *,
          ar_demand_lines (*)
        `)
        .eq('id', params.header_id)
        .single();

      if (headerError || !header) {
        return { success: false, error: 'Demand header not found' };
      }

      if (header.status !== 'draft') {
        return { success: false, error: 'Demand is not in draft status' };
      }

      // Get A/R Control account
      const { data: arAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1100')
        .single();

      if (!arAccount) {
        return { success: false, error: 'A/R Control account not found' };
      }

      // Get Service Charge Income account
      const { data: incomeAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '4000')
        .single();

      if (!incomeAccount) {
        return { success: false, error: 'Service Charge Income account not found' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: new Date().toISOString().split('T')[0],
        memo: `Service Charge Demand - ${header.period_start} to ${header.period_end}`,
        building_id: header.building_id,
        schedule_id: header.schedule_id,
        created_by: header.created_by || '',
        lines: [
          {
            account_id: arAccount.id,
            debit: header.total,
            credit: 0,
            unit_id: header.unit_id,
          },
          {
            account_id: incomeAccount.id,
            debit: 0,
            credit: header.total,
            unit_id: header.unit_id,
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      // Update demand status
      const { error: updateError } = await this.supabase
        .from('ar_demand_headers')
        .update({ status: 'sent' })
        .eq('id', params.header_id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post a receipt and allocate to demands
   */
  async postReceipt(params: PostReceiptParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Get receipt details
      const { data: receipt, error: receiptError } = await this.supabase
        .from('ar_receipts')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', params.receipt_id)
        .single();

      if (receiptError || !receipt) {
        return { success: false, error: 'Receipt not found' };
      }

      // Get Bank account
      const { data: bankAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1000')
        .single();

      if (!bankAccount) {
        return { success: false, error: 'Bank account not found' };
      }

      // Get A/R Control account
      const { data: arAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1100')
        .single();

      if (!arAccount) {
        return { success: false, error: 'A/R Control account not found' };
      }

      // Validate allocation amounts
      const totalAllocated = params.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      if (Math.abs(totalAllocated - receipt.amount) > 0.01) {
        return { success: false, error: 'Allocation total must equal receipt amount' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: receipt.date,
        memo: `Receipt - ${receipt.payer_ref || receipt.raw_ref}`,
        building_id: receipt.bank_accounts.building_id,
        created_by: receipt.created_by || '',
        lines: [
          {
            account_id: bankAccount.id,
            debit: receipt.amount,
            credit: 0,
          },
          {
            account_id: arAccount.id,
            debit: 0,
            credit: receipt.amount,
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      // Create allocations
      const allocations = params.allocations.map(alloc => ({
        receipt_id: params.receipt_id,
        demand_header_id: alloc.demand_header_id,
        amount: alloc.amount,
      }));

      const { error: allocError } = await this.supabase
        .from('ar_allocations')
        .insert(allocations);

      if (allocError) {
        return { success: false, error: allocError.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post a supplier invoice
   */
  async postSupplierInvoice(params: PostSupplierInvoiceParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invoice details with lines
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('ap_invoices')
        .select(`
          *,
          ap_invoice_lines (*)
        `)
        .eq('id', params.invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (!['draft', 'approved'].includes(invoice.status)) {
        return { success: false, error: 'Invoice is not in draft or approved status' };
      }

      // Get A/P Control account
      const { data: apAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '2000')
        .single();

      if (!apAccount) {
        return { success: false, error: 'A/P Control account not found' };
      }

      // Get VAT account if there's VAT
      let vatAccount = null;
      if (invoice.vat_total && invoice.vat_total > 0) {
        const { data: vatAcc } = await this.supabase
          .from('gl_accounts')
          .select('id')
          .eq('code', '2300') // VAT Payable
          .single();
        vatAccount = vatAcc;
      }

      // Create journal lines
      const journalLines: JournalLine[] = [];

      // Add expense lines
      for (const line of invoice.ap_invoice_lines) {
        journalLines.push({
          account_id: line.account_id,
          debit: line.net, // Debit net amount to expense
          credit: 0,
          contractor_id: invoice.contractor_id,
          works_order_id: invoice.works_order_id,
        });

        // Add VAT line if applicable
        if (line.vat > 0 && vatAccount) {
          journalLines.push({
            account_id: vatAccount.id,
            debit: line.vat, // Debit VAT amount
            credit: 0,
            contractor_id: invoice.contractor_id,
            works_order_id: invoice.works_order_id,
          });
        }
      }

      // Add A/P Control credit
      journalLines.push({
        account_id: apAccount.id,
        debit: 0,
        credit: invoice.gross_total, // Credit gross total
        contractor_id: invoice.contractor_id,
        works_order_id: invoice.works_order_id,
      });

      // Create journal entry
      const journalResult = await this.postJournal({
        date: invoice.date,
        memo: `Supplier Invoice - ${invoice.invoice_number}`,
        building_id: invoice.building_id,
        schedule_id: invoice.schedule_id,
        created_by: invoice.created_by || '',
        lines: journalLines,
      });

      if (!journalResult.success) {
        return journalResult;
      }

      // Update invoice status
      const { error: updateError } = await this.supabase
        .from('ap_invoices')
        .update({ status: 'posted' })
        .eq('id', params.invoice_id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post a supplier payment
   */
  async postSupplierPayment(params: PostSupplierPaymentParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Get payment details
      const { data: payment, error: paymentError } = await this.supabase
        .from('ap_payments')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', params.payment_id)
        .single();

      if (paymentError || !payment) {
        return { success: false, error: 'Payment not found' };
      }

      // Get Bank account
      const { data: bankAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1000')
        .single();

      if (!bankAccount) {
        return { success: false, error: 'Bank account not found' };
      }

      // Get A/P Control account
      const { data: apAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '2000')
        .single();

      if (!apAccount) {
        return { success: false, error: 'A/P Control account not found' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: payment.date,
        memo: `Supplier Payment - ${payment.payee_ref}`,
        building_id: payment.bank_accounts.building_id,
        created_by: payment.created_by || '',
        lines: [
          {
            account_id: apAccount.id,
            debit: payment.amount,
            credit: 0,
          },
          {
            account_id: bankAccount.id,
            debit: 0,
            credit: payment.amount,
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post a fund transfer
   */
  async postFundTransfer(params: PostFundTransferParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Get fund details
      const { data: fromFund, error: fromError } = await this.supabase
        .from('funds')
        .select('*')
        .eq('id', params.from_fund)
        .single();

      const { data: toFund, error: toError } = await this.supabase
        .from('funds')
        .select('*')
        .eq('id', params.to_fund)
        .single();

      if (fromError || !fromFund || toError || !toFund) {
        return { success: false, error: 'Fund not found' };
      }

      if (fromFund.building_id !== toFund.building_id) {
        return { success: false, error: 'Funds must be in the same building' };
      }

      // Get fund accounts
      const { data: fromFundAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('name', fromFund.name)
        .single();

      const { data: toFundAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('name', toFund.name)
        .single();

      if (!fromFundAccount || !toFundAccount) {
        return { success: false, error: 'Fund accounts not found' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: new Date().toISOString().split('T')[0],
        memo: `Fund Transfer: ${fromFund.name} to ${toFund.name} - ${params.memo}`,
        building_id: params.building_id,
        created_by: params.created_by,
        lines: [
          {
            account_id: toFundAccount.id,
            debit: params.amount,
            credit: 0,
            fund_id: params.to_fund,
          },
          {
            account_id: fromFundAccount.id,
            debit: 0,
            credit: params.amount,
            fund_id: params.from_fund,
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post bank receipt reconciliation
   */
  async postBankReceipt(receiptId: string, bankTxnId: string): Promise<{ success: boolean; journal_id?: string; error?: string }> {
    try {
      // Get receipt and bank transaction details
      const { data: receipt, error: receiptError } = await this.supabase
        .from('ar_receipts')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', receiptId)
        .single();

      const { data: bankTxn, error: bankError } = await this.supabase
        .from('bank_txns')
        .select('*')
        .eq('id', bankTxnId)
        .single();

      if (receiptError || !receipt || bankError || !bankTxn) {
        return { success: false, error: 'Receipt or bank transaction not found' };
      }

      // Get Bank account
      const { data: bankAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1000')
        .single();

      if (!bankAccount) {
        return { success: false, error: 'Bank account not found' };
      }

      // Get A/R Control account
      const { data: arAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1100')
        .single();

      if (!arAccount) {
        return { success: false, error: 'A/R Control account not found' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: bankTxn.date,
        memo: `Bank Receipt Reconciliation - ${bankTxn.description}`,
        building_id: receipt.bank_accounts.building_id,
        created_by: receipt.created_by || '',
        lines: [
          {
            account_id: bankAccount.id,
            debit: bankTxn.amount,
            credit: 0,
          },
          {
            account_id: arAccount.id,
            debit: 0,
            credit: bankTxn.amount,
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      return { success: true, journal_id: journalResult.journal_id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post bank payment reconciliation
   */
  async postBankPayment(paymentId: string, bankTxnId: string): Promise<{ success: boolean; journal_id?: string; error?: string }> {
    try {
      // Get payment and bank transaction details
      const { data: payment, error: paymentError } = await this.supabase
        .from('ap_payments')
        .select(`
          *,
          bank_accounts!inner (
            building_id
          )
        `)
        .eq('id', paymentId)
        .single();

      const { data: bankTxn, error: bankError } = await this.supabase
        .from('bank_txns')
        .select('*')
        .eq('id', bankTxnId)
        .single();

      if (paymentError || !payment || bankError || !bankTxn) {
        return { success: false, error: 'Payment or bank transaction not found' };
      }

      // Get Bank account
      const { data: bankAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '1000')
        .single();

      if (!bankAccount) {
        return { success: false, error: 'Bank account not found' };
      }

      // Get A/P Control account
      const { data: apAccount } = await this.supabase
        .from('gl_accounts')
        .select('id')
        .eq('code', '2000')
        .single();

      if (!apAccount) {
        return { success: false, error: 'A/P Control account not found' };
      }

      // Create journal entry
      const journalResult = await this.postJournal({
        date: bankTxn.date,
        memo: `Bank Payment Reconciliation - ${bankTxn.description}`,
        building_id: payment.bank_accounts.building_id,
        created_by: payment.created_by || '',
        lines: [
          {
            account_id: apAccount.id,
            debit: Math.abs(bankTxn.amount), // Bank payments are negative, AP debits are positive
            credit: 0,
          },
          {
            account_id: bankAccount.id,
            debit: 0,
            credit: Math.abs(bankTxn.amount),
          },
        ],
      });

      if (!journalResult.success) {
        return journalResult;
      }

      return { success: true, journal_id: journalResult.journal_id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validate bank account balance matches statement totals
   */
  async validateBankBalance(bankAccountId: string, asOfDate?: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const { data: balance, error } = await this.supabase
        .rpc('get_bank_account_balance', {
          account_uuid: bankAccountId,
          as_of_date: asOfDate || new Date().toISOString().split('T')[0]
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, balance: balance || 0 };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Log audit trail
   */
  private async logAudit(entity: string, action: string, entityId: string, details: any): Promise<void> {
    await this.supabase
      .from('audit_log')
      .insert({
        actor: details.created_by,
        entity,
        action,
        details: {
          entity_id: entityId,
          ...details,
        },
      });
  }
}

// Export singleton instance
export const accountingPosting = new AccountingPostingService();
