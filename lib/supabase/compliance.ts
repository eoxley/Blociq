import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getComplianceContext(buildingId: string) {
  try {
    const { data, error } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        last_renewed_date,
        next_due_date,
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        )
      `)
      .eq('building_id', buildingId)
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Error fetching compliance context:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return 'No compliance assets found for this building.';
    }

    const complianceContext = data.map(asset => {
      const assetInfo = asset.compliance_assets;
      const dueDate = asset.next_due_date ? new Date(asset.next_due_date).toLocaleDateString() : 'Not set';
      const status = asset.status || 'Unknown';
      
      return `${assetInfo?.name || 'Unknown Asset'} (${assetInfo?.category || 'Unknown Category'}): ${status}, Due: ${dueDate}`;
    }).join('\n');

    return complianceContext;
  } catch (error) {
    console.error('Error in getComplianceContext:', error);
    return null;
  }
} 