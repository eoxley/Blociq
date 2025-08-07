import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getComplianceContext(buildingId: string) {
  try {
    const today = new Date();
    
    // Fetch building compliance assets with detailed information
    const { data: buildingAssets, error } = await supabase
      .from('building_assets')
      .select(`
        *,
        compliance_items (
          id,
          item_type,
          category,
          frequency,
          assigned_to,
          notes
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .eq('applies', true)
      .order('next_due', { ascending: true });

    if (error) {
      console.error('Error fetching compliance context:', error);
      return null;
    }

    if (!buildingAssets || buildingAssets.length === 0) {
      return 'No compliance assets found for this building.';
    }

    // Calculate compliance status and categorize items
    const overdueItems: string[] = [];
    const dueSoonItems: string[] = [];
    const compliantItems: string[] = [];
    const missingItems: string[] = [];

    buildingAssets.forEach(asset => {
      const complianceItem = asset.compliance_items;
      const itemName = complianceItem?.item_type || 'Unknown Asset';
      const category = complianceItem?.category || 'General';
      
      let status = 'missing';
      let daysUntilDue = null;
      
      if (asset.next_due) {
        const dueDate = new Date(asset.next_due);
        daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 30) {
          status = 'due_soon';
        } else {
          status = 'compliant';
        }
      }

      const statusText = asset.last_checked ? 
        `${status} (Last checked: ${new Date(asset.last_checked).toLocaleDateString()})` : 
        status;

      const itemInfo = `${itemName} (${category}): ${statusText}`;
      
      if (asset.next_due) {
        const dueDate = new Date(asset.next_due).toLocaleDateString();
        const itemWithDate = `${itemInfo}, Due: ${dueDate}`;
        
        switch (status) {
          case 'overdue':
            overdueItems.push(itemWithDate);
            break;
          case 'due_soon':
            dueSoonItems.push(itemWithDate);
            break;
          case 'compliant':
            compliantItems.push(itemWithDate);
            break;
          default:
            missingItems.push(itemWithDate);
        }
      } else {
        missingItems.push(itemInfo);
      }
    });

    // Build comprehensive compliance context
    let complianceContext = 'LIVE COMPLIANCE STATUS:\n\n';
    
    if (overdueItems.length > 0) {
      complianceContext += `🚨 OVERDUE ITEMS:\n${overdueItems.join('\n')}\n\n`;
    }
    
    if (dueSoonItems.length > 0) {
      complianceContext += `⚠️ DUE SOON (Next 30 days):\n${dueSoonItems.join('\n')}\n\n`;
    }
    
    if (compliantItems.length > 0) {
      complianceContext += `✅ COMPLIANT ITEMS:\n${compliantItems.join('\n')}\n\n`;
    }
    
    if (missingItems.length > 0) {
      complianceContext += `❓ MISSING/UNKNOWN STATUS:\n${missingItems.join('\n')}\n\n`;
    }

    // Add summary statistics
    const totalItems = buildingAssets.length;
    const overdueCount = overdueItems.length;
    const dueSoonCount = dueSoonItems.length;
    const compliantCount = compliantItems.length;
    
    complianceContext += `SUMMARY: ${totalItems} total items - ${overdueCount} overdue, ${dueSoonCount} due soon, ${compliantCount} compliant`;

    return complianceContext;
  } catch (error) {
    console.error('Error in getComplianceContext:', error);
    return null;
  }
} 