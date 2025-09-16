import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Communications System Status Check
 * Provides a quick overview of system readiness
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const status = {
      system_ready: false,
      database: { ready: false, details: '' },
      templates: { count: 0, ready: false, details: '' },
      recipients: { count: 0, ready: false, details: '' },
      email_service: { ready: false, details: '' },
      communications_log: { ready: false, details: '' }
    }

    // Check database connectivity
    try {
      const { data: health } = await supabase
        .from('buildings')
        .select('id')
        .limit(1)

      status.database.ready = true
      status.database.details = 'Database connection successful'
    } catch (error) {
      status.database.details = `Database error: ${error instanceof Error ? error.message : 'Unknown'}`
    }

    // Check communication templates
    try {
      const { data: templates, error } = await supabase
        .from('communication_templates')
        .select('id, name')

      if (!error) {
        status.templates.count = templates?.length || 0
        status.templates.ready = templates && templates.length > 0
        status.templates.details = `Found ${templates?.length || 0} templates`
      } else {
        status.templates.details = `Templates error: ${error.message}`
      }
    } catch (error) {
      status.templates.details = `Templates exception: ${error instanceof Error ? error.message : 'Unknown'}`
    }

    // Check recipients (leaseholders with emails)
    try {
      const { data: recipients, error } = await supabase
        .from('leaseholders')
        .select('id')
        .not('email', 'is', null)

      if (!error) {
        status.recipients.count = recipients?.length || 0
        status.recipients.ready = recipients && recipients.length > 0
        status.recipients.details = `Found ${recipients?.length || 0} leaseholders with emails`
      } else {
        status.recipients.details = `Recipients error: ${error.message}`
      }
    } catch (error) {
      status.recipients.details = `Recipients exception: ${error instanceof Error ? error.message : 'Unknown'}`
    }

    // Check email service configuration
    try {
      const hasEmailConfig = !!(
        process.env.SENDGRID_API_KEY ||
        (process.env.SMTP_HOST && process.env.SMTP_USERNAME)
      )

      status.email_service.ready = hasEmailConfig
      status.email_service.details = hasEmailConfig
        ? process.env.SENDGRID_API_KEY ? 'SendGrid configured' : 'SMTP configured'
        : 'No email service configured (will use console mode)'
    } catch (error) {
      status.email_service.details = 'Email service check failed'
    }

    // Check communications log
    try {
      const { data: logs, error } = await supabase
        .from('communications_log')
        .select('id')
        .limit(1)

      if (!error) {
        status.communications_log.ready = true
        status.communications_log.details = 'Communications logging available'
      } else {
        status.communications_log.details = `Logging error: ${error.message}`
      }
    } catch (error) {
      status.communications_log.details = `Logging exception: ${error instanceof Error ? error.message : 'Unknown'}`
    }

    // Overall system readiness
    status.system_ready = (
      status.database.ready &&
      status.templates.ready &&
      status.recipients.ready
    )

    return NextResponse.json({
      ...status,
      recommendations: getRecommendations(status),
      quick_setup: {
        create_templates: '/api/setup-templates',
        test_system: '/api/test-mail-merge',
        communications_page: '/communications'
      }
    })

  } catch (error) {
    return NextResponse.json({
      system_ready: false,
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getRecommendations(status: any): string[] {
  const recommendations = []

  if (!status.database.ready) {
    recommendations.push('Check database connection and Supabase configuration')
  }

  if (!status.templates.ready) {
    recommendations.push('Create sample templates using POST /api/setup-templates')
  }

  if (!status.recipients.ready) {
    recommendations.push('Add leaseholders with email addresses to the database')
  }

  if (!status.email_service.ready) {
    recommendations.push('Configure email service (SendGrid or SMTP) in environment variables')
  }

  if (!status.communications_log.ready) {
    recommendations.push('Apply communications_log migration to enable logging')
  }

  if (status.system_ready) {
    recommendations.push('System ready! Test mail merge functionality')
  }

  return recommendations
}