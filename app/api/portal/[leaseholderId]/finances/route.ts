import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify lease exists and user has access
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        building_id,
        ground_rent,
        service_charge_apportionment,
        start_date,
        end_date
      `)
      .eq('id', params.leaseholderId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({
        error: 'Lease not found'
      }, { status: 404 });
    }

    // Get live financial data from accounting tables
    const { data: demandHeaders } = await supabase
      .from('ar_demand_headers')
      .select(`
        id,
        total_amount,
        outstanding_amount,
        due_date,
        status,
        created_at
      `)
      .eq('leaseholder_id', params.leaseholderId)
      .order('due_date', { ascending: false });

    const { data: receipts } = await supabase
      .from('ar_receipts')
      .select(`
        id,
        amount,
        payment_date,
        description,
        status
      `)
      .eq('leaseholder_id', params.leaseholderId)
      .order('payment_date', { ascending: false });

    // Calculate current balance and arrears
    const totalOutstanding = demandHeaders?.reduce((sum, demand) => sum + (demand.outstanding_amount || 0), 0) || 0;
    const totalPaid = receipts?.reduce((sum, receipt) => sum + (receipt.amount || 0), 0) || 0;
    const currentBalance = totalOutstanding - totalPaid;
    
    // Get ground rent information from lease
    const groundRentAmount = parseFloat(lease.ground_rent?.replace(/[^\d.]/g, '') || '0');
    const serviceChargePercentage = lease.service_charge_apportionment || 0;

    // Calculate service charge from actual demands
    const serviceChargeDemands = demandHeaders?.filter(d => d.description?.toLowerCase().includes('service')) || [];
    const serviceChargeAmount = serviceChargeDemands.reduce((sum, demand) => sum + (demand.total_amount || 0), 0);

    const financialSummary = {
      current_balance: currentBalance,
      total_outstanding: totalOutstanding,
      total_paid: totalPaid,
      is_in_arrears: currentBalance > 0,
      ground_rent: {
        annual_amount: groundRentAmount,
        status: groundRentAmount > 0 ? 'active' : 'not_applicable'
      },
      service_charge: {
        annual_amount: serviceChargeAmount,
        apportionment_percentage: serviceChargePercentage,
        status: serviceChargeAmount > 0 ? 'active' : 'not_applicable'
      },
      payment_status: currentBalance > 0 ? 'in_arrears' : 'up_to_date'
    };

    // Transform demands into recent transactions
    const recentTransactions = demandHeaders?.slice(0, 10).map(demand => ({
      id: demand.id,
      type: demand.description?.toLowerCase().includes('service') ? 'service_charge' : 'demand',
      amount: demand.total_amount,
      date: demand.due_date,
      description: demand.description || 'Payment demand',
      status: demand.outstanding_amount > 0 ? 'outstanding' : 'paid',
      outstanding_amount: demand.outstanding_amount
    })) || [];

    // Get upcoming payments (outstanding demands)
    const upcomingPayments = demandHeaders?.filter(demand => 
      demand.outstanding_amount > 0 && new Date(demand.due_date) >= new Date()
    ).map(demand => ({
      id: demand.id,
      type: demand.description?.toLowerCase().includes('service') ? 'service_charge' : 'demand',
      amount: demand.outstanding_amount,
      due_date: demand.due_date,
      description: demand.description || 'Payment due',
      status: 'due',
      days_overdue: demand.due_date ? Math.max(0, Math.floor((new Date().getTime() - new Date(demand.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0
    })) || [];

    return NextResponse.json({
      success: true,
      financial_summary: financialSummary,
      recent_transactions: recentTransactions,
      upcoming_payments: upcomingPayments,
      lease_details: {
        start_date: lease.start_date,
        end_date: lease.end_date,
        ground_rent: lease.ground_rent,
        service_charge_apportionment: serviceChargePercentage
      }
    });

  } catch (error) {
    console.error('Error fetching portal finances:', error);
    return NextResponse.json({
      error: 'Failed to fetch financial information',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}