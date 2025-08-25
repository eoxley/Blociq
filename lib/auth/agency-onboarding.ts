import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Automatically links a user to an agency based on their email domain
 * This function should be called after user authentication
 */
export async function linkUserToAgency(userId: string, email: string) {
  const supabase = createClientComponentClient();
  
  try {
    // Extract domain from email
    const domain = email.split('@')[1];
    
    if (!domain) {
      console.error('Invalid email format');
      return { success: false, error: 'Invalid email format' };
    }

    // Find agency by domain
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('domain', domain)
      .single();

    if (agencyError || !agency) {
      console.log(`No agency found for domain: ${domain}`);
      return { success: false, error: 'No agency found for this domain' };
    }

    // Update user's agency_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ agency_id: agency.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user agency:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`User ${userId} linked to agency: ${agency.name}`);
    return { 
      success: true, 
      agency: { id: agency.id, name: agency.name, domain } 
    };

  } catch (error) {
    console.error('Error in linkUserToAgency:', error);
    return { success: false, error: 'Failed to link user to agency' };
  }
}

/**
 * Gets the current user's agency information
 */
export async function getUserAgency() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        agency_id,
        agencies (
          id,
          name,
          domain
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { success: false, error: 'User profile not found' };
    }

    if (!userProfile.agency_id) {
      return { success: false, error: 'User not linked to any agency' };
    }

    return { 
      success: true, 
      agency: userProfile.agencies 
    };

  } catch (error) {
    console.error('Error in getUserAgency:', error);
    return { success: false, error: 'Failed to get user agency' };
  }
}

/**
 * Checks if a user has access to a specific agency
 */
export async function checkUserAgencyAccess(agencyId: string) {
  const userAgency = await getUserAgency();
  
  if (!userAgency.success) {
    return false;
  }

  return userAgency.agency?.id === agencyId;
}

/**
 * Gets all users in the same agency as the current user
 */
export async function getAgencyUsers() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.agency_id) {
      return { success: false, error: 'User not linked to any agency' };
    }

    const { data: agencyUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at
      `)
      .eq('agency_id', userProfile.agency_id)
      .order('created_at', { ascending: false });

    if (usersError) {
      return { success: false, error: usersError.message };
    }

    return { success: true, users: agencyUsers || [] };

  } catch (error) {
    console.error('Error in getAgencyUsers:', error);
    return { success: false, error: 'Failed to get agency users' };
  }
}

/**
 * Creates a new agency (admin only)
 */
export async function createAgency(name: string, domain: string) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: agency, error } = await supabase
      .from('agencies')
      .insert({
        name,
        domain
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, agency };

  } catch (error) {
    console.error('Error in createAgency:', error);
    return { success: false, error: 'Failed to create agency' };
  }
}

/**
 * Gets all agencies (admin only)
 */
export async function getAllAgencies() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: agencies, error } = await supabase
      .from('agencies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, agencies: agencies || [] };

  } catch (error) {
    console.error('Error in getAllAgencies:', error);
    return { success: false, error: 'Failed to get agencies' };
  }
}
