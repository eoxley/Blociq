import { NextResponse } from 'next/server';
import { getDatabaseHealth, ensureRequiredTables } from '@/lib/database-setup';

export async function GET() {
  try {
    console.log('🔍 Database health check requested');
    
    // Ensure required tables exist
    const tableSetup = await ensureRequiredTables();
    console.log('📋 Table setup result:', tableSetup);
    
    // Get comprehensive database health
    const health = await getDatabaseHealth();
    console.log('🏥 Database health status:', health);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: health,
      tableSetup: tableSetup,
      recommendations: getRecommendations(health, tableSetup)
    });
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Database health check failed',
      message: String(error)
    }, { status: 500 });
  }
}

function getRecommendations(health: any, tableSetup: any): string[] {
  const recommendations: string[] = [];
  
  if (!health.healthy) {
    recommendations.push('Some required database tables are missing');
  }
  
  if (!tableSetup.communicationsLog) {
    recommendations.push('communications_log table needs to be created');
  }
  
  if (!tableSetup.buildingComplianceAssets) {
    recommendations.push('building_compliance_assets table needs to be created');
  }
  
  if (health.tables.buildings && health.tables.buildings.rowCount === 0) {
    recommendations.push('No buildings found - consider adding your first building');
  }
  
  if (health.tables.users && health.tables.users.rowCount === 0) {
    recommendations.push('No users found - authentication may not be set up');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Database appears to be healthy and properly configured');
  }
  
  return recommendations;
}
