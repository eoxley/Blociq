import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SubscriptionCheck {
  isActive: boolean
  subscriptionId: string | null
  usageRemaining: number
  expiresAt: string | null
  hasAccess: boolean
}

export async function checkOutlookSubscription(userEmail: string): Promise<SubscriptionCheck> {
  try {
    // Check subscription status
    const { data, error } = await serviceSupabase
      .rpc('check_outlook_subscription', { user_email: userEmail })

    if (error) {
      console.error('Error checking subscription:', error)
      return {
        isActive: false,
        subscriptionId: null,
        usageRemaining: 0,
        expiresAt: null,
        hasAccess: false
      }
    }

    const subscription = data?.[0] || {
      is_active: false,
      subscription_id: null,
      usage_remaining: 0,
      expires_at: null
    }

    return {
      isActive: subscription.is_active,
      subscriptionId: subscription.subscription_id,
      usageRemaining: subscription.usage_remaining,
      expiresAt: subscription.expires_at,
      hasAccess: subscription.is_active && subscription.usage_remaining > 0
    }

  } catch (error) {
    console.error('Subscription check error:', error)
    return {
      isActive: false,
      subscriptionId: null,
      usageRemaining: 0,
      expiresAt: null,
      hasAccess: false
    }
  }
}

export async function logOutlookUsage(
  userEmail: string,
  endpoint: string,
  requestType: string,
  tokensUsed: number = 1,
  responseTimeMs?: number,
  success: boolean = true,
  errorMessage?: string,
  requestMetadata: Record<string, any> = {}
): Promise<boolean> {
  try {
    const { data, error } = await serviceSupabase
      .rpc('log_outlook_usage', {
        user_email: userEmail,
        endpoint,
        request_type: requestType,
        tokens_used: tokensUsed,
        response_time_ms: responseTimeMs,
        success,
        error_message: errorMessage,
        request_metadata: requestMetadata
      })

    if (error) {
      console.error('Error logging usage:', error)
      return false
    }

    return data === true

  } catch (error) {
    console.error('Usage logging error:', error)
    return false
  }
}

export function createSubscriptionMiddleware(options: {
  requestType: string
  tokensRequired?: number
  includeBuildings?: boolean
}) {
  return async function subscriptionMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now()
    const userEmail = request.headers.get('X-User-Email') ||
                      request.headers.get('x-user-email') ||
                      (request.nextUrl.searchParams.get('user_email'))

    // For non-Outlook add-in requests, skip subscription check
    const isOutlookAddinRequest = request.headers.get('X-Outlook-Addin') === 'true' ||
                                  request.url.includes('outlook') ||
                                  request.url.includes('addin')

    if (!isOutlookAddinRequest) {
      return handler(request)
    }

    if (!userEmail) {
      return NextResponse.json({
        error: 'User email required for Outlook add-in access',
        code: 'MISSING_EMAIL'
      }, { status: 401 })
    }

    // Check subscription status
    const subscription = await checkOutlookSubscription(userEmail)

    if (!subscription.hasAccess) {
      // Log failed attempt
      await logOutlookUsage(
        userEmail,
        request.nextUrl.pathname,
        options.requestType,
        options.tokensRequired || 1,
        Date.now() - startTime,
        false,
        subscription.isActive ? 'Usage limit exceeded' : 'No active subscription'
      )

      if (!subscription.isActive) {
        return NextResponse.json({
          error: 'Outlook add-in subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          subscriptionUrl: 'https://www.blociq.co.uk/outlook-subscription'
        }, { status: 402 })
      } else {
        return NextResponse.json({
          error: 'Monthly usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          usageRemaining: subscription.usageRemaining,
          upgradeUrl: 'https://www.blociq.co.uk/outlook-subscription/upgrade'
        }, { status: 429 })
      }
    }

    try {
      // Process the request
      const response = await handler(request)
      const responseTime = Date.now() - startTime

      // Log successful usage
      await logOutlookUsage(
        userEmail,
        request.nextUrl.pathname,
        options.requestType,
        options.tokensRequired || 1,
        responseTime,
        true,
        undefined,
        {
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          hasBuildings: options.includeBuildings || false
        }
      )

      return response

    } catch (error) {
      const responseTime = Date.now() - startTime

      // Log failed usage
      await logOutlookUsage(
        userEmail,
        request.nextUrl.pathname,
        options.requestType,
        options.tokensRequired || 1,
        responseTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }
}

export function withOutlookSubscription(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    requestType: string
    tokensRequired?: number
    includeBuildings?: boolean
  }
) {
  const middleware = createSubscriptionMiddleware(options)

  return async function wrappedHandler(request: NextRequest): Promise<NextResponse> {
    return middleware(request, handler)
  }
}

// Usage tracking utilities
export async function getUsageStats(userEmail: string, days: number = 30) {
  try {
    const { data, error } = await serviceSupabase
      .from('outlook_usage_logs')
      .select(`
        created_at,
        api_endpoint,
        request_type,
        tokens_used,
        success,
        response_time_ms
      `)
      .eq('user_email', userEmail)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching usage stats:', error)
      return null
    }

    return {
      totalRequests: data.length,
      successfulRequests: data.filter(log => log.success).length,
      failedRequests: data.filter(log => !log.success).length,
      totalTokens: data.reduce((sum, log) => sum + (log.tokens_used || 0), 0),
      averageResponseTime: data.length > 0
        ? data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / data.length
        : 0,
      requestsByType: data.reduce((acc, log) => {
        acc[log.request_type] = (acc[log.request_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      requestsByEndpoint: data.reduce((acc, log) => {
        acc[log.api_endpoint] = (acc[log.api_endpoint] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      dailyUsage: data.reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + (log.tokens_used || 0)
        return acc
      }, {} as Record<string, number>)
    }

  } catch (error) {
    console.error('Usage stats error:', error)
    return null
  }
}