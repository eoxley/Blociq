import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Setup Templates API
 * Checks existing table structure and creates sample templates if needed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    console.log('🔍 Checking communication_templates table structure...')

    // Check what columns exist in the current table
    const { data: tableInfo, error: tableError } = await supabase
      .from('communication_templates')
      .select('*')
      .limit(1)

    if (tableError) {
      return NextResponse.json({
        error: 'Cannot access communication_templates table',
        details: tableError.message,
        suggestion: 'Make sure the table exists and has proper permissions'
      }, { status: 500 })
    }

    console.log('✅ Table exists, checking for sample templates...')

    // Check if sample templates already exist
    const { data: existingTemplates, error: templatesError } = await supabase
      .from('communication_templates')
      .select('id, name')
      .limit(5)

    if (templatesError) {
      console.error('Error checking existing templates:', templatesError)
    }

    const hasTemplates = existingTemplates && existingTemplates.length > 0

    if (hasTemplates) {
      return NextResponse.json({
        success: true,
        message: `Found ${existingTemplates.length} existing templates`,
        templates: existingTemplates,
        action: 'no_action_needed'
      })
    }

    // Create sample templates with error handling for missing columns
    console.log('📝 Creating sample templates...')

    const sampleTemplates = [
      {
        name: 'Welcome Email',
        description: 'Welcome new leaseholders to the building',
        type: 'email',
        subject: 'Welcome to {{building.name}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to {{building.name}}!</h2>
            <p>Dear {{recipient.name}},</p>
            <p>We're delighted to welcome you to your new home at {{building.name}}.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your Details:</h3>
              <ul>
                <li><strong>Building:</strong> {{building.name}}</li>
                <li><strong>Unit:</strong> {{unit.number}}</li>
                <li><strong>Welcome Date:</strong> {{today}}</li>
              </ul>
            </div>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>
            <strong>BlocIQ Property Management Team</strong></p>
          </div>
        `
      },
      {
        name: 'Building Notice',
        description: 'Important building announcements',
        type: 'letter',
        subject: 'Important Notice - {{building.name}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Important Building Notice</h2>
            <p>Dear {{recipient.name}},</p>
            <p>We would like to inform you about important updates regarding {{building.name}}.</p>
            <div style="border-left: 4px solid #fbbf24; padding-left: 16px; margin: 20px 0;">
              <h3>Notice Details:</h3>
              <p>Please review the following information carefully and keep this notice for your records.</p>
            </div>
            <p>If you have any questions or concerns, please contact the building management office.</p>
            <p>Thank you for your attention to this matter.</p>
            <br>
            <p>Regards,<br>
            <strong>Property Management Team</strong><br>
            <small>Notice dated: {{today}}</small></p>
          </div>
        `
      },
      {
        name: 'Maintenance Update',
        description: 'Maintenance and repair notifications',
        type: 'email',
        subject: 'Maintenance Update - {{building.name}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Maintenance Update</h2>
            <p>Dear {{recipient.name}},</p>
            <p>We wanted to update you on upcoming maintenance work at {{building.name}}.</p>
            <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">Maintenance Schedule</h3>
              <p>Work will be carried out with minimal disruption to residents.</p>
              <p>Date: {{today}}</p>
            </div>
            <p>We appreciate your patience during this time.</p>
            <p>Best regards,<br>
            <strong>Building Maintenance Team</strong></p>
          </div>
        `
      }
    ]

    // Try to insert templates with flexible column handling
    const results = []

    for (const template of sampleTemplates) {
      try {
        // Try with all possible columns
        const insertData: any = {
          name: template.name,
          description: template.description,
          type: template.type,
          subject: template.subject,
          body: template.body
        }

        // Add optional columns if they might exist
        try {
          insertData.category = 'sample'
          insertData.placeholders = ['recipient.name', 'building.name', 'unit.number', 'today']
          insertData.is_active = true
        } catch (e) {
          // These columns might not exist, that's OK
        }

        const { data: newTemplate, error: insertError } = await supabase
          .from('communication_templates')
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          console.error(`Error creating template "${template.name}":`, insertError)
          results.push({
            name: template.name,
            success: false,
            error: insertError.message
          })
        } else {
          console.log(`✅ Created template: ${template.name}`)
          results.push({
            name: template.name,
            success: true,
            id: newTemplate.id
          })
        }
      } catch (error) {
        console.error(`Exception creating template "${template.name}":`, error)
        results.push({
          name: template.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Created ${successCount}/${sampleTemplates.length} sample templates`,
      results,
      table_structure_detected: Object.keys(tableInfo?.[0] || {}),
      next_steps: successCount > 0
        ? ['Templates ready to use in Communications page', 'Test mail merge functionality']
        : ['Check table structure', 'Apply database migrations if needed']
    })

  } catch (error) {
    console.error('❌ Setup templates error:', error)
    return NextResponse.json({
      error: 'Failed to setup templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check table structure
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get a sample record to see the structure
    const { data: sampleRecord, error } = await supabase
      .from('communication_templates')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        error: 'Cannot access table',
        details: error.message
      }, { status: 500 })
    }

    const columns = sampleRecord?.[0] ? Object.keys(sampleRecord[0]) : []

    // Count existing templates
    const { data: allTemplates, error: countError } = await supabase
      .from('communication_templates')
      .select('id, name, type')

    return NextResponse.json({
      table_exists: true,
      columns_detected: columns,
      existing_templates: allTemplates?.length || 0,
      templates: allTemplates || [],
      ready_for_mail_merge: columns.includes('name') && columns.includes('type') && columns.includes('body')
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check table structure',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}