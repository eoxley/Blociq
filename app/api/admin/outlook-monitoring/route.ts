import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase with service role
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Basic subscription metrics
    const { data: subscriptions, error: subsError } = await serviceSupabase
      .from('outlook_subscriptions')
      .select('*')

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 })
    }

    // Usage logs for analytics
    const { data: usageLogs, error: usageError } = await serviceSupabase
      .from('outlook_usage_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (usageError) {
      console.error('Error fetching usage logs:', usageError)
    }

    // Calculate metrics
    const totalSubscriptions = subscriptions?.length || 0
    const activeSubscriptions = subscriptions?.filter(s =>
      s.subscription_status === 'active' || s.subscription_status === 'trialing'
    ).length || 0
    const trialSubscriptions = subscriptions?.filter(s =>
      s.subscription_status === 'trialing'
    ).length || 0
    const cancelledSubscriptions = subscriptions?.filter(s =>
      s.subscription_status === 'cancelled'
    ).length || 0

    // Calculate monthly recurring revenue (£15 per active non-trial subscription)
    const paidSubscriptions = subscriptions?.filter(s =>
      s.subscription_status === 'active'
    ).length || 0
    const monthlyRecurringRevenue = paidSubscriptions * 15

    // Calculate average usage per user
    const totalUsage = subscriptions?.reduce((sum, sub) => sum + (sub.monthly_usage_count || 0), 0) || 0
    const averageUsagePerUser = totalSubscriptions > 0 ? Math.round(totalUsage / totalSubscriptions) : 0

    // Top usage users
    const topUsageUsers = subscriptions
      ?.sort((a, b) => (b.monthly_usage_count || 0) - (a.monthly_usage_count || 0))
      .slice(0, 10)
      .map(sub => ({
        email: sub.email,
        usage: sub.monthly_usage_count || 0,
        limit: sub.monthly_usage_limit || 5000,
        status: sub.subscription_status
      })) || []

    // Usage by endpoint
    const usageByEndpoint = usageLogs?.reduce((acc: any, log) => {
      const endpoint = log.endpoint || 'unknown'
      if (!acc[endpoint]) {
        acc[endpoint] = 0
      }
      acc[endpoint] += 1
      return acc
    }, {})

    const totalUsageCount = usageLogs?.length || 0
    const usageByEndpointArray = Object.entries(usageByEndpoint || {}).map(([endpoint, count]: [string, any]) => ({
      endpoint: endpoint.replace('/api/', '').replace('-', ' '),
      count,
      percentage: totalUsageCount > 0 ? Math.round((count / totalUsageCount) * 100) : 0
    })).sort((a, b) => b.count - a.count)

    // Recent activity (last 50 events)
    const recentActivity = [
      // Subscription events from subscriptions
      ...subscriptions?.map(sub => ({
        email: sub.email,
        action: `Subscription ${sub.subscription_status}`,
        timestamp: sub.updated_at || sub.created_at,
        details: `Status: ${sub.subscription_status}, Usage: ${sub.monthly_usage_count}/${sub.monthly_usage_limit}`
      })) || [],
      // Usage events from logs
      ...usageLogs?.slice(0, 20).map(log => ({
        email: log.user_email,
        action: `Used ${log.endpoint?.replace('/api/', '') || 'API'}`,
        timestamp: log.created_at,
        details: log.request_type ? `Request type: ${log.request_type}` : undefined
      })) || []
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)

    const metrics = {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      monthlyRecurringRevenue,
      averageUsagePerUser,
      topUsageUsers,
      recentActivity,
      usageByEndpoint: usageByEndpointArray
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error in outlook monitoring API:', error)
    return NextResponse.json({
      error: 'Failed to fetch monitoring data'
    }, { status: 500 })
  }
}

// Additional endpoint for real-time statistics
export async function POST(request: NextRequest) {
  try {
    const { action, filters } = await request.json()

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (action) {
      case 'export_subscriptions':
        // Export subscription data as CSV
        const { data: subs } = await serviceSupabase
          .from('outlook_subscriptions')
          .select('*')
          .order('created_at', { ascending: false })

        const csvData = [
          ['Email', 'Status', 'Created', 'Usage', 'Limit', 'Revenue'].join(','),
          ...(subs || []).map(sub => [
            sub.email,
            sub.subscription_status,
            sub.created_at,
            sub.monthly_usage_count || 0,
            sub.monthly_usage_limit || 0,
            sub.subscription_status === 'active' ? '15' : '0'
          ].join(','))
        ].join('\n')

        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=outlook-subscriptions.csv'
          }
        })

      case 'usage_report':
        // Generate usage report for specific time period
        const startDate = filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const endDate = filters?.endDate || new Date().toISOString()

        const { data: usageData } = await serviceSupabase
          .from('outlook_usage_logs')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })

        return NextResponse.json({
          usage: usageData || [],
          totalRequests: usageData?.length || 0,
          uniqueUsers: [...new Set(usageData?.map(log => log.user_email) || [])].length,
          period: { startDate, endDate }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in outlook monitoring POST:', error)
    return NextResponse.json({
      error: 'Failed to process request'
    }, { status: 500 })
  }
}