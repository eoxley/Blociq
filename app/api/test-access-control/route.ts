import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAccessProfile, enforceAddinAccessControl } from '@/lib/auth/addinAccessControl'

/**
 * Test API endpoint to verify add-in access control implementation
 *
 * Usage:
 * GET /api/test-access-control - Check current user's access profile
 * POST /api/test-access-control - Test access to various endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized - please authenticate first'
      }, { status: 401 })
    }

    // Get user's access profile
    const accessProfile = await getUserAccessProfile(user)

    // Test access to various endpoints
    const testEndpoints = [
      '/api/ask-ai',
      '/api/buildings',
      '/api/units',
      '/api/leaseholders',
      '/api/compliance',
      '/api/ask-ai-outlook'
    ]

    const endpointTests = await Promise.all(
      testEndpoints.map(async (endpoint) => {
        const result = await enforceAddinAccessControl(user, endpoint)
        return {
          endpoint,
          allowed: result.allowed,
          reason: result.reason
        }
      })
    )

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      accessProfile,
      endpointTests,
      summary: {
        userType: accessProfile.isAddinOnly ? 'Add-in Only User' : 'Full BlocIQ User',
        agencyAccess: accessProfile.hasAgencyAccess,
        allowedEndpointsCount: accessProfile.allowedEndpoints.length,
        restrictedEndpoints: endpointTests.filter(t => !t.allowed).length
      }
    })

  } catch (error) {
    console.error('Error in test-access-control:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized - please authenticate first'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, endpoint, testUserId } = body

    switch (action) {
      case 'test_endpoint':
        if (!endpoint) {
          return NextResponse.json({
            error: 'Missing endpoint parameter'
          }, { status: 400 })
        }

        const accessResult = await enforceAddinAccessControl(user, endpoint)

        return NextResponse.json({
          success: true,
          endpoint,
          allowed: accessResult.allowed,
          reason: accessResult.reason,
          userProfile: accessResult.accessProfile
        })

      case 'simulate_building_access':
        // Test direct database access (should be blocked by RLS for add-in users)
        try {
          const { data: buildings, error } = await supabase
            .from('buildings')
            .select('id, name, agency_id')
            .limit(5)

          return NextResponse.json({
            success: true,
            action: 'simulate_building_access',
            databaseAccessBlocked: !buildings || buildings.length === 0,
            error: error?.message,
            buildingsFound: buildings?.length || 0,
            note: 'If user is add-in only, this should return 0 buildings due to RLS policies'
          })
        } catch (dbError) {
          return NextResponse.json({
            success: true,
            action: 'simulate_building_access',
            databaseAccessBlocked: true,
            error: dbError instanceof Error ? dbError.message : 'Database access blocked',
            note: 'RLS policies successfully blocked add-in user from agency data'
          })
        }

      case 'create_test_user':
        // Create a test add-in user (admin only)
        const accessProfile = await getUserAccessProfile(user)

        if (accessProfile.isAddinOnly) {
          return NextResponse.json({
            error: 'Only full BlocIQ users can create test users'
          }, { status: 403 })
        }

        // Create test profile
        const { data: testProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: `test-${Date.now()}`,
            full_name: 'Test Add-in User',
            role: 'addin_user',
            addin_only: true
          })
          .select()
          .single()

        if (createError) {
          return NextResponse.json({
            error: 'Failed to create test user',
            details: createError.message
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          action: 'create_test_user',
          testUser: testProfile,
          note: 'Created test add-in user with restricted access'
        })

      default:
        return NextResponse.json({
          error: 'Invalid action. Available actions: test_endpoint, simulate_building_access, create_test_user'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in test-access-control POST:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}