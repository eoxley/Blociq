import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountingPosting } from '@/lib/accounting/posting';
import { z } from 'zod';

// OCR Invoice Schema
const OCRInvoiceSchema = z.object({
  supplier_name: z.string(),
  invoice_number: z.string(),
  invoice_date: z.string(),
  due_date: z.string().optional(),
  building_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  fund: z.enum(['Operational', 'Reserve', 'Major Works']).default('Operational'),
  works_order_ref: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    net: z.number(),
    vat: z.number().default(0),
    account_code: z.string().optional(),
  })),
  gross_total: z.number(),
  attachment_url: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = OCRInvoiceSchema.parse(body);
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', validatedData.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding || !['owner', 'manager'].includes(userBuilding.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check for existing invoice (idempotency)
    const { data: existingInvoice } = await supabase
      .from('ap_invoices')
      .select('id, status')
      .eq('invoice_number', validatedData.invoice_number)
      .eq('contractor_id', (await supabase
        .from('contractors')
        .select('id')
        .eq('name', validatedData.supplier_name)
        .single()
      ).data?.id)
      .single();

    if (existingInvoice) {
      return NextResponse.json({
        success: true,
        invoice: {
          id: existingInvoice.id,
          status: existingInvoice.status,
          message: 'Invoice already exists',
        },
      });
    }

    // Find or create contractor
    let contractor;
    const { data: existingContractor } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('name', validatedData.supplier_name)
      .single();

    if (existingContractor) {
      contractor = existingContractor;
    } else {
      const { data: newContractor, error: contractorError } = await supabase
        .from('contractors')
        .insert({
          name: validatedData.supplier_name,
        })
        .select()
        .single();

      if (contractorError) {
        return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
      }
      contractor = newContractor;
    }

    // Verify schedule exists if provided
    if (validatedData.schedule_id) {
      const { data: schedule, error: scheduleError } = await supabase
        .from('service_charge_schedules')
        .select('id, building_id')
        .eq('id', validatedData.schedule_id)
        .eq('building_id', validatedData.building_id)
        .single();

      if (scheduleError || !schedule) {
        return NextResponse.json({ error: 'Service charge schedule not found' }, { status: 404 });
      }
    }

    // Handle works order linkage if provided
    let worksOrderId = null;
    let worksOrderWarning = null;
    
    if (validatedData.works_order_ref) {
      const { data: worksOrder, error: woError } = await supabase
        .from('works_orders')
        .select('id, status, title, contractors(name)')
        .eq('ref', validatedData.works_order_ref)
        .eq('building_id', validatedData.building_id)
        .single();

      if (woError || !worksOrder) {
        worksOrderWarning = `Works order reference '${validatedData.works_order_ref}' not found for this building`;
      } else {
        worksOrderId = worksOrder.id;
        
        if (!['issued', 'completed'].includes(worksOrder.status)) {
          worksOrderWarning = `Works order '${validatedData.works_order_ref}' is not issued or completed (current status: ${worksOrder.status})`;
        }
      }
    }

    // Get fund ID
    const { data: fund } = await supabase
      .from('funds')
      .select('id')
      .eq('building_id', validatedData.building_id)
      .eq('name', validatedData.fund)
      .single();

    if (!fund) {
      return NextResponse.json({ error: `Fund '${validatedData.fund}' not found for building` }, { status: 404 });
    }

    // Calculate totals
    const netTotal = validatedData.lines.reduce((sum, line) => sum + line.net, 0);
    const vatTotal = validatedData.lines.reduce((sum, line) => sum + line.vat, 0);
    const calculatedGross = netTotal + vatTotal;

    // Validate totals
    if (Math.abs(calculatedGross - validatedData.gross_total) > 0.01) {
      return NextResponse.json({ 
        error: `Calculated gross total (${calculatedGross}) does not match provided gross total (${validatedData.gross_total})` 
      }, { status: 400 });
    }

    // Map line items to account IDs
    const invoiceLines = [];
    for (const lineItem of validatedData.lines) {
      let accountId = null;

      // If account_code is provided, try to find the account
      if (lineItem.account_code) {
        const { data: account } = await supabase
          .from('gl_accounts')
          .select('id')
          .eq('code', lineItem.account_code)
          .single();

        if (account) {
          accountId = account.id;
        }
      }

      // If no account found by code, try to match by description
      if (!accountId) {
        const description = lineItem.description.toLowerCase();
        let accountCode = '5960'; // Default to Other Operating Expenses

        // Simple keyword matching for common expense types
        if (description.includes('repair') || description.includes('maintenance')) {
          if (description.includes('lift') || description.includes('elevator')) {
            accountCode = '5000'; // Repairs & Maintenance - Lifts
          } else if (description.includes('clean')) {
            accountCode = '5010'; // Repairs & Maintenance - Cleaning
          } else if (description.includes('utility') || description.includes('electric') || description.includes('gas') || description.includes('water')) {
            accountCode = '5020'; // Repairs & Maintenance - Utilities
          } else if (description.includes('building') || description.includes('roof') || description.includes('window')) {
            accountCode = '5030'; // Repairs & Maintenance - Building
          } else if (description.includes('ground') || description.includes('garden') || description.includes('landscape')) {
            accountCode = '5040'; // Repairs & Maintenance - Grounds
          } else {
            accountCode = '5050'; // Repairs & Maintenance - Other
          }
        } else if (description.includes('insurance')) {
          accountCode = '5100'; // Insurance - Buildings
        } else if (description.includes('legal') || description.includes('solicitor')) {
          accountCode = '5200'; // Professional Fees - Legal
        } else if (description.includes('account') || description.includes('bookkeeping')) {
          accountCode = '5210'; // Professional Fees - Accountancy
        } else if (description.includes('survey') || description.includes('inspection')) {
          accountCode = '5220'; // Professional Fees - Surveying
        } else if (description.includes('management')) {
          accountCode = '5300'; // Management Fees
        } else if (description.includes('electric')) {
          accountCode = '5400'; // Utilities - Electricity
        } else if (description.includes('gas')) {
          accountCode = '5410'; // Utilities - Gas
        } else if (description.includes('water')) {
          accountCode = '5420'; // Utilities - Water
        } else if (description.includes('security')) {
          accountCode = '5500'; // Security Services
        } else if (description.includes('clean')) {
          accountCode = '5600'; // Cleaning Services
        } else if (description.includes('ground') || description.includes('garden')) {
          accountCode = '5700'; // Grounds Maintenance
        }

        // Get account ID by code
        const { data: account } = await supabase
          .from('gl_accounts')
          .select('id')
          .eq('code', accountCode)
          .single();

        if (account) {
          accountId = account.id;
        }
      }

      if (!accountId) {
        return NextResponse.json({ 
          error: `Could not determine account for line item: ${lineItem.description}` 
        }, { status: 400 });
      }

      invoiceLines.push({
        description: lineItem.description,
        account_id: accountId,
        net: lineItem.net,
        vat: lineItem.vat,
        gross: lineItem.net + lineItem.vat,
      });
    }

    // Create AP invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('ap_invoices')
      .insert({
        contractor_id: contractor.id,
        building_id: validatedData.building_id,
        schedule_id: validatedData.schedule_id,
        works_order_id: worksOrderId,
        invoice_number: validatedData.invoice_number,
        date: validatedData.invoice_date,
        due_date: validatedData.due_date,
        gross_total: validatedData.gross_total,
        vat_total: vatTotal,
        net_total: netTotal,
        total: netTotal, // Keep for backward compatibility
        attachment_url: validatedData.attachment_url,
        status: 'draft',
      })
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create invoice lines
    const linesToInsert = invoiceLines.map(line => ({
      invoice_id: invoice.id,
      description: line.description,
      account_id: line.account_id,
      net: line.net,
      vat: line.vat,
      gross: line.gross,
    }));

    const { error: linesError } = await supabase
      .from('ap_invoice_lines')
      .insert(linesToInsert);

    if (linesError) {
      return NextResponse.json({ error: 'Failed to create invoice lines' }, { status: 500 });
    }

    // Store attachment if provided
    if (validatedData.attachment_url) {
      await supabase
        .from('attachments')
        .insert({
          entity_type: 'ap_invoice',
          entity_id: invoice.id,
          file_url: validatedData.attachment_url,
        });
    }

    // Create draft GL journal
    const journalResult = await accountingPosting.postJournal({
      date: validatedData.invoice_date,
      memo: `Draft Invoice - ${contractor.name} ${validatedData.invoice_number}`,
      building_id: validatedData.building_id,
      schedule_id: validatedData.schedule_id,
      created_by: user.id,
      lines: [
        // Expense lines
        ...invoiceLines.map(line => ({
          account_id: line.account_id,
          debit: line.gross,
          credit: 0,
          fund_id: fund.id,
        })),
        // AP Control credit
        {
          account_id: (await supabase
            .from('gl_accounts')
            .select('id')
            .eq('code', '2000')
            .single()
          ).data?.id || '',
          debit: 0,
          credit: validatedData.gross_total,
        },
      ],
    });

    if (!journalResult.success) {
      console.error('Failed to create draft journal:', journalResult.error);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        status: 'draft',
        invoice_number: invoice.invoice_number,
        gross_total: invoice.gross_total,
        net_total: invoice.net_total,
        vat_total: invoice.vat_total,
        contractor: contractor.name,
        works_order_id: worksOrderId,
        works_order_warning: worksOrderWarning,
        lines: invoiceLines,
      },
    });

  } catch (error) {
    console.error('Error processing OCR invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
