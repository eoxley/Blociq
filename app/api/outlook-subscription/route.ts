import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        error: 'Email parameter required'
      }, { status: 400 })
    }

    // Check subscription status
    const { data, error } = await serviceSupabase
      .rpc('check_outlook_subscription', { user_email: email })

    if (error) {
      console.error('Error checking subscription:', error)
      return NextResponse.json({
        error: 'Failed to check subscription status'
      }, { status: 500 })
    }

    const subscription = data?.[0] || {
      is_active: false,
      subscription_id: null,
      usage_remaining: 0,
      expires_at: null
    }

    return NextResponse.json({
      success: true,
      subscription: {
        isActive: subscription.is_active,
        subscriptionId: subscription.subscription_id,
        usageRemaining: subscription.usage_remaining,
        expiresAt: subscription.expires_at,
        hasAccess: subscription.is_active && subscription.usage_remaining > 0
      }
    })

  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const {
      email,
      subscriptionType = 'outlook_addon',
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
      monthlyUsageLimit = 1000,
      metadata = {}
    } = await request.json()

    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 })
    }

    // Check if subscription already exists
    const { data: existingSub } = await serviceSupabase
      .from('outlook_subscriptions')
      .select('*')
      .eq('email', email)
      .single()

    if (existingSub) {
      // Update existing subscription
      const { data: updatedSub, error: updateError } = await serviceSupabase
        .from('outlook_subscriptions')
        .update({
          subscription_status: 'active',
          subscription_type: subscriptionType,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          monthly_usage_limit: monthlyUsageLimit,
          metadata
        })
        .eq('id', existingSub.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json({
          error: 'Failed to update subscription'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        subscription: updatedSub,
        message: 'Subscription updated successfully'
      })
    } else {
      // Create new subscription
      const { data: newSub, error: createError } = await serviceSupabase
        .from('outlook_subscriptions')
        .insert({
          email,
          subscription_status: 'active',
          subscription_type: subscriptionType,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          monthly_usage_limit: monthlyUsageLimit,
          monthly_usage_count: 0,
          metadata
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating subscription:', createError)
        return NextResponse.json({
          error: 'Failed to create subscription'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        subscription: newSub,
        message: 'Subscription created successfully'
      })
    }

  } catch (error) {
    console.error('Subscription creation/update error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Cancel/suspend subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const action = searchParams.get('action') || 'cancelled' // 'cancelled', 'suspended', 'expired'

    if (!email) {
      return NextResponse.json({
        error: 'Email parameter required'
      }, { status: 400 })
    }

    const validStatuses = ['cancelled', 'suspended', 'expired']
    if (!validStatuses.includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be: cancelled, suspended, or expired'
      }, { status: 400 })
    }

    const { data: cancelledSub, error: cancelError } = await serviceSupabase
      .from('outlook_subscriptions')
      .update({
        subscription_status: action,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single()

    if (cancelError) {
      console.error('Error cancelling subscription:', cancelError)
      return NextResponse.json({
        error: 'Failed to cancel subscription'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      subscription: cancelledSub,
      message: `Subscription ${action} successfully`
    })

  } catch (error) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}