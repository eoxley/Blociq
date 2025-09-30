const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOutlook() {
  try {
    console.log('Checking Outlook tokens...');
    
    // Get user ID
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    const userId = users[0].id;
    console.log('User:', users[0].email);
    
    // Check outlook_tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', userId);
    
    console.log('Outlook tokens:', tokens);
    if (tokenError) console.error('Token error:', tokenError);
    
    // Check calendar_events
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);
    
    console.log('Calendar events:', events);
    if (eventsError) console.error('Events error:', eventsError);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOutlook();
