import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountingPosting } from '@/lib/accounting/posting';
import { z } from 'zod';

const ApproveInvoiceSchema = z.object({
  invoice_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ApproveInvoiceSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invoice with lines
    const { data: invoice, error: invoiceError } = await supabase
      .from('ap_invoices')
      .select(`
        *,
        ap_invoice_lines (*),
        contractors (name)
      `)
      .eq('id', validatedData.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify user has access to building
    const { data: userBuilding } = await supabase
      .from('user_buildings')
      .select('role')
      .eq('building_id', invoice.building_id)
      .eq('user_id', user.id)
      .single();

    if (!userBuilding || !['owner', 'manager'].includes(userBuilding.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check invoice status
    if (invoice.status !== 'draft') {
      return NextResponse.json({ 
        error: `Invoice is not in draft status. Current status: ${invoice.status}` 
      }, { status: 400 });
    }

    // Validate invoice totals
    const lineTotals = invoice.ap_invoice_lines.reduce((totals, line) => ({
      net: totals.net + line.net,
      vat: totals.vat + line.vat,
      gross: totals.gross + line.gross,
    }), { net: 0, vat: 0, gross: 0 });

    if (Math.abs(lineTotals.gross - invoice.gross_total) > 0.01) {
      return NextResponse.json({ 
        error: `Invoice line totals (${lineTotals.gross}) do not match invoice gross total (${invoice.gross_total})` 
      }, { status: 400 });
    }

    // Update invoice status to approved
    const { error: updateError } = await supabase
      .from('ap_invoices')
      .update({ status: 'approved' })
      .eq('id', validatedData.invoice_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve invoice' }, { status: 500 });
    }

    // Post the invoice to GL using the posting service
    const postResult = await accountingPosting.postSupplierInvoice({
      invoice_id: validatedData.invoice_id,
      lines: invoice.ap_invoice_lines.map(line => ({
        account_id: line.account_id,
        amount: line.gross,
        narrative: line.description,
      })),
    });

    if (!postResult.success) {
      // Rollback invoice status
      await supabase
        .from('ap_invoices')
        .update({ status: 'draft' })
        .eq('id', validatedData.invoice_id);
      
      return NextResponse.json({ error: postResult.error }, { status: 400 });
    }

    // Update invoice status to posted
    const { error: postedError } = await supabase
      .from('ap_invoices')
      .update({ status: 'posted' })
      .eq('id', validatedData.invoice_id);

    if (postedError) {
      console.error('Failed to update invoice to posted status:', postedError);
      // Don't fail the request, the journal was posted successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice approved and posted to GL',
      invoice: {
        id: invoice.id,
        status: 'posted',
        invoice_number: invoice.invoice_number,
        gross_total: invoice.gross_total,
        contractor: invoice.contractors.name,
      },
    });

  } catch (error) {
    console.error('Error approving invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

