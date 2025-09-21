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

    // Calculate financial summary
    const currentYear = new Date().getFullYear();
    const groundRentAmount = parseFloat(lease.ground_rent?.replace(/[^\d.]/g, '') || '0');
    const serviceChargePercentage = lease.service_charge_apportionment || 0;

    // Mock service charge calculation (in real app, this would come from actual building service charges)
    const estimatedAnnualServiceCharge = 2500; // This should be calculated from building's actual service charges
    const userServiceCharge = (estimatedAnnualServiceCharge * serviceChargePercentage) / 100;

    const financialSummary = {
      ground_rent: {
        annual_amount: groundRentAmount,
        next_payment_date: `${currentYear + 1}-01-01`, // Typically ground rent is paid annually
        last_payment_date: `${currentYear}-01-01`,
        status: 'up_to_date'
      },
      service_charge: {
        annual_estimate: userServiceCharge,
        apportionment_percentage: serviceChargePercentage,
        next_payment_date: `${currentYear + 1}-03-31`, // Typically service charge is paid quarterly
        last_payment_date: `${currentYear}-12-31`,
        status: 'pending'
      },
      total_annual_cost: groundRentAmount + userServiceCharge
    };

    // Get recent payments/transactions (mock data for now)
    const recentTransactions = [
      {
        id: '1',
        type: 'ground_rent',
        amount: groundRentAmount,
        date: `${currentYear}-01-15`,
        description: `Ground Rent Payment ${currentYear}`,
        status: 'paid'
      },
      {
        id: '2',
        type: 'service_charge',
        amount: userServiceCharge / 4, // Quarterly payment
        date: `${currentYear}-03-31`,
        description: `Service Charge Q1 ${currentYear}`,
        status: 'paid'
      },
      {
        id: '3',
        type: 'service_charge',
        amount: userServiceCharge / 4,
        date: `${currentYear}-06-30`,
        description: `Service Charge Q2 ${currentYear}`,
        status: 'paid'
      },
      {
        id: '4',
        type: 'service_charge',
        amount: userServiceCharge / 4,
        date: `${currentYear}-09-30`,
        description: `Service Charge Q3 ${currentYear}`,
        status: 'paid'
      },
      {
        id: '5',
        type: 'service_charge',
        amount: userServiceCharge / 4,
        date: `${currentYear}-12-31`,
        description: `Service Charge Q4 ${currentYear}`,
        status: 'pending'
      }
    ];

    // Get upcoming payments
    const upcomingPayments = [
      {
        id: '1',
        type: 'ground_rent',
        amount: groundRentAmount,
        due_date: `${currentYear + 1}-01-01`,
        description: `Ground Rent Payment ${currentYear + 1}`,
        status: 'upcoming'
      },
      {
        id: '2',
        type: 'service_charge',
        amount: userServiceCharge / 4,
        due_date: `${currentYear}-12-31`,
        description: `Service Charge Q4 ${currentYear}`,
        status: 'due'
      }
    ];

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