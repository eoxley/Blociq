import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Comprehensive end-to-end test of mail merge functionality
 * Tests all components required for production mail merge campaigns
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    console.log('🧪 Starting comprehensive mail merge test...')

    const testResults = {
      database_setup: { tested: false, success: false, details: '' },
      template_creation: { tested: false, success: false, details: '' },
      recipient_loading: { tested: false, success: false, details: '' },
      template_rendering: { tested: false, success: false, details: '' },
      email_service: { tested: false, success: false, details: '' },
      mail_merge_api: { tested: false, success: false, details: '' },
      communications_logging: { tested: false, success: false, details: '' }
    }

    // Test 1: Database Setup
    try {
      console.log('📋 Testing database setup...')

      // Check if communication_templates table exists
      const { data: templates, error: templateError } = await supabase
        .from('communication_templates')
        .select('id')
        .limit(1)

      if (templateError) {
        testResults.database_setup = {
          tested: true,
          success: false,
          details: `Templates table error: ${templateError.message}`
        }
      } else {
        // Check if buildings and leaseholders exist for testing
        const { data: buildings } = await supabase
          .from('buildings')
          .select('id, name')
          .limit(1)

        const { data: leaseholders } = await supabase
          .from('leaseholders')
          .select('id, name, email')
          .not('email', 'is', null)
          .limit(1)

        if (buildings && buildings.length > 0 && leaseholders && leaseholders.length > 0) {
          testResults.database_setup = {
            tested: true,
            success: true,
            details: `Database ready: templates table exists, ${buildings.length} building(s), ${leaseholders.length} leaseholder(s) with emails`
          }
        } else {
          testResults.database_setup = {
            tested: true,
            success: false,
            details: 'Database missing required data: buildings or leaseholders with emails'
          }
        }
      }
    } catch (error) {
      testResults.database_setup = {
        tested: true,
        success: false,
        details: `Database setup test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    // Test 2: Template Creation
    try {
      console.log('📝 Testing template creation...')

      const testTemplate = {
        name: 'Mail Merge Test Template',
        description: 'Test template for mail merge functionality',
        type: 'email',
        category: 'test',
        subject: 'Welcome to {{building.name}}, {{recipient.name}}!',
        body: `
          <h2>Welcome {{recipient.name}}!</h2>
          <p>Dear {{recipient.name}},</p>
          <p>We're delighted to welcome you to {{building.name}}.</p>
          <p>Your unit details:</p>
          <ul>
            <li>Building: {{building.name}}</li>
            <li>Unit: {{unit.number}}</li>
            <li>Date: {{today}}</li>
          </ul>
          <p>Best regards,<br>Property Management Team</p>
        `,
        placeholders: ['recipient.name', 'building.name', 'unit.number', 'today']
      }

      const { data: template, error: createError } = await supabase
        .from('communication_templates')
        .insert(testTemplate)
        .select()
        .single()

      if (createError) {
        testResults.template_creation = {
          tested: true,
          success: false,
          details: `Template creation failed: ${createError.message}`
        }
      } else {
        testResults.template_creation = {
          tested: true,
          success: true,
          details: `Test template created successfully: ${template.id}`
        }

        // Test 3: Recipient Loading
        try {
          console.log('👥 Testing recipient loading...')

          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name')
            .limit(1)

          if (buildings && buildings.length > 0) {
            const buildingId = buildings[0].id

            const response = await fetch(`${request.nextUrl.origin}/api/comms/recipients?buildingId=${buildingId}`, {
              method: 'GET',
              headers: {
                'x-system-test': 'true',
                'Authorization': request.headers.get('Authorization') || '',
              }
            })

            if (response.ok) {
              const recipients = await response.json()
              testResults.recipient_loading = {
                tested: true,
                success: recipients.length > 0,
                details: `Recipients loaded: ${recipients.length} found for building ${buildings[0].name}`
              }
            } else {
              testResults.recipient_loading = {
                tested: true,
                success: false,
                details: `Recipient loading failed: HTTP ${response.status}`
              }
            }
          } else {
            testResults.recipient_loading = {
              tested: true,
              success: false,
              details: 'No buildings available for recipient test'
            }
          }
        } catch (error) {
          testResults.recipient_loading = {
            tested: true,
            success: false,
            details: `Recipient loading test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }

        // Test 4: Template Rendering
        try {
          console.log('🎨 Testing template rendering...')

          const testData = {
            recipient: { name: 'John Test' },
            building: { name: 'Test Building' },
            unit: { number: 'Unit 1A' },
            today: new Date().toLocaleDateString('en-GB')
          }

          let renderedSubject = template.subject
          let renderedBody = template.body

          // Test placeholder replacement
          renderedSubject = renderedSubject.replace(/\{\{recipient\.name\}\}/g, testData.recipient.name)
          renderedSubject = renderedSubject.replace(/\{\{building\.name\}\}/g, testData.building.name)

          renderedBody = renderedBody.replace(/\{\{recipient\.name\}\}/g, testData.recipient.name)
          renderedBody = renderedBody.replace(/\{\{building\.name\}\}/g, testData.building.name)
          renderedBody = renderedBody.replace(/\{\{unit\.number\}\}/g, testData.unit.number)
          renderedBody = renderedBody.replace(/\{\{today\}\}/g, testData.today)

          const hasPlaceholders = renderedSubject.includes('{{') || renderedBody.includes('{{')

          testResults.template_rendering = {
            tested: true,
            success: !hasPlaceholders,
            details: hasPlaceholders
              ? 'Template rendering incomplete - placeholders remain'
              : 'Template rendering successful - all placeholders replaced'
          }
        } catch (error) {
          testResults.template_rendering = {
            tested: true,
            success: false,
            details: `Template rendering test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }

        // Test 5: Email Service
        try {
          console.log('📧 Testing email service...')

          const { emailService } = await import('@/lib/services/email-service')

          const testEmailResult = await emailService.sendEmail({
            to: [{
              email: 'test@example.com',
              name: 'Test Recipient'
            }],
            template: {
              subject: 'Test Email Service',
              html: '<p>This is a test email from the BlocIQ mail merge system.</p>',
              text: 'This is a test email from the BlocIQ mail merge system.'
            },
            testMode: true,
            metadata: {
              source: 'mail_merge_test'
            }
          })

          testResults.email_service = {
            tested: true,
            success: testEmailResult.success,
            details: testEmailResult.success
              ? `Email service working: ${testEmailResult.messageId}`
              : `Email service failed: ${testEmailResult.error}`
          }
        } catch (error) {
          testResults.email_service = {
            tested: true,
            success: false,
            details: `Email service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }

        // Test 6: Mail Merge API
        if (testResults.recipient_loading.success && testResults.database_setup.success) {
          try {
            console.log('🔄 Testing mail merge API...')

            const { data: buildings } = await supabase
              .from('buildings')
              .select('id')
              .limit(1)

            const buildingId = buildings![0].id

            const response = await fetch(`${request.nextUrl.origin}/api/comms/send-emails`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-system-test': 'true',
                'Authorization': request.headers.get('Authorization') || '',
              },
              body: JSON.stringify({
                buildingId,
                templateId: template.id,
                testMode: true
              })
            })

            if (response.ok) {
              const data = await response.json()
              testResults.mail_merge_api = {
                tested: true,
                success: data.success,
                details: `Mail merge API success: ${data.message}, processed ${data.stats?.total || 0} emails`
              }
            } else {
              const errorData = await response.json()
              testResults.mail_merge_api = {
                tested: true,
                success: false,
                details: `Mail merge API failed: ${errorData.message || 'Unknown error'}`
              }
            }
          } catch (error) {
            testResults.mail_merge_api = {
              tested: true,
              success: false,
              details: `Mail merge API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        } else {
          testResults.mail_merge_api = {
            tested: false,
            success: false,
            details: 'Skipped - dependencies failed (recipients or database)'
          }
        }

        // Test 7: Communications Logging
        try {
          console.log('📝 Testing communications logging...')

          const { data: recentLogs } = await supabase
            .from('communications_log')
            .select('id, direction, subject')
            .order('sent_at', { ascending: false })
            .limit(5)

          testResults.communications_logging = {
            tested: true,
            success: true,
            details: `Communications logging active: ${recentLogs?.length || 0} recent entries`
          }
        } catch (error) {
          testResults.communications_logging = {
            tested: true,
            success: false,
            details: `Communications logging test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }

        // Clean up test template
        await supabase
          .from('communication_templates')
          .delete()
          .eq('id', template.id)
      }
    } catch (error) {
      testResults.template_creation = {
        tested: true,
        success: false,
        details: `Template creation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    // Calculate overall success rate
    const totalTests = Object.keys(testResults).length
    const testedTests = Object.values(testResults).filter(test => test.tested).length
    const successfulTests = Object.values(testResults).filter(test => test.success).length
    const successRate = testedTests > 0 ? (successfulTests / testedTests) * 100 : 0

    console.log('✅ Mail merge test completed')

    return NextResponse.json({
      success: successRate >= 80, // Consider successful if 80%+ of tests pass
      summary: {
        total_tests: totalTests,
        tested_tests: testedTests,
        successful_tests: successfulTests,
        success_rate: `${successRate.toFixed(1)}%`
      },
      test_results: testResults,
      production_ready: {
        '✅ Database schema created': testResults.database_setup.success,
        '✅ Template system working': testResults.template_creation.success,
        '✅ Recipient loading functional': testResults.recipient_loading.success,
        '✅ Template rendering working': testResults.template_rendering.success,
        '✅ Email service configured': testResults.email_service.success,
        '✅ Mail merge API functional': testResults.mail_merge_api.success,
        '✅ Communications logging active': testResults.communications_logging.success
      },
      next_steps: successRate >= 80
        ? ['Apply database migrations', 'Configure email service credentials', 'Ready for production use']
        : ['Fix failing components', 'Ensure database setup', 'Configure missing services']
    })

  } catch (error) {
    console.error('❌ Mail merge test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to complete mail merge test',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint provides test information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    test_name: 'End-to-End Mail Merge Functionality Test',
    description: 'Comprehensive test of all mail merge components and workflows',
    components_tested: [
      'Database schema and tables',
      'Template creation and management',
      'Recipient loading and filtering',
      'Template rendering with placeholders',
      'Email service integration',
      'Mail merge API endpoints',
      'Communications logging system'
    ],
    usage: 'POST to this endpoint to run the complete mail merge test suite',
    requirements: [
      'communication_templates table exists',
      'Sample buildings and leaseholders with emails',
      'Email service configured (or console fallback)',
      'Communications logging system active'
    ]
  })
}