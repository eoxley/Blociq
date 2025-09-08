require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInboxDashboard() {
  try {
    console.log('🔍 Testing inbox dashboard data...');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError?.message);
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    console.log('👤 User ID:', user.id);
    
    // Check agency membership
    console.log('\n🏢 Checking agency membership...');
    const { data: agencyMember, error: agencyError } = await supabase
      .from('agency_members')
      .select('agency_id, role, agencies:agency_id (name, slug)')
      .eq('user_id', user.id)
      .single();
    
    if (agencyError) {
      console.error('❌ Agency membership error:', agencyError);
    } else {
      console.log('✅ Agency membership:', agencyMember.agencies?.name, '(', agencyMember.role, ')');
    }
    
    // Check incoming_emails table
    console.log('\n📧 Checking incoming_emails table...');
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('is_deleted', false)
      .order('received_at', { ascending: false })
      .limit(10);
    
    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
    } else {
      console.log('✅ Emails found:', emails?.length || 0);
      if (emails && emails.length > 0) {
        console.log('Sample email:');
        console.log('  - Subject:', emails[0].subject);
        console.log('  - From:', emails[0].from_email);
        console.log('  - Received:', emails[0].received_at);
        console.log('  - Read:', emails[0].is_read);
        console.log('  - Urgency:', emails[0].urgency_level);
        console.log('  - AI Tag:', emails[0].ai_tag);
      }
    }
    
    // Check buildings table
    console.log('\n🏠 Checking buildings table...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, agency_id')
      .limit(5);
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError);
    } else {
      console.log('✅ Buildings found:', buildings?.length || 0);
      buildings?.forEach(building => {
        console.log(`  - ${building.name} (${building.id}) - Agency: ${building.agency_id}`);
      });
    }
    
    // Test the dashboard API endpoint
    console.log('\n🌐 Testing dashboard API endpoint...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/inbox/dashboard?timeRange=week`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Dashboard API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dashboard API success:', data.success);
        console.log('📊 Dashboard data:', {
          total: data.data?.total || 0,
          unread: data.data?.unread || 0,
          handled: data.data?.handled || 0,
          urgent: data.data?.urgent || 0,
          dataSource: data.dataSource,
          emailCount: data.emailCount
        });
        
        if (data.data?.categories) {
          console.log('📂 Categories:', Object.keys(data.data.categories).length);
          Object.entries(data.data.categories).forEach(([category, stats]) => {
            console.log(`  - ${category}: ${stats.count} emails`);
          });
        }
        
        if (data.data?.propertyBreakdown) {
          console.log('🏠 Properties:', Object.keys(data.data.propertyBreakdown).length);
          Object.entries(data.data.propertyBreakdown).forEach(([property, stats]) => {
            console.log(`  - ${property}: ${stats.count} emails`);
          });
        }
        
      } else {
        const errorData = await response.json();
        console.error('❌ Dashboard API error:', errorData);
      }
    } catch (apiError) {
      console.error('❌ Dashboard API request failed:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testInboxDashboard();