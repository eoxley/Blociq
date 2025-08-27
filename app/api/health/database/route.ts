import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking database health...');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    // Tables to check
    const tablesToCheck = [
      'users',
      'outlook_tokens',
      'building_compliance_assets',
      'communications',
      'buildings',
      'units'
    ];

    const healthResults: Record<string, any> = {};

    // Check each table
    for (const tableName of tablesToCheck) {
      try {
        console.log(`🔍 Checking table: ${tableName}`);
        
        // Try to access the table with a simple query
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          healthResults[tableName] = {
            accessible: false,
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          };
          
          // Log specific error details
          console.error(`❌ Table ${tableName} access error:`, {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        } else {
          healthResults[tableName] = {
            accessible: true,
            recordCount: count || 0,
            sampleData: data ? 'Available' : 'No data'
          };
          console.log(`✅ Table ${tableName} accessible`);
        }
      } catch (error) {
        healthResults[tableName] = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'Exception'
        };
        console.error(`❌ Exception accessing table ${tableName}:`, error);
      }
    }

    // Check RLS policies
    const rlsCheck = await checkRLSPolicies(supabase, tablesToCheck);

    // Summary
    const accessibleTables = Object.values(healthResults).filter(r => r.accessible).length;
    const totalTables = tablesToCheck.length;
    const overallHealth = accessibleTables === totalTables ? 'healthy' : 'degraded';

    console.log(`📊 Database health check complete: ${accessibleTables}/${totalTables} tables accessible`);

    return NextResponse.json({
      success: true,
      overallHealth,
      summary: {
        totalTables,
        accessibleTables,
        inaccessibleTables: totalTables - accessibleTables
      },
      tableHealth: healthResults,
      rlsPolicies: rlsCheck,
      recommendations: generateRecommendations(healthResults),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database health check error:', error);
    
    return NextResponse.json({
      error: 'Database health check failed',
      message: 'An unexpected error occurred while checking database health.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Check RLS policies for tables
 */
async function checkRLSPolicies(supabase: any, tableNames: string[]) {
  const rlsResults: Record<string, any> = {};

  for (const tableName of tableNames) {
    try {
      // Check if RLS is enabled
      const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity,
            CASE 
              WHEN rowsecurity THEN 'enabled'
              ELSE 'disabled'
            END as rls_status
          FROM pg_tables 
          WHERE tablename = '${tableName}'
        `
      });

      if (rlsError) {
        rlsResults[tableName] = {
          rlsEnabled: 'unknown',
          error: rlsError.message
        };
      } else {
        const tableInfo = rlsData?.[0];
        rlsResults[tableName] = {
          rlsEnabled: tableInfo?.rls_status || 'unknown',
          schema: tableInfo?.schemaname || 'unknown'
        };
      }

      // Check RLS policies
      const { data: policiesData, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = '${tableName}'
        `
      });

      if (policiesError) {
        rlsResults[tableName].policies = {
          error: policiesError.message
        };
      } else {
        rlsResults[tableName].policies = {
          count: policiesData?.length || 0,
          details: policiesData || []
        };
      }

    } catch (error) {
      rlsResults[tableName] = {
        rlsEnabled: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return rlsResults;
}

/**
 * Generate recommendations based on health results
 */
function generateRecommendations(healthResults: Record<string, any>): string[] {
  const recommendations: string[] = [];

  // Check for common issues
  const inaccessibleTables = Object.entries(healthResults)
    .filter(([_, result]) => !result.accessible)
    .map(([tableName, _]) => tableName);

  if (inaccessibleTables.length > 0) {
    recommendations.push(`Tables with access issues: ${inaccessibleTables.join(', ')}`);
  }

  // Check for RLS-related errors
  const rlsErrors = Object.entries(healthResults)
    .filter(([_, result]) => !result.accessible && result.error?.includes('permission'))
    .map(([tableName, _]) => tableName);

  if (rlsErrors.length > 0) {
    recommendations.push(`RLS policy issues detected for: ${rlsErrors.join(', ')}`);
    recommendations.push('Check Row Level Security policies and user permissions');
  }

  // Check for missing tables
  const missingTables = Object.entries(healthResults)
    .filter(([_, result]) => !result.accessible && result.error?.includes('relation'))
    .map(([tableName, _]) => tableName);

  if (missingTables.length > 0) {
    recommendations.push(`Missing tables: ${missingTables.join(', ')}`);
    recommendations.push('Run database migrations to create missing tables');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('All tables are accessible - database appears healthy');
  } else {
    recommendations.push('Review Supabase logs for detailed error information');
    recommendations.push('Verify environment variables and database configuration');
  }

  return recommendations;
}
