import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const descriptionLower = description.toLowerCase();

    // Extract building name from description
    let buildingName = "";
    let buildingId = null;

    // First, get all buildings to search for matches
    const { data: buildings } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .order('name');

    if (buildings) {
      for (const building of buildings) {
        if (descriptionLower.includes(building.name.toLowerCase())) {
          buildingName = building.name;
          buildingId = building.id;
          break;
        }
      }
    }

    // Determine criteria from description
    let criteria = "";
    let whereClause = "";
    let additionalFilters = "";

    if (descriptionLower.includes("director")) {
      criteria = "Directors";
      whereClause = "l.is_director = true";
    } else if (descriptionLower.includes("leaseholder")) {
      criteria = "Leaseholders";
      whereClause = "l.id IS NOT NULL";
    } else if (descriptionLower.includes("resident")) {
      criteria = "Residents";
      whereClause = "l.id IS NOT NULL";
    } else if (descriptionLower.includes("owner")) {
      criteria = "Owners";
      whereClause = "l.id IS NOT NULL";
    } else {
      criteria = "All";
      whereClause = "l.id IS NOT NULL";
    }

    // Add building filter if specified
    if (buildingId) {
      additionalFilters = `AND u.building_id = '${buildingId}'`;
    }

    // Build the query to fetch members based on criteria
    let membersQuery = supabaseAdmin
      .from('units')
      .select(`
        id,
        unit_number,
        apportionment_percent,
        building_id,
        leaseholders (
          id,
          full_name,
          name,
          email,
          phone,
          is_director,
          director_role,
          director_since,
          director_notes
        ),
        buildings (
          id,
          name,
          address
        )
      `);

    // Apply filters
    if (buildingId) {
      membersQuery = membersQuery.eq('building_id', buildingId);
    }

    const { data: units, error } = await membersQuery;

    if (error) {
      console.error('Error fetching batch group members:', error);
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
    }

    // Process the results to match our criteria
    const members = [];
    for (const unit of units || []) {
      if (unit.leaseholders && unit.leaseholders.length > 0) {
        for (const leaseholder of unit.leaseholders) {
          // Apply criteria filter
          if (criteria === "Directors" && !leaseholder.is_director) {
            continue;
          }
          
          members.push({
            id: leaseholder.id,
            name: leaseholder.full_name || leaseholder.name || 'Unknown',
            email: leaseholder.email || '',
            phone: leaseholder.phone || '',
            is_director: leaseholder.is_director,
            director_role: leaseholder.director_role,
            director_since: leaseholder.director_since,
            director_notes: leaseholder.director_notes,
            unit_number: unit.unit_number || 'Unknown Unit',
            apportionment_percent: unit.apportionment_percent,
            building_name: unit.buildings?.name || 'Unknown Building',
            building_address: unit.buildings?.address || ''
          });
        }
      }
    }

    // Process members to add tags and format data
    const processedMembers = (members || []).map((member: any) => {
      const tags = [];
      
      if (member.is_director) {
        if (member.director_role) {
          tags.push(member.director_role);
        } else {
          tags.push("Director");
        }
      }

      return {
        id: member.id,
        name: member.name || 'Unknown',
        email: member.email || '',
        phone: member.phone || '',
        building_name: member.building_name || 'Unknown Building',
        unit_number: member.unit_number || 'Unknown Unit',
        apportionment_percent: member.apportionment_percent,
        tags,
        director_since: member.director_since,
        director_notes: member.director_notes
      };
    });

    // Generate group name
    const groupName = `${criteria} at ${buildingName || "Building"}`;

    return NextResponse.json({
      success: true,
      group: {
        name: groupName,
        criteria: `${criteria} in ${buildingName || "selected building"}`,
        members: processedMembers,
        totalCount: processedMembers.length
      }
    });

  } catch (error) {
    console.error('Error in batch group API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
