import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { searchBuildingAndUnits, searchLeaseholderDirect } from '../../../lib/supabase/buildingSearch';
import { searchEntireDatabase, formatSearchResultsForAI, extractRelevantContext } from '../../../lib/supabase/comprehensiveDataSearch';
import { withOutlookSubscription } from '@/lib/outlook-subscription-middleware';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// CORS headers for Outlook Add-in compatibility
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper function to create response with CORS headers
function createResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS
  });
}

export async function OPTIONS(req: NextRequest) {
  // Handle preflight requests for Outlook Add-in
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

/**
 * BLOCIQ OUTLOOK AI
 *
 * Full BlocIQ system with complete database access including buildings,
 * leaseholders, compliance data, documents, and all internal systems.
 */
async function handleBlocIQOutlookAI(req: NextRequest) {
  try {
    console.log('🏢 BlocIQ Outlook AI: Processing request with full database access');

    // Parse request body
    const body = await req.json();
    const {
      question,
      building,
      unit,
      contextType,
      is_outlook_addin,
      email_subject,
      email_body,
      sender_info,
      recipient_info,
      compliance_context,
      leaseholder_context,
      diary_context
    } = body;

    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return createResponse({
        ok: false,
        error: 'Missing or invalid question'
      }, 400);
    }

    // Get user email from header
    const email = req.headers.get('x-user-email');
    if (!email) {
      return createResponse({
        ok: false,
        error: 'No email provided in X-User-Email header'
      }, 401);
    }

    console.log('👤 Looking up user:', email);

    // Look up or create user in Supabase users table
    let { data: user, error: userLookupError } = await supabaseAdmin
      .from('users')
      .select('id, email, agency_id, first_name, last_name')
      .eq('email', email)
      .single();

    if (userLookupError && userLookupError.code === 'PGRST116') {
      // User doesn't exist, create new one
      console.log('➕ Creating new user for:', email);

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          role: 'manager',
          first_name: email.split('@')[0], // Use email prefix as first name
          created_at: new Date().toISOString()
        })
        .select('id, email, agency_id, first_name, last_name')
        .single();

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        return createResponse({
          ok: false,
          error: 'Failed to create user account'
        }, 500);
      }

      user = newUser;
    } else if (userLookupError) {
      console.error('❌ User lookup error:', userLookupError);
      return createResponse({
        ok: false,
        error: 'Failed to lookup user'
      }, 500);
    }

    if (!user) {
      return createResponse({
        ok: false,
        error: 'User not found and could not be created'
      }, 500);
    }

    const userId = user.id;
    const agencyId = user.agency_id;
    const userFirstName = user.first_name || user.email?.split('@')[0] || 'Eleanor';

    console.log('✅ User found/created:', { userId, agencyId, userFirstName });

    // Building lookup
    let buildingObj: { id: string; name: string; address?: string } | null = null;

    if (building && building.trim().length > 0) {
      console.log('🏢 Looking up building:', building);

      // Check if building looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(building.trim());

      if (isUUID) {
        // Direct UUID lookup
        const { data: directBuilding } = await supabaseAdmin
          .from('buildings')
          .select('id, name, address')
          .eq('id', building.trim())
          .eq('agency_id', agencyId) // Scope by agency
          .single();

        buildingObj = directBuilding || null;
      } else {
        // Fuzzy name matching for agency
        const { data: fuzzyBuildings } = await supabaseAdmin
          .from('buildings')
          .select('id, name, address')
          .eq('agency_id', agencyId) // Scope by agency
          .ilike('name', `%${building.trim()}%`)
          .limit(5);

        // Take the first match (could be improved with better scoring)
        buildingObj = fuzzyBuildings?.[0] || null;
      }

      if (buildingObj) {
        console.log('✅ Building found:', buildingObj.name);
      } else {
        console.log('❌ Building not found for:', building);
      }
    }

    // Unit lookup and leaseholders
    let units: Array<{ id: string; unit_number: string; unit_label?: string }> = [];
    let leaseholders: Array<{ name: string; email?: string; phone?: string }> = [];

    if (buildingObj && unit && unit.trim().length > 0) {
      console.log('🏠 Looking up units for:', unit, 'in building:', buildingObj.name);

      // Search for units with flexible matching
      const unitSearchTerm = unit.trim();
      const { data: foundUnits } = await supabaseAdmin
        .from('units')
        .select('id, unit_number')
        .eq('building_id', buildingObj.id)
        .or(`unit_number.ilike.%${unitSearchTerm}%,unit_number.eq.${unitSearchTerm},unit_number.eq.Flat ${unitSearchTerm},unit_number.eq.${unitSearchTerm}A,unit_number.eq.${unitSearchTerm}B`)
        .limit(10);

      units = foundUnits?.map(u => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_label: u.unit_number
      })) || [];

      console.log('🏠 Found units:', units.length);

      // If we found units, get leaseholders
      if (units.length > 0) {
        const unitIds = units.map(u => u.id);

        const { data: foundLeaseholders } = await supabaseAdmin
          .from('leaseholders')
          .select('name, email, phone, unit_id')
          .in('unit_id', unitIds);

        leaseholders = foundLeaseholders?.map(lh => ({
          name: lh.name,
          email: lh.email,
          phone: lh.phone
        })) || [];

        console.log('👥 Found leaseholders:', leaseholders.length);
      }
    }

    // 🚀 PHASE 2: PROACTIVE COMPLIANCE INTEGRATION
    let compliance: any = null;
    let upcomingDeadlines: any[] = [];
    let riskAssessment: any = null;
    let complianceAlerts: any[] = [];

    if (buildingObj) {
      console.log('⚠️ Fetching comprehensive compliance data for building:', buildingObj.id);

      try {
        // Get current compliance status
        const { data: complianceData, error: complianceError } = await supabaseAdmin
          .rpc('get_building_compliance_summary', {
            p_building_id: buildingObj.id
          });

        if (complianceError) {
          console.warn('⚠️ Compliance summary function not available:', complianceError);
          // Enhanced fallback with proactive filtering
          const { data: fallbackCompliance } = await supabaseAdmin
            .from('compliance_items')
            .select('item_name, status, due_date, priority, compliance_type, last_updated')
            .eq('building_id', buildingObj.id)
            .order('due_date', { ascending: true })
            .limit(15);

          compliance = fallbackCompliance;
        } else {
          compliance = complianceData;
        }

        // 🎯 PROACTIVE DEADLINE MONITORING
        if (compliance && Array.isArray(compliance)) {
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

          upcomingDeadlines = compliance
            .filter(item => {
              if (!item.due_date) return false;
              const dueDate = new Date(item.due_date);
              return dueDate >= now && dueDate <= ninetyDaysFromNow;
            })
            .map(item => {
              const dueDate = new Date(item.due_date);
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return {
                ...item,
                days_until_due: daysUntilDue,
                urgency: daysUntilDue <= 14 ? 'critical' : daysUntilDue <= 30 ? 'high' : 'medium'
              };
            })
            .sort((a, b) => a.days_until_due - b.days_until_due);

          // 🚨 COMPLIANCE RISK ASSESSMENT
          const overdueItems = compliance.filter(item => {
            if (!item.due_date) return false;
            return new Date(item.due_date) < now;
          });

          const criticalItems = upcomingDeadlines.filter(item => item.urgency === 'critical');

          riskAssessment = {
            risk_level: overdueItems.length > 0 ? 'high' :
                       criticalItems.length > 2 ? 'medium' :
                       upcomingDeadlines.length > 5 ? 'low' : 'minimal',
            overdue_count: overdueItems.length,
            critical_count: criticalItems.length,
            total_upcoming: upcomingDeadlines.length
          };

          // 📢 SMART COMPLIANCE ALERTS
          complianceAlerts = [];

          if (overdueItems.length > 0) {
            complianceAlerts.push({
              type: 'overdue',
              severity: 'critical',
              message: `${overdueItems.length} compliance item(s) overdue`,
              items: overdueItems.slice(0, 3) // Show top 3 most overdue
            });
          }

          if (criticalItems.length > 0) {
            complianceAlerts.push({
              type: 'urgent_deadline',
              severity: 'high',
              message: `${criticalItems.length} critical deadline(s) within 14 days`,
              items: criticalItems
            });
          }

          // 🔍 ISSUE-SPECIFIC COMPLIANCE CHECKS
          if (isSafetyIssue) {
            const safetyCompliance = compliance.filter(item =>
              item.compliance_type?.toLowerCase().includes('fire') ||
              item.compliance_type?.toLowerCase().includes('safety') ||
              item.compliance_type?.toLowerCase().includes('gas') ||
              item.compliance_type?.toLowerCase().includes('electrical')
            );

            if (safetyCompliance.length > 0) {
              complianceAlerts.push({
                type: 'safety_related',
                severity: 'high',
                message: 'Relevant safety compliance items found',
                items: safetyCompliance.slice(0, 3)
              });
            }
          }

          if (isServiceChargeIssue) {
            const upcomingMajorWorks = compliance.filter(item =>
              item.compliance_type?.toLowerCase().includes('works') ||
              item.item_name?.toLowerCase().includes('section 20') ||
              item.item_name?.toLowerCase().includes('major works')
            );

            if (upcomingMajorWorks.length > 0) {
              complianceAlerts.push({
                type: 'major_works',
                severity: 'medium',
                message: 'Upcoming major works may affect service charges',
                items: upcomingMajorWorks
              });
            }
          }
        }

        console.log('✅ Proactive compliance analysis completed:', {
          total_items: compliance?.length || 0,
          upcoming_deadlines: upcomingDeadlines.length,
          risk_level: riskAssessment?.risk_level,
          alerts: complianceAlerts.length
        });

      } catch (error) {
        console.warn('⚠️ Failed to fetch compliance data:', error);
        compliance = null;
      }
    }

    // Perform comprehensive database search for building context and industry knowledge
    console.log('🔍 Performing comprehensive database search for enhanced context');
    let comprehensiveContext = '';
    let industryKnowledge = '';
    let founderGuidance = '';
    let leaseDocuments = '';

    try {
      // Search using the question content plus email context for better results
      const searchQuery = `${question} ${email_subject || ''} ${email_body?.substring(0, 200) || ''}`.trim();

      const searchResults = await searchEntireDatabase(searchQuery, userId);

      if (searchResults) {
        // Extract relevant context using smart filtering
        const relevantContext = extractRelevantContext(searchResults, searchQuery);
        comprehensiveContext = relevantContext;

        // Extract lease documents specifically for this building
        if (buildingObj && searchResults.documents && searchResults.documents.length > 0) {
          const buildingLeaseDocuments = searchResults.documents.filter(doc =>
            doc.building_id === buildingObj.id &&
            (doc.type?.toLowerCase().includes('lease') ||
             doc.file_name?.toLowerCase().includes('lease') ||
             doc.text_content?.toLowerCase().includes('subletting') ||
             doc.text_content?.toLowerCase().includes('sub-let'))
          );

          if (buildingLeaseDocuments.length > 0) {
            leaseDocuments = buildingLeaseDocuments
              .slice(0, 2) // Limit to most relevant lease docs
              .map(doc => `LEASE DOCUMENT: ${doc.file_name}\nContent: ${doc.text_content?.substring(0, 1000) || 'Content not available'}`)
              .join('\n\n');
            console.log('📋 Found lease documents for building:', buildingLeaseDocuments.length);
          }
        }

        // Extract industry knowledge specifically
        if (searchResults.industryKnowledge && searchResults.industryKnowledge.length > 0) {
          industryKnowledge = searchResults.industryKnowledge
            .slice(0, 3) // Limit to most relevant
            .map(item => `- ${item.title || item.content || item.knowledge}`)
            .join('\n');
        }

        // Extract founder guidance
        if (searchResults.founderKnowledge && searchResults.founderKnowledge.length > 0) {
          founderGuidance = searchResults.founderKnowledge
            .slice(0, 2) // Limit to most relevant
            .map(item => `- ${item.guidance || item.content || item.knowledge}`)
            .join('\n');
        }

        console.log('✅ Database search completed:', {
          comprehensiveResults: !!comprehensiveContext,
          industryKnowledge: !!industryKnowledge,
          founderGuidance: !!founderGuidance,
          leaseDocuments: !!leaseDocuments
        });
      }
    } catch (searchError) {
      console.warn('⚠️ Comprehensive search failed:', searchError);
      // Continue without enhanced context
    }

    // Build context for AI prompt
    const contextLines: string[] = [];

    if (buildingObj) {
      contextLines.push(`Building: ${buildingObj.name}${buildingObj.address ? ` (${buildingObj.address})` : ''}`);
    }

    if (units.length > 0) {
      contextLines.push(`Units found: ${units.map(u => u.unit_number).join(', ')}`);
    }

    if (leaseholders.length > 0) {
      contextLines.push(`Leaseholders: ${leaseholders.map(lh => {
        let info = lh.name;
        if (lh.email) info += ` (${lh.email})`;
        return info;
      }).join(', ')}`);
    }

    if (compliance && Array.isArray(compliance) && compliance.length > 0) {
      const complianceItems = compliance.slice(0, 5).map(item =>
        `${item.item_name}: ${item.status}${item.due_date ? ` (due: ${item.due_date})` : ''}`
      );
      contextLines.push(`Compliance status: ${complianceItems.join(', ')}`);
    }

    // Create reply-specific AI prompt
    const emailContextInfo = [];
    if (email_subject) emailContextInfo.push(`Email Subject: ${email_subject}`);
    if (email_body) emailContextInfo.push(`Email Content: ${email_body.substring(0, 500)}`);
    if (sender_info?.name) emailContextInfo.push(`From: ${sender_info.name}${sender_info.email ? ` (${sender_info.email})` : ''}`);

    // Extract sender's name from the email content for personalized salutation
    let senderName = 'Resident';

    console.log('🔍 Extracting sender name from:', {
      sender_info_name: sender_info?.name,
      sender_info_email: sender_info?.email,
      email_body_preview: email_body?.substring(0, 100)
    });

    if (sender_info?.name && sender_info.name !== 'Unknown Sender') {
      // Extract first name from full name
      const nameParts = sender_info.name.trim().split(' ');
      senderName = nameParts[0];
      console.log('✅ Extracted sender name from sender_info:', senderName);
    } else if (email_body) {
      // Try to extract name from various sign-off patterns
      const signOffPatterns = [
        /Many thanks,?\s*([A-Z][a-z]+)/i,
        /(?:thanks|regards|sincerely),?\s*([A-Z][a-z]+)/i,
        /^([A-Z][a-z]+)\s*$/m,
        /Best regards,?\s*([A-Z][a-z]+)/i,
        /Kind regards,?\s*([A-Z][a-z]+)/i,
        /Yours,?\s*([A-Z][a-z]+)/i,
        /From[:\s]+([A-Z][a-z]+)/i
      ];

      for (const pattern of signOffPatterns) {
        const match = email_body.match(pattern);
        if (match && match[1]) {
          senderName = match[1];
          console.log('✅ Extracted sender name from email body:', senderName, 'using pattern:', pattern);
          break;
        }
      }

      if (senderName === 'Resident') {
        console.log('⚠️ Could not extract sender name, using default');
      }
    }

    // Extract issue summary for thank you line
    let issueSummary = 'your email';
    if (email_subject) {
      // Clean up subject line for thank you message
      let cleanSubject = email_subject.replace(/^(re:|fwd?:)/i, '').trim();
      cleanSubject = cleanSubject.toLowerCase();
      if (cleanSubject.includes('clean')) issueSummary = 'the cleaning of the building';
      else if (cleanSubject.includes('repair') || cleanSubject.includes('maintenance')) issueSummary = 'the maintenance issue';
      else if (cleanSubject.includes('noise')) issueSummary = 'the noise concerns';
      else if (cleanSubject.includes('heat') || cleanSubject.includes('boiler')) issueSummary = 'the heating issue';
      else if (cleanSubject.includes('service charge') || cleanSubject.includes('billing')) issueSummary = 'the service charge enquiry';
      else if (cleanSubject.includes('leak') || cleanSubject.includes('water') || cleanSubject.includes('ingress') || cleanSubject.includes('ceiling') || cleanSubject.includes('damp')) issueSummary = 'the water ingress issue';
      else issueSummary = cleanSubject;
    }

    // 🚀 PHASE 1: INTELLIGENT MULTI-ISSUE DETECTION
    const emailContent = `${email_subject || ''} ${email_body || ''}`.toLowerCase();

    // 1. URGENCY & SENTIMENT ANALYSIS
    const urgencyLevel = emailContent.includes('emergency') || emailContent.includes('urgent') ||
                        emailContent.includes('flooding') || emailContent.includes('burst') ||
                        emailContent.includes('immediately') || emailContent.includes('asap') ||
                        emailContent.includes('critical') || emailContent.includes('serious') ? 'high' :
                        emailContent.includes('soon') || emailContent.includes('quickly') ||
                        emailContent.includes('prompt') ? 'medium' : 'normal';

    const sentiment = emailContent.includes('frustrated') || emailContent.includes('annoyed') ||
                     emailContent.includes('unacceptable') || emailContent.includes('angry') ||
                     emailContent.includes('disappointed') || emailContent.includes('fed up') ||
                     emailContent.includes('disgusted') || emailContent.includes('appalling') ? 'negative' :
                     emailContent.includes('thank') || emailContent.includes('appreciate') ||
                     emailContent.includes('grateful') || emailContent.includes('pleased') ? 'positive' : 'neutral';

    // 2. COMPREHENSIVE ISSUE TYPE DETECTION

    // A) LEAK/WATER ISSUES (Enhanced)
    const isLeakIssue = emailContent.includes('leak') ||
                       emailContent.includes('water ingress') ||
                       emailContent.includes('ceiling leak') ||
                       emailContent.includes('dripping') ||
                       emailContent.includes('drip') ||
                       emailContent.includes('escape of water') ||
                       emailContent.includes('water escape') ||
                       emailContent.includes('damp') ||
                       emailContent.includes('wet') ||
                       emailContent.includes('water damage') ||
                       emailContent.includes('flooding') ||
                       emailContent.includes('seepage') ||
                       emailContent.includes('penetrating damp') ||
                       emailContent.includes('rising damp') ||
                       emailContent.includes('condensation') ||
                       emailContent.includes('mould') ||
                       emailContent.includes('mold') ||
                       emailContent.includes('water stain') ||
                       emailContent.includes('water mark') ||
                       emailContent.includes('ceiling stain') ||
                       emailContent.includes('wall stain') ||
                       emailContent.includes('burst pipe') ||
                       emailContent.includes('pipe burst') ||
                       emailContent.includes('plumbing leak') ||
                       emailContent.includes('tap leak') ||
                       emailContent.includes('toilet leak') ||
                       emailContent.includes('shower leak') ||
                       emailContent.includes('bath leak') ||
                       emailContent.includes('water coming through') ||
                       emailContent.includes('water dripping') ||
                       emailContent.includes('water running') ||
                       // Specific property management terms
                       emailContent.includes('flat above leaking') ||
                       emailContent.includes('neighbour leak') ||
                       emailContent.includes('upstairs leak') ||
                       emailContent.includes('radiator leak') ||
                       emailContent.includes('heating leak') ||
                       emailContent.includes('boiler leak') ||
                       // Building-specific water issues
                       emailContent.includes('roof leak') ||
                       emailContent.includes('gutter leak') ||
                       emailContent.includes('window leak') ||
                       emailContent.includes('balcony leak');

    // B) SERVICE CHARGE & BILLING ISSUES
    const isServiceChargeIssue = emailContent.includes('service charge') ||
                               emailContent.includes('billing') ||
                               emailContent.includes('invoice') ||
                               emailContent.includes('payment') ||
                               emailContent.includes('section 20') ||
                               emailContent.includes('s20') ||
                               emailContent.includes('major works') ||
                               emailContent.includes('consultation') ||
                               emailContent.includes('estimate') ||
                               emailContent.includes('contractor') ||
                               emailContent.includes('reserve fund') ||
                               emailContent.includes('sinking fund') ||
                               emailContent.includes('budget') ||
                               emailContent.includes('accounts') ||
                               emailContent.includes('expenditure');

    // C) NOISE COMPLAINTS
    const isNoiseIssue = emailContent.includes('noise') ||
                        emailContent.includes('loud') ||
                        emailContent.includes('music') ||
                        emailContent.includes('party') ||
                        emailContent.includes('shouting') ||
                        emailContent.includes('banging') ||
                        emailContent.includes('footsteps') ||
                        emailContent.includes('television') ||
                        emailContent.includes('tv') ||
                        emailContent.includes('stereo') ||
                        emailContent.includes('disturbing') ||
                        emailContent.includes('antisocial') ||
                        emailContent.includes('neighbours') ||
                        emailContent.includes('upstairs') ||
                        emailContent.includes('next door');

    // D) BUILDING SAFETY & FIRE ISSUES
    const isSafetyIssue = emailContent.includes('fire') ||
                         emailContent.includes('safety') ||
                         emailContent.includes('alarm') ||
                         emailContent.includes('evacuation') ||
                         emailContent.includes('fire door') ||
                         emailContent.includes('fire exit') ||
                         emailContent.includes('smoke') ||
                         emailContent.includes('carbon monoxide') ||
                         emailContent.includes('gas') ||
                         emailContent.includes('electrical') ||
                         emailContent.includes('asbestos') ||
                         emailContent.includes('building safety act') ||
                         emailContent.includes('bsa') ||
                         emailContent.includes('responsible person') ||
                         emailContent.includes('fire risk assessment') ||
                         emailContent.includes('fra');

    // E) MAINTENANCE & REPAIRS
    const isMaintenanceIssue = emailContent.includes('repair') ||
                              emailContent.includes('maintenance') ||
                              emailContent.includes('broken') ||
                              emailContent.includes('fault') ||
                              emailContent.includes('not working') ||
                              emailContent.includes('damaged') ||
                              emailContent.includes('replacement') ||
                              emailContent.includes('lift') ||
                              emailContent.includes('elevator') ||
                              emailContent.includes('heating') ||
                              emailContent.includes('boiler') ||
                              emailContent.includes('hot water') ||
                              emailContent.includes('lighting') ||
                              emailContent.includes('door') ||
                              emailContent.includes('window') ||
                              emailContent.includes('communal');

    // F) PARKING & ACCESS ISSUES
    const isParkingIssue = emailContent.includes('parking') ||
                          emailContent.includes('car park') ||
                          emailContent.includes('garage') ||
                          emailContent.includes('vehicle') ||
                          emailContent.includes('access') ||
                          emailContent.includes('gate') ||
                          emailContent.includes('barrier') ||
                          emailContent.includes('fob') ||
                          emailContent.includes('key') ||
                          emailContent.includes('entry system');

    // G) PETS & LEASE COMPLIANCE
    const isPetIssue = emailContent.includes('pet') ||
                      emailContent.includes('dog') ||
                      emailContent.includes('cat') ||
                      emailContent.includes('animal') ||
                      emailContent.includes('lease') ||
                      emailContent.includes('subletting') ||
                      emailContent.includes('sublet') ||
                      emailContent.includes('tenancy') ||
                      emailContent.includes('compliance');

    // Determine primary issue type
    const primaryIssue = isLeakIssue ? 'leak' :
                        isServiceChargeIssue ? 'service_charge' :
                        isNoiseIssue ? 'noise' :
                        isSafetyIssue ? 'safety' :
                        isMaintenanceIssue ? 'maintenance' :
                        isParkingIssue ? 'parking' :
                        isPetIssue ? 'compliance' :
                        'general';

    // Determine leak category for more specific guidance (existing logic)
    const leakCategory = emailContent.includes('roof') || emailContent.includes('gutter') || emailContent.includes('window') || emailContent.includes('balcony') ? 'external' :
                        emailContent.includes('flat above') || emailContent.includes('upstairs') || emailContent.includes('ceiling') ? 'flat_above' :
                        emailContent.includes('radiator') || emailContent.includes('heating') || emailContent.includes('boiler') ? 'heating' :
                        emailContent.includes('toilet') || emailContent.includes('shower') || emailContent.includes('bath') || emailContent.includes('tap') ? 'bathroom' :
                        emailContent.includes('pipe') || emailContent.includes('plumbing') ? 'plumbing' :
                        emailContent.includes('condensation') || emailContent.includes('mould') || emailContent.includes('damp') ? 'damp' :
                        'general';

    // Add BlocIQ leak triage policy if this is a leak issue
    const leakTriagePolicy = isLeakIssue ? `
🚨 LEAK TRIAGE POLICY - MANDATORY FOR ALL WATER INGRESS/LEAK ISSUES:

CRITICAL: Always follow this 6-step triage process for ANY water-related issue.

1) IMMEDIATE ASSESSMENT - Demised vs Communal Classification:
   • "Demised" = within a leaseholder's property (internal pipework/appliances/fixtures up to their demise)
   • "Communal" = roofs, communal risers/stacks, structure, external walls, common pipes before they branch to a private demise
   • Default assumption: If ceiling leak below another flat = "likely demised above" unless clear evidence of roof/communal source
   • ${leakCategory === 'external' ? 'LIKELY COMMUNAL: External leaks (roof/gutter/window/balcony) typically communal responsibility' :
     leakCategory === 'flat_above' ? 'LIKELY DEMISED: Ceiling leaks below flats typically originate from demised areas above' :
     leakCategory === 'heating' ? 'CHECK SYSTEM TYPE: Individual boilers = demised, communal heating = may be communal' :
     leakCategory === 'bathroom' ? 'LIKELY DEMISED: Bathroom fixtures typically within demise' :
     leakCategory === 'plumbing' ? 'DEPENDS ON LOCATION: Check if private branch or communal main' :
     leakCategory === 'damp' ? 'MULTIPLE CAUSES: Could be structural (communal) or lifestyle/ventilation (demised)' :
     'INVESTIGATE REQUIRED: Determine source and responsibility'}

2) MANDATORY FIRST STEP - Flat-to-Flat Contact:
   • ALWAYS require reporting leaseholder to contact flat above first (if applicable)
   • Ask them to request quick local checks: stop taps, appliance inspection, visible pipe checks
   • Only proceed to professional investigation if no contact possible OR issue persists after contact
   • Document this step was attempted in response

3) PROFESSIONAL INVESTIGATION (when flat-to-flat contact fails/insufficient):
   • Arrange non-invasive leak detection/plumber attendance
   • BOTH parties must be informed and consent to access appointments
   • CRITICAL: State upfront that costs will be recharged to responsible party if demised source
   • If communal source found, costs fall to block/service charge budget

4) COST LIABILITY STRUCTURE:
   • Demised source (private pipework/fixture): Responsible leaseholder pays ALL costs (detection + repairs)
   • Communal source (roof/structure/communal pipes): Block budget covers costs
   • Investigation costs: Charged to responsible party once source confirmed
   • Emergency stopping/temporary measures: Usually communal initially, recharged if demised

5) INSURANCE CONSIDERATIONS:
   • If damage costs likely exceed building policy excess (typically £500-£2500): Consider insurance claim
   • Responsible party (flat of origin) typically covers policy excess
   • Below excess: Private costs, recharged as per liability rules above
   • Always mention insurance option for significant damage

6) COMMUNICATION REQUIREMENTS:
   • Use British English, clear, neutral, practical tone
   • Rely on lease terms as primary authority - avoid legal overreach
   • NEVER cite "Leasehold Property Act 2002 s.11" or similar
   • Include: flat-to-flat step, investigation consent, cost warnings, insurance options
   • Provide realistic timescales (24-48hrs for emergency stopping, 3-5 days for investigation)

RESPONSE STRUCTURE REQUIRED:
1. Acknowledge urgency and concern
2. Explain flat-to-flat contact requirement (if applicable)
3. Detail investigation process and consent needs
4. Clearly state cost liability rules
5. Mention insurance if damage likely significant
6. Provide next steps and timescales
7. Request updates/confirmation from leaseholder

APPLY THIS POLICY TO ALL LEAK/WATER DAMAGE REPORTS - NO EXCEPTIONS.
` : '';

    // 🚀 COMPREHENSIVE ISSUE-SPECIFIC POLICIES
    const serviceChargePolicy = isServiceChargeIssue ? `
💷 SERVICE CHARGE POLICY - MANDATORY FOR ALL BILLING/SECTION 20 ISSUES:

1) TRANSPARENCY REQUIREMENTS:
   • Provide itemized breakdown within 21 days if requested
   • Explain reserve fund contributions and major works budgeting
   • Reference Section 20 consultation stages and statutory caps (£250/£100)
   • Include payment methods and deadlines

2) SECTION 20 COMPLIANCE:
   • Works >£250 per unit require full Section 20 consultation
   • Services >£100 per unit require consultation for long-term agreements
   • Must serve notice, obtain estimates, allow observations, serve further notice
   • Non-compliance limits recovery to statutory caps

3) RESPONSE STRUCTURE:
   • Acknowledge query and show transparency
   • Provide specific breakdown or timeline for providing it
   • Explain statutory rights and consultation process
   • Offer meeting/call if complex issues
   • Include contact for finance queries
` : '';

    const noisePolicy = isNoiseIssue ? `
🔇 NOISE COMPLAINT POLICY - DIPLOMATIC RESOLUTION APPROACH:

1) INITIAL RESPONSE:
   • Acknowledge impact on quality of life
   • Recommend keeping detailed noise diary (times, duration, type)
   • Suggest direct approach to neighbour as first step
   • Offer mediation services if available

2) INVESTIGATION PROCESS:
   • Require minimum 2-week noise diary before formal action
   • Arrange site visit during reported problem times if needed
   • Review lease covenants regarding nuisance and consideration
   • Consider environmental health referral if statutory nuisance

3) ESCALATION STEPS:
   • Informal discussion with reported neighbour
   • Written warning referencing lease obligations
   • Formal breach of lease procedures if continued
   • Legal action as last resort with evidence

4) REASONABLE EXPECTATIONS:
   • Normal household activities during reasonable hours acceptable
   • Hard flooring may require carpets/rugs in lease
   • Consider building construction and sound transmission
` : '';

    const safetyPolicy = isSafetyIssue ? `
🚨 BUILDING SAFETY POLICY - IMMEDIATE PRIORITY FOR ALL SAFETY ISSUES:

1) URGENT RESPONSE REQUIRED:
   • Acknowledge safety concerns immediately
   • Arrange inspection within 24-48 hours for urgent issues
   • Reference Building Safety Act 2022 and Responsible Person duties
   • Provide emergency contact details

2) FIRE SAFETY COMPLIANCE:
   • Reference current Fire Risk Assessment (FRAEW)
   • Ensure fire doors, escape routes, alarms properly maintained
   • Report any defects to fire safety specialist immediately
   • Document all safety-related communications

3) REGULATORY COMPLIANCE:
   • Building Safety Act 2022 compliance (HRBs)
   • Fire Safety England and LFB guidance
   • Gas Safety (annual CP12 certificates)
   • Electrical safety (EICR every 5 years)

4) RESIDENT COMMUNICATIONS:
   • Never downplay safety concerns
   • Provide clear timescales for resolution
   • Keep residents informed of progress
   • Consider temporary measures if needed
` : '';

    const maintenancePolicy = isMaintenanceIssue ? `
🔧 MAINTENANCE POLICY - EFFICIENT RESOLUTION APPROACH:

1) RESPONSIBILITY DETERMINATION:
   • Demised items: Leaseholder responsibility (internal fixtures, appliances)
   • Common parts: Freeholder/management company responsibility
   • Shared items: Check lease terms for specific provisions

2) RESPONSE TIMESCALES:
   • Emergency repairs: 24 hours (heating failure in winter, no hot water, security)
   • Urgent repairs: 3-5 working days (lift failures, lighting, door entry)
   • Routine repairs: 10-15 working days (decoration, non-urgent items)

3) CONTRACTOR ARRANGEMENTS:
   • Use approved contractor list where possible
   • Obtain quotes for works over agreed limits
   • Consider Section 20 requirements for major works
   • Provide residents with expected completion dates

4) COST MANAGEMENT:
   • Recharge demised repairs to leaseholder
   • Budget common part repairs through service charge
   • Consider reserve fund for major items
   • Insurance claims for significant damage
` : '';

    const parkingPolicy = isParkingIssue ? `
🚗 PARKING & ACCESS POLICY - CLEAR ENFORCEMENT APPROACH:

1) PARKING RIGHTS VERIFICATION:
   • Check lease grants and parking schedules
   • Verify allocated/unallocated space arrangements
   • Review any parking management company agreements
   • Confirm permit/resident parking requirements

2) VIOLATION RESPONSE:
   • First instance: polite reminder letter
   • Repeated violations: formal warning with lease reference
   • Persistent issues: parking management company or wheel clamping
   • Consider resident permits or barrier systems

3) ACCESS ISSUES:
   • Fob/key replacement procedures and costs
   • Intercom system maintenance and updates
   • Gate/barrier fault reporting and repair timescales
   • Visitor access protocols

4) DISPUTES RESOLUTION:
   • Mediation for neighbour parking disputes
   • Site visits to assess parking problems
   • Review parking space markings and signage
   • Consider traffic regulation orders if needed
` : '';

    const compliancePolicy = isPetIssue ? `
📋 LEASE COMPLIANCE POLICY - FAIR BUT FIRM ENFORCEMENT:

1) LEASE REVIEW:
   • Check specific lease covenants and restrictions
   • Review management company obligations
   • Consider reasonableness of lease terms
   • Check for any variations or licenses granted

2) PETS & ANIMALS:
   • Most leases require permission for pets
   • Consider size, type, and impact on other residents
   • May require insurance and damage deposits
   • Service animals have different legal status

3) SUBLETTING & OCCUPATION:
   • Check subletting permissions and restrictions
   • Verify tenant/occupier status and rights
   • Ensure proper registrations and notifications
   • Consider impact on insurance and mortgages

4) BREACH PROCEDURES:
   • Informal discussion and education first
   • Formal notice if breach continues
   • Consider forfeiture proceedings only as last resort
   • Seek legal advice for complex compliance issues
` : '';

    // 🚀 PHASE 2: SMART ATTACHMENT SUGGESTIONS
    const suggestedAttachments: Array<{name: string, type: string, priority: string, reason: string}> = [];

    // Issue-specific attachment suggestions
    if (isLeakIssue) {
      suggestedAttachments.push(
        { name: 'Emergency Contact List', type: 'contact', priority: 'high', reason: 'Quick access to 24/7 contractors' },
        { name: 'Insurance Claim Form', type: 'form', priority: 'medium', reason: 'May be needed if damage exceeds excess' },
        { name: 'Leak Report Template', type: 'template', priority: 'medium', reason: 'For detailed documentation' }
      );
    }

    if (isServiceChargeIssue) {
      suggestedAttachments.push(
        { name: 'Service Charge Breakdown', type: 'financial', priority: 'high', reason: 'Transparency requirement' },
        { name: 'Section 20 Process Guide', type: 'guide', priority: 'medium', reason: 'Statutory consultation explanation' },
        { name: 'Reserve Fund Statement', type: 'financial', priority: 'low', reason: 'Budget transparency' }
      );

      if (upcomingDeadlines.some(item => item.item_name?.toLowerCase().includes('major works'))) {
        suggestedAttachments.push(
          { name: 'Major Works Schedule', type: 'schedule', priority: 'high', reason: 'Upcoming works affecting charges' }
        );
      }
    }

    if (isNoiseIssue) {
      suggestedAttachments.push(
        { name: 'Noise Diary Template', type: 'template', priority: 'high', reason: 'Required for formal action' },
        { name: 'Mediation Service Info', type: 'service', priority: 'medium', reason: 'Alternative dispute resolution' },
        { name: 'Lease Extract - Nuisance Clause', type: 'legal', priority: 'low', reason: 'Covenant reference' }
      );
    }

    if (isSafetyIssue) {
      suggestedAttachments.push(
        { name: 'Emergency Procedures', type: 'safety', priority: 'critical', reason: 'Immediate safety guidance' },
        { name: 'Fire Safety Contacts', type: 'contact', priority: 'critical', reason: 'Specialist emergency contacts' },
        { name: 'Building Safety Act Summary', type: 'legal', priority: 'medium', reason: 'Regulatory compliance info' }
      );

      if (complianceAlerts.some(alert => alert.type === 'safety_related')) {
        suggestedAttachments.push(
          { name: 'Current Fire Risk Assessment', type: 'compliance', priority: 'high', reason: 'Related to safety concern' }
        );
      }
    }

    if (isMaintenanceIssue) {
      suggestedAttachments.push(
        { name: 'Maintenance Request Form', type: 'form', priority: 'medium', reason: 'Formal repair process' },
        { name: 'Approved Contractor List', type: 'directory', priority: 'low', reason: 'Resident contractor options' },
        { name: 'Warranty Information', type: 'warranty', priority: 'low', reason: 'Check coverage before charges' }
      );
    }

    // Compliance-specific attachments
    if (complianceAlerts.length > 0) {
      complianceAlerts.forEach(alert => {
        if (alert.severity === 'critical' && alert.type === 'overdue') {
          suggestedAttachments.push(
            { name: 'Urgent Compliance Notice', type: 'compliance', priority: 'critical', reason: 'Overdue items require attention' }
          );
        }
      });
    }

    // 📅 FOLLOW-UP AUTOMATION
    const followUpSchedule = {
      leak: urgencyLevel === 'high' ? '24 hours' : '3 days',
      service_charge: '7 days',
      noise: '5 days',
      safety: urgencyLevel === 'high' ? '24 hours' : '48 hours',
      maintenance: urgencyLevel === 'high' ? '24 hours' : '5 days',
      parking: '7 days',
      compliance: '3 days',
      general: '10 days'
    };

    const followUpDate = new Date();
    const followUpDays = parseInt(followUpSchedule[primaryIssue]?.split(' ')[0] || '7');
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    // 🎯 PREDICTIVE NEXT STEPS
    const predictiveActions: Array<{action: string, timeline: string, responsible: string, priority: string}> = [];

    if (isLeakIssue) {
      predictiveActions.push(
        { action: 'Flat-to-flat contact attempt', timeline: 'Next 24 hours', responsible: 'Resident', priority: 'immediate' },
        { action: 'Schedule leak investigation', timeline: '3-5 days if unresolved', responsible: 'Management', priority: 'high' },
        { action: 'Review building insurance policy', timeline: 'Within 7 days', responsible: 'Management', priority: 'medium' }
      );
    }

    if (isServiceChargeIssue) {
      predictiveActions.push(
        { action: 'Prepare itemized breakdown', timeline: 'Within 21 days', responsible: 'Management', priority: 'high' },
        { action: 'Check Section 20 compliance status', timeline: 'Within 3 days', responsible: 'Management', priority: 'high' },
        { action: 'Schedule finance meeting if requested', timeline: 'Within 14 days', responsible: 'Management', priority: 'medium' }
      );
    }

    if (isSafetyIssue) {
      predictiveActions.push(
        { action: 'Emergency site inspection', timeline: 'Within 24 hours', responsible: 'Management', priority: 'critical' },
        { action: 'Contact specialist contractor', timeline: 'Same day', responsible: 'Management', priority: 'critical' },
        { action: 'Update Fire Risk Assessment if needed', timeline: 'Within 7 days', responsible: 'Management', priority: 'high' }
      );
    }

    // Add compliance-driven actions
    if (riskAssessment?.risk_level === 'high') {
      predictiveActions.push(
        { action: 'Address overdue compliance items', timeline: 'Immediate', responsible: 'Management', priority: 'critical' }
      );
    }

    // 🎯 INTELLIGENT TONE ADJUSTMENT
    const toneAdjustment = `
🎯 INTELLIGENT RESPONSE CONFIGURATION:
- Urgency Level: ${urgencyLevel.toUpperCase()}
- Sentiment: ${sentiment.toUpperCase()}
- Primary Issue: ${primaryIssue.toUpperCase()}
- Compliance Risk: ${riskAssessment?.risk_level?.toUpperCase() || 'UNKNOWN'}

${urgencyLevel === 'high' ? '⚡ URGENT RESPONSE: Acknowledge urgency, provide immediate next steps, include emergency contacts' : ''}
${urgencyLevel === 'medium' ? '⏰ PROMPT RESPONSE: Show responsiveness, provide clear timescales' : ''}
${sentiment === 'negative' ? '💪 EMPATHETIC APPROACH: Acknowledge frustration, show understanding, focus on solutions' : ''}
${sentiment === 'positive' ? '😊 POSITIVE TONE: Respond to appreciation, maintain helpful approach' : ''}
${riskAssessment?.risk_level === 'high' ? '🚨 COMPLIANCE ALERT: Mention any relevant overdue items requiring attention' : ''}

📅 FOLLOW-UP: Schedule follow-up for ${followUpSchedule[primaryIssue] || '7 days'} (${followUpDate.toDateString()})

📎 SUGGESTED ATTACHMENTS:
${suggestedAttachments.map(att => `• ${att.name} (${att.priority} priority): ${att.reason}`).join('\n')}

🎯 PREDICTED NEXT STEPS:
${predictiveActions.map(action => `• ${action.action} - ${action.timeline} (${action.responsible})`).join('\n')}
`;

    const systemPrompt = `Generate a professional email reply for BlocIQ property management with these EXACT formatting rules:

${leakTriagePolicy}
${serviceChargePolicy}
${noisePolicy}
${safetyPolicy}
${maintenancePolicy}
${parkingPolicy}
${compliancePolicy}
${toneAdjustment}

CRITICAL FORMATTING REQUIREMENTS - FOLLOW EXACTLY:
1. NEVER include subject line in the response body - subject is handled separately
2. Salutation: "Dear ${senderName}," (extract name from sender_info, never use placeholders)
3. Opening line: ALWAYS "Thank you for your email regarding ${issueSummary}."
4. Body: Address the specific concerns using building/property context if available
5. Closing: "Best regards," or "Kind regards," followed by "${userFirstName}" ONLY
6. ABSOLUTELY NO placeholders like [Your Name], [Resident's Name], [Your Position], [Company], etc.
7. NO email signatures, contact details, or company information
8. NO "Subject:" lines in the response body
9. Response should start directly with "Dear [FirstName],"

CRITICAL ANTI-HALLUCINATION RULES:
- ONLY reference lease clauses, terms, or sections if they are EXPLICITLY provided in the ACTUAL LEASE DOCUMENTS above
- NEVER invent clause numbers, section references, or lease terms (e.g. "Clause 15", "Section 3.2")
- If no lease documents are provided, state "Please refer to your lease agreement for specific terms"
- ONLY mention Section 20 if the query is about ACTUAL WORKS or REPAIRS, NOT for subletting/permissions
- DO NOT assume standard lease terms - only use what is explicitly provided in the database

REPLY GENERATION RULES:
- Use British English exclusively
- Write from Property Manager perspective
- Apply BlocIQ founder's property management expertise from the database
- Reference industry knowledge and regulations when relevant to the query
- Use comprehensive database context to provide specific, informed responses
- Only cite specific lease clauses if they are provided in the ACTUAL LEASE DOCUMENTS section above
- Distinguish between demised parts (leaseholder responsibility) and common parts (freeholder responsibility)
- Use professional language like "we will endeavour" instead of "we guarantee"
- Provide specific next steps with timelines where appropriate
- If specific lease terms are not available, provide general guidance and refer to their lease agreement

EMAIL CONTEXT:
${emailContextInfo.length > 0 ? emailContextInfo.join('\n') : 'No email context provided'}

BUILDING/PROPERTY CONTEXT:
${contextLines.length > 0 ? contextLines.join('\n') : 'No matched records in system'}

COMPREHENSIVE DATABASE CONTEXT:
${comprehensiveContext || 'No additional context found'}

INDUSTRY KNOWLEDGE:
${industryKnowledge || 'No specific industry knowledge found'}

FOUNDER GUIDANCE:
${founderGuidance || 'No specific founder guidance found'}

ACTUAL LEASE DOCUMENTS FOR THIS BUILDING:
${leaseDocuments || 'No lease documents found in database for this building'}

REPLY INSTRUCTIONS:
${question.trim()}

Generate ONLY the email reply body with these exact specifications:
- Start with "Dear ${senderName}," (never "Dear [Resident's Name]")
- Second line: "Thank you for your email regarding ${issueSummary}."
- Body paragraphs addressing the issue
- End with "Best regards," or "Kind regards,"
- Final line: "${userFirstName}"
- NO subject lines, NO placeholders, NO company information`;

    console.log('🤖 Calling OpenAI API with extracted values:', {
      senderName,
      issueSummary,
      userFirstName,
      hasComprehensiveContext: !!comprehensiveContext,
      hasIndustryKnowledge: !!industryKnowledge
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // 🚀 PHASE 3: ADVANCED AI CONTEXT ENHANCEMENT
    console.log('🤖 Phase 3: Advanced contextual processing started');

    // Dynamic Template System with Contextual Variations
    const templateVariations = getTemplateVariations(primaryIssue, urgencyLevel, sentiment);

    // Smart Tone Adaptation Based on Sender Profile
    const senderProfile = analyzeSenderProfile(sender_info, email_body, buildingObj);
    const adaptedTone = getAdaptedTone(senderProfile, primaryIssue, urgencyLevel);

    // Legal Compliance Validation and Risk Assessment
    const legalCompliance = await validateLegalCompliance(primaryIssue, buildingObj, units);
    const riskValidation = await assessRegulatoryRisk(primaryIssue, compliance, buildingObj);

    // Multi-language Support Detection
    const languagePreference = detectLanguagePreference(email_body, sender_info);

    // Advanced Learning System - Historical Pattern Analysis
    const historicalPatterns = await analyzeHistoricalPatterns(email, primaryIssue, buildingObj?.id);

    console.log('✅ Phase 3 contextual analysis completed:', {
      template_variation: templateVariations.primary_template,
      sender_profile: senderProfile.profile_type,
      adapted_tone: adaptedTone.tone_style,
      legal_risk: legalCompliance.risk_level,
      language: languagePreference.detected_language,
      historical_insights: historicalPatterns.pattern_count
    });

    // Enhanced System Message with Phase 3 Intelligence
    const enhancedSystemMessage = buildEnhancedSystemMessage(
      templateVariations,
      adaptedTone,
      legalCompliance,
      languagePreference,
      historicalPatterns
    );

    // Call OpenAI with Phase 3 Enhanced Context
    const completion = await openai.chat.completions.create({
      model: process.env.BLOCIQ_MODEL || 'gpt-4o',
      temperature: adaptedTone.temperature || 0.2,
      max_tokens: templateVariations.max_tokens || 1200,
      messages: [
        {
          role: 'system',
          content: enhancedSystemMessage
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    });

    const answer = completion.choices[0]?.message?.content?.trim() || 'No answer generated.';

    console.log('✅ OpenAI response received');

    // Generate suggested queries
    const suggestions: string[] = [];

    if (!buildingObj && building) {
      suggestions.push(`Search buildings matching "${building}"`);
      suggestions.push(`Try alternative building names`);
    }

    if (buildingObj && unit && units.length === 0) {
      suggestions.push(`Try unit variants: "Flat ${unit}" or "${unit}A"`);
      suggestions.push(`Check unit numbering scheme for ${buildingObj.name}`);
    }

    if (!building && !unit) {
      suggestions.push(`Specify building: "What compliance is due for [Building Name]?"`);
      suggestions.push(`Ask about specific units: "Who lives in Flat 5 at [Building]?"`);
    }

    // 🚀 PHASE 2: ENHANCED INTERACTION LOGGING WITH PHASE 2 FEATURES
    try {
      await supabaseAdmin
        .from('ai_logs')
        .insert({
          user_id: userId,
          agency_id: agencyId,
          building_id: buildingObj?.id || null,
          question: question.trim(),
          response: answer,
          context_type: 'outlook_reply_generation_v2',
          metadata: {
            // Original metadata
            client: 'outlook_reply_addin_v2',
            building_name: buildingObj?.name,
            units_found: units.length,
            leaseholders_found: leaseholders.length,
            has_compliance: !!compliance,
            has_email_context: !!(email_subject || email_body),
            email_subject: email_subject?.substring(0, 100),
            sender_name: sender_info?.name,
            reply_type: contextType || 'general_reply',
            has_comprehensive_context: !!comprehensiveContext,
            has_industry_knowledge: !!industryKnowledge,
            has_founder_guidance: !!founderGuidance,
            search_query_used: `${question} ${email_subject || ''}`.substring(0, 100),
            suggestions: suggestions,

            // 🚀 PHASE 2: Advanced Analytics
            intelligence_analysis: {
              urgency_level: urgencyLevel,
              sentiment: sentiment,
              primary_issue: primaryIssue,
              leak_category: isLeakIssue ? leakCategory : null,
              compliance_risk_level: riskAssessment?.risk_level,
              compliance_alerts_count: complianceAlerts.length,
              upcoming_deadlines_count: upcomingDeadlines.length,
              suggested_attachments_count: suggestedAttachments.length,
              predicted_actions_count: predictiveActions.length,
              follow_up_scheduled: followUpDate.toISOString()
            },

            // Proactive features used
            proactive_features: {
              compliance_integration: complianceAlerts.length > 0,
              attachment_suggestions: suggestedAttachments.length > 0,
              predictive_actions: predictiveActions.length > 0,
              follow_up_automation: true,
              risk_assessment: !!riskAssessment
            },

            // Performance metrics
            performance_metrics: {
              total_compliance_items: compliance?.length || 0,
              critical_deadlines: upcomingDeadlines.filter(d => d.urgency === 'critical').length,
              high_priority_attachments: suggestedAttachments.filter(a => a.priority === 'high' || a.priority === 'critical').length,
              immediate_actions: predictiveActions.filter(a => a.priority === 'critical' || a.priority === 'immediate').length
            }
          }
        });

      console.log('📝 Enhanced interaction logged successfully with Phase 2 analytics');
    } catch (logError) {
      console.error('❌ Failed to log interaction:', logError);
      // Don't fail the request if logging fails
    }

    // 🚀 PHASE 3: Intelligent Follow-up Scheduling
    const intelligentFollowUp = generateIntelligentFollowUp(
      primaryIssue,
      urgencyLevel,
      legalCompliance,
      historicalPatterns,
      buildingObj
    );

    console.log('✅ Phase 3 intelligent follow-up generated:', intelligentFollowUp);

    // 🚀 PHASE 3: ENHANCED RESPONSE WITH ADVANCED INTELLIGENCE
    return createResponse({
      ok: true,
      answer: answer,
      context: {
        building: buildingObj,
        units: units,
        leaseholders: leaseholders,
        compliance_items: compliance ? (Array.isArray(compliance) ? compliance.length : 1) : 0,

        // 🚀 PHASE 2: Intelligence Analysis
        intelligence: {
          urgency_level: urgencyLevel,
          sentiment: sentiment,
          primary_issue: primaryIssue,
          leak_category: isLeakIssue ? leakCategory : null
        },

        // Proactive compliance data
        compliance_analysis: {
          risk_level: riskAssessment?.risk_level || 'unknown',
          upcoming_deadlines: upcomingDeadlines.length,
          critical_deadlines: upcomingDeadlines.filter(d => d.urgency === 'critical').length,
          alerts: complianceAlerts.length,
          overdue_items: riskAssessment?.overdue_count || 0
        },

        // Smart suggestions
        automation: {
          follow_up_date: followUpDate.toISOString(),
          follow_up_period: followUpSchedule[primaryIssue] || '7 days',
          suggested_attachments: suggestedAttachments.length,
          predicted_actions: predictiveActions.length
        }
      },
      suggested_queries: suggestions,

      // 🚀 PHASE 2: Rich Metadata for Frontend Integration
      phase2_features: {
        suggested_attachments: suggestedAttachments,
        predictive_actions: predictiveActions,
        compliance_alerts: complianceAlerts.map(alert => ({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          item_count: alert.items?.length || 0
        })),
        upcoming_deadlines: upcomingDeadlines.slice(0, 5), // Top 5 most urgent
        follow_up: {
          scheduled_date: followUpDate.toISOString(),
          period: followUpSchedule[primaryIssue] || '7 days',
          reason: `${primaryIssue} follow-up based on ${urgencyLevel} urgency`
        }
      },

      // 🚀 PHASE 3: Advanced Contextual Intelligence Features
      phase3_intelligence: {
        template_system: {
          selected_template: templateVariations.primary_template,
          context_key: templateVariations.context_key,
          structure_used: templateVariations.structure,
          max_tokens: templateVariations.max_tokens
        },
        sender_profile: {
          profile_type: senderProfile.profile_type,
          communication_style: senderProfile.communication_style,
          complexity_preference: senderProfile.complexity_preference,
          authority_level: senderProfile.authority_level,
          special_considerations: senderProfile.special_considerations
        },
        tone_adaptation: {
          selected_tone: adaptedTone.tone_style,
          temperature_used: adaptedTone.temperature,
          formality_level: adaptedTone.formality_level,
          technical_detail_level: adaptedTone.technical_detail,
          empathy_level: adaptedTone.empathy_level
        },
        legal_compliance: {
          risk_assessment: legalCompliance.risk_level,
          applicable_regulations: legalCompliance.applicable_regulations,
          mandatory_elements: legalCompliance.mandatory_clauses,
          statutory_requirements: legalCompliance.statutory_requirements,
          regulatory_risk: riskValidation.overall_risk
        },
        language_intelligence: {
          detected_language: languagePreference.detected_language,
          region_variant: languagePreference.region_variant,
          complexity_level: languagePreference.complexity_level,
          cultural_considerations: languagePreference.cultural_considerations
        },
        historical_analysis: {
          pattern_count: historicalPatterns.pattern_count,
          common_building_issues: historicalPatterns.common_issues,
          building_insights: historicalPatterns.building_specific_insights,
          recommended_adaptations: historicalPatterns.recommended_adaptations
        },
        intelligent_scheduling: {
          follow_up_strategy: intelligentFollowUp.strategy,
          escalation_timeline: intelligentFollowUp.escalation_timeline,
          monitoring_points: intelligentFollowUp.monitoring_points,
          success_criteria: intelligentFollowUp.success_criteria
        }
      }
    });

  } catch (error) {
    console.error('❌ Outlook Ask BlocIQ error:', error);

    // Provide specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        return createResponse({
          ok: false,
          error: 'AI service temporarily unavailable'
        }, 503);
      }

      if (error.message.includes('Supabase') || error.message.includes('database')) {
        return createResponse({
          ok: false,
          error: 'Database service temporarily unavailable'
        }, 503);
      }
    }

    return createResponse({
      ok: false,
      error: 'Ask BlocIQ failed - please try again'
    }, 500);
  }
}

// 🚀 PHASE 3: ADVANCED CONTEXTUAL FUNCTIONS

/**
 * Dynamic Template System with Contextual Variations
 */
function getTemplateVariations(primaryIssue: string, urgencyLevel: string, sentiment: string) {
  const templates = {
    leak: {
      urgent_negative: {
        primary_template: 'emergency_leak_response',
        tone_adjustments: ['immediate_action', 'empathetic', 'professional'],
        max_tokens: 1400,
        structure: ['urgent_acknowledgment', 'immediate_steps', 'contractor_contact', 'insurance_guidance', 'follow_up']
      },
      routine_neutral: {
        primary_template: 'standard_leak_investigation',
        tone_adjustments: ['professional', 'methodical', 'reassuring'],
        max_tokens: 1200,
        structure: ['polite_acknowledgment', 'investigation_plan', 'timeline', 'resident_cooperation', 'next_steps']
      }
    },
    service_charge: {
      urgent_negative: {
        primary_template: 'service_charge_dispute_resolution',
        tone_adjustments: ['understanding', 'detailed', 'regulatory_compliant'],
        max_tokens: 1500,
        structure: ['empathetic_response', 'detailed_breakdown', 'legal_framework', 'resolution_options', 'meeting_offer']
      },
      routine_neutral: {
        primary_template: 'service_charge_explanation',
        tone_adjustments: ['informative', 'transparent', 'helpful'],
        max_tokens: 1100,
        structure: ['friendly_acknowledgment', 'clear_explanation', 'supporting_documents', 'contact_details']
      }
    },
    noise: {
      urgent_negative: {
        primary_template: 'noise_complaint_mediation',
        tone_adjustments: ['diplomatic', 'solution_focused', 'fair'],
        max_tokens: 1300,
        structure: ['understanding_acknowledgment', 'investigation_process', 'mediation_options', 'lease_obligations', 'monitoring_plan']
      }
    },
    safety: {
      any_any: {
        primary_template: 'safety_priority_response',
        tone_adjustments: ['urgent', 'safety_first', 'regulatory_compliant', 'detailed'],
        max_tokens: 1500,
        structure: ['immediate_acknowledgment', 'safety_assessment', 'regulatory_framework', 'action_plan', 'escalation_process']
      }
    },
    maintenance: {
      urgent_any: {
        primary_template: 'urgent_maintenance_response',
        tone_adjustments: ['responsive', 'solution_oriented', 'timeline_specific'],
        max_tokens: 1200,
        structure: ['prompt_acknowledgment', 'responsibility_assessment', 'contractor_assignment', 'completion_timeline', 'follow_up']
      }
    },
    general: {
      default: {
        primary_template: 'professional_response',
        tone_adjustments: ['helpful', 'professional', 'clear'],
        max_tokens: 1000,
        structure: ['polite_acknowledgment', 'specific_response', 'next_steps', 'contact_details']
      }
    }
  };

  const issueTemplates = templates[primaryIssue as keyof typeof templates] || templates.general;
  const key = `${urgencyLevel}_${sentiment}` as keyof typeof issueTemplates;
  const specificTemplate = issueTemplates[key] || issueTemplates[Object.keys(issueTemplates)[0] as keyof typeof issueTemplates];

  return {
    primary_template: specificTemplate.primary_template,
    tone_adjustments: specificTemplate.tone_adjustments,
    max_tokens: specificTemplate.max_tokens,
    structure: specificTemplate.structure,
    issue_type: primaryIssue,
    context_key: `${primaryIssue}-${urgencyLevel}-${sentiment}`
  };
}

/**
 * Smart Tone Adaptation Based on Sender Profile
 */
function analyzeSenderProfile(senderInfo: any, emailBody: string, building: any) {
  const profile = {
    profile_type: 'standard_resident',
    communication_style: 'neutral',
    previous_interactions: 0,
    complexity_preference: 'standard',
    authority_level: 'resident',
    special_considerations: [] as string[]
  };

  // Analyze communication style from email content
  if (emailBody) {
    const content = emailBody.toLowerCase();

    // Formal/professional indicators
    if (content.includes('dear sir/madam') || content.includes('yours faithfully') ||
        content.includes('pursuant to') || content.includes('in accordance with')) {
      profile.communication_style = 'formal';
      profile.complexity_preference = 'detailed';
    }

    // Informal/casual indicators
    else if (content.includes('hi there') || content.includes('cheers') ||
             content.includes('thanks!') || content.includes('quick question')) {
      profile.communication_style = 'casual';
      profile.complexity_preference = 'concise';
    }

    // Legal/professional background indicators
    if (content.includes('lease clause') || content.includes('statutory') ||
        content.includes('jurisdiction') || content.includes('precedent')) {
      profile.authority_level = 'legal_professional';
      profile.complexity_preference = 'technical';
    }

    // Property professional indicators
    if (content.includes('property manager') || content.includes('letting agent') ||
        content.includes('freeholder representative')) {
      profile.authority_level = 'property_professional';
    }

    // Vulnerable/special needs indicators
    if (content.includes('disability') || content.includes('accessibility') ||
        content.includes('support needed') || content.includes('reasonable adjustments')) {
      profile.special_considerations.push('accessibility_support');
    }

    // Language complexity analysis
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const wordCount = content.split(/\s+/).length;
    if (sentenceCount > 0) {
      const avgWordsPerSentence = wordCount / sentenceCount;
      if (avgWordsPerSentence > 20) {
        profile.complexity_preference = 'detailed';
      } else if (avgWordsPerSentence < 10) {
        profile.complexity_preference = 'simple';
      }
    }
  }

  // Building-specific considerations
  if (building?.name) {
    // Check if it's a high-value development (might indicate more sophisticated residents)
    const buildingName = building.name.toLowerCase();
    if (buildingName.includes('court') || buildingName.includes('gardens') ||
        buildingName.includes('place') || buildingName.includes('square')) {
      profile.profile_type = 'premium_resident';
    }
  }

  return profile;
}

/**
 * Get Adapted Tone Based on Profile Analysis
 */
function getAdaptedTone(senderProfile: any, primaryIssue: string, urgencyLevel: string) {
  const baseTone = {
    tone_style: 'professional',
    temperature: 0.2,
    formality_level: 'standard',
    technical_detail: 'moderate',
    empathy_level: 'standard',
    response_structure: 'standard'
  };

  // Adapt based on sender profile
  switch (senderProfile.communication_style) {
    case 'formal':
      baseTone.tone_style = 'formal_professional';
      baseTone.temperature = 0.1;
      baseTone.formality_level = 'high';
      baseTone.technical_detail = 'detailed';
      break;

    case 'casual':
      baseTone.tone_style = 'approachable_professional';
      baseTone.temperature = 0.3;
      baseTone.formality_level = 'relaxed';
      baseTone.technical_detail = 'simplified';
      break;
  }

  // Adapt based on authority level
  if (senderProfile.authority_level === 'legal_professional') {
    baseTone.technical_detail = 'technical';
    baseTone.tone_style = 'technical_professional';
  } else if (senderProfile.authority_level === 'property_professional') {
    baseTone.technical_detail = 'industry_standard';
    baseTone.tone_style = 'peer_professional';
  }

  // Adapt based on issue urgency
  if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
    baseTone.empathy_level = 'high';
    baseTone.response_structure = 'action_focused';
    baseTone.temperature = Math.max(0.1, baseTone.temperature - 0.1); // More focused
  }

  // Special considerations
  if (senderProfile.special_considerations.includes('accessibility_support')) {
    baseTone.tone_style = 'supportive_professional';
    baseTone.empathy_level = 'high';
    baseTone.technical_detail = 'clear_simple';
  }

  return baseTone;
}

/**
 * Legal Compliance Validation and Risk Assessment
 */
async function validateLegalCompliance(primaryIssue: string, building: any, units: any[]) {
  const compliance = {
    risk_level: 'low',
    applicable_regulations: [] as string[],
    mandatory_clauses: [] as string[],
    liability_considerations: [] as string[],
    statutory_requirements: [] as string[],
    recommended_disclaimers: [] as string[]
  };

  // Issue-specific legal frameworks
  switch (primaryIssue) {
    case 'leak':
      compliance.applicable_regulations = [
        'Landlord and Tenant Act 1985',
        'Defective Premises Act 1972',
        'Insurance (Residential Property) requirements'
      ];
      compliance.mandatory_clauses = [
        'Demised vs common parts responsibility',
        'Reasonable access for investigation',
        'Cost liability determination'
      ];
      compliance.risk_level = 'medium';
      compliance.liability_considerations = [
        'Water damage liability',
        'Emergency access rights',
        'Insurance excess responsibility'
      ];
      break;

    case 'service_charge':
      compliance.applicable_regulations = [
        'Landlord and Tenant Act 1985 (Section 18-30)',
        'Commonhold and Leasehold Reform Act 2002',
        'Section 20 Consultation Requirements'
      ];
      compliance.mandatory_clauses = [
        'Reasonableness of charges',
        'Statutory consultation requirements',
        'Right to challenge service charges'
      ];
      compliance.risk_level = 'high';
      compliance.statutory_requirements = [
        'Section 20 consultation for works >£250/unit',
        'Section 20ZA consultation for long-term agreements',
        'Annual service charge statements'
      ];
      break;

    case 'safety':
      compliance.applicable_regulations = [
        'Building Safety Act 2022',
        'Fire Safety England guidance',
        'Gas Safety (Installation and Use) Regulations',
        'Electrical Equipment (Safety) Regulations'
      ];
      compliance.risk_level = 'critical';
      compliance.statutory_requirements = [
        'Immediate safety assessment',
        'Resident safety communications',
        'Regulatory reporting if required'
      ];
      break;

    case 'noise':
      compliance.applicable_regulations = [
        'Environmental Protection Act 1990',
        'Noise and Statutory Nuisance Act 1993',
        'Lease covenant enforcement'
      ];
      compliance.mandatory_clauses = [
        'Peaceful enjoyment rights',
        'Anti-social behaviour procedures',
        'Mediation before enforcement'
      ];
      break;
  }

  // Building-specific considerations
  if (building?.floors && building.floors > 11) {
    compliance.applicable_regulations.push('Building Safety Act 2022 (Higher Risk Buildings)');
    if (primaryIssue === 'safety') {
      compliance.risk_level = 'critical';
      compliance.statutory_requirements.push('Building Safety Manager involvement required');
    }
  }

  // Universal disclaimers
  compliance.recommended_disclaimers = [
    'Professional advice qualification',
    'Lease-specific terms precedence',
    'Regulatory compliance commitment'
  ];

  return compliance;
}

/**
 * Assess Regulatory Risk
 */
async function assessRegulatoryRisk(primaryIssue: string, complianceData: any, building: any) {
  const risk = {
    overall_risk: 'low',
    regulatory_bodies: [] as string[],
    potential_penalties: [] as string[],
    mitigation_required: [] as string[],
    escalation_triggers: [] as string[]
  };

  // Determine regulatory oversight
  switch (primaryIssue) {
    case 'safety':
      risk.regulatory_bodies = ['Health and Safety Executive', 'Local Authority Building Control', 'Fire and Rescue Service'];
      risk.potential_penalties = ['Improvement notices', 'Prohibition notices', 'Prosecution'];
      risk.overall_risk = 'high';
      risk.escalation_triggers = ['Immediate danger', 'Structural concerns', 'Fire safety breaches'];
      break;

    case 'service_charge':
      risk.regulatory_bodies = ['First-tier Tribunal (Property Chamber)', 'Upper Tribunal'];
      risk.potential_penalties = ['Charge reduction orders', 'Administration orders', 'Cost penalties'];
      risk.overall_risk = 'medium';
      break;

    case 'leak':
      if (building && building.floors > 5) {
        risk.overall_risk = 'medium';
        risk.regulatory_bodies = ['Environmental Health', 'Building Control'];
      }
      break;
  }

  return risk;
}

/**
 * Detect Language Preference
 */
function detectLanguagePreference(emailBody: string, senderInfo: any) {
  const preference = {
    detected_language: 'en-GB',
    confidence: 1.0,
    region_variant: 'British',
    complexity_level: 'standard',
    cultural_considerations: [] as string[]
  };

  if (!emailBody) return preference;

  // Simple language detection patterns
  const content = emailBody.toLowerCase();

  // American English indicators
  if (content.includes('apartment') || content.includes('elevator') ||
      content.includes('color') || content.includes('neighbor')) {
    preference.region_variant = 'American';
    preference.detected_language = 'en-US';
  }

  // Non-native English indicators
  const nonNativePatterns = [
    /please to help/,
    /kindly do the needful/,
    /revert back/,
    /good morning sir\/madam/
  ];

  if (nonNativePatterns.some(pattern => pattern.test(content))) {
    preference.complexity_level = 'simple';
    preference.cultural_considerations.push('clear_language_preferred');
  }

  return preference;
}

/**
 * Analyze Historical Patterns
 */
async function analyzeHistoricalPatterns(email: string, primaryIssue: string, buildingId?: string) {
  const patterns = {
    pattern_count: 0,
    common_issues: [] as string[],
    response_effectiveness: 'unknown',
    seasonal_patterns: [] as string[],
    building_specific_insights: [] as string[],
    recommended_adaptations: [] as string[]
  };

  try {
    // Query historical interactions for this user/building
    if (buildingId) {
      const { data: historicalData } = await supabaseAdmin
        .from('email_interactions')
        .select('issue_type, resolution_time, satisfaction_score')
        .eq('building_id', buildingId)
        .limit(50)
        .order('created_at', { ascending: false });

      if (historicalData && historicalData.length > 0) {
        patterns.pattern_count = historicalData.length;

        // Analyze common issues
        const issueCounts = historicalData.reduce((acc: any, item: any) => {
          acc[item.issue_type] = (acc[item.issue_type] || 0) + 1;
          return acc;
        }, {});

        patterns.common_issues = Object.entries(issueCounts)
          .sort(([,a]: any, [,b]: any) => b - a)
          .slice(0, 3)
          .map(([issue]) => issue);

        // Building-specific insights
        if (patterns.common_issues.includes('leak')) {
          patterns.building_specific_insights.push('Building has recurring leak issues - suggest proactive maintenance');
        }
        if (patterns.common_issues.includes('service_charge')) {
          patterns.building_specific_insights.push('Residents frequently query service charges - consider detailed annual breakdown');
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not analyze historical patterns:', error);
  }

  return patterns;
}

/**
 * Build Enhanced System Message with Phase 3 Intelligence
 */
function buildEnhancedSystemMessage(
  templateVariations: any,
  adaptedTone: any,
  legalCompliance: any,
  languagePreference: any,
  historicalPatterns: any
) {
  return `You are BlocIQ's advanced AI property management assistant with Phase 3 contextual intelligence.

🎯 RESPONSE TEMPLATE: ${templateVariations.primary_template}
📝 STRUCTURE: ${templateVariations.structure.join(' → ')}

🎭 TONE ADAPTATION:
- Style: ${adaptedTone.tone_style}
- Formality: ${adaptedTone.formality_level}
- Technical Detail: ${adaptedTone.technical_detail}
- Empathy Level: ${adaptedTone.empathy_level}

⚖️ LEGAL COMPLIANCE (${legalCompliance.risk_level.toUpperCase()} RISK):
- Regulations: ${legalCompliance.applicable_regulations.join(', ')}
- Mandatory Elements: ${legalCompliance.mandatory_clauses.join('; ')}
${legalCompliance.statutory_requirements.length > 0 ? `- Statutory Requirements: ${legalCompliance.statutory_requirements.join('; ')}` : ''}

🌍 LANGUAGE/CULTURAL:
- Language: ${languagePreference.detected_language}
- Complexity: ${languagePreference.complexity_level}
${languagePreference.cultural_considerations.length > 0 ? `- Considerations: ${languagePreference.cultural_considerations.join(', ')}` : ''}

📊 HISTORICAL INSIGHTS:
${historicalPatterns.pattern_count > 0 ? `- Past Interactions: ${historicalPatterns.pattern_count}` : ''}
${historicalPatterns.common_issues.length > 0 ? `- Common Issues: ${historicalPatterns.common_issues.join(', ')}` : ''}
${historicalPatterns.building_specific_insights.length > 0 ? `- Building Insights: ${historicalPatterns.building_specific_insights.join('; ')}` : ''}

GENERATE A COMPLETE EMAIL REPLY:
- Use British English property management terminology
- Follow the specified tone and structure exactly
- Include all mandatory legal elements for ${legalCompliance.risk_level} risk issues
- Adapt complexity to ${languagePreference.complexity_level} level
- Apply historical insights where relevant
- End with appropriate sign-off and contact information placeholders

Remember: This is a COMPLETE email reply, not a draft or template.`;
}

/**
 * Generate Intelligent Follow-up Scheduling - Phase 3 Final Feature
 */
function generateIntelligentFollowUp(
  primaryIssue: string,
  urgencyLevel: string,
  legalCompliance: any,
  historicalPatterns: any,
  building: any
) {
  const followUp = {
    strategy: 'adaptive',
    escalation_timeline: [] as Array<{days: number, action: string, trigger?: string}>,
    monitoring_points: [] as Array<{timing: string, check: string, method: string}>,
    success_criteria: [] as string[],
    risk_mitigation: [] as string[]
  };

  // Base escalation timeline by issue type and urgency
  const baseTimelines = {
    leak: {
      critical: [
        { days: 1, action: 'Immediate contractor contact confirmation' },
        { days: 2, action: 'Site visit completion check' },
        { days: 7, action: 'Temporary repairs completion' },
        { days: 14, action: 'Permanent solution implementation' },
        { days: 30, action: 'Insurance claim status and final resolution' }
      ],
      high: [
        { days: 2, action: 'Investigation appointment confirmation' },
        { days: 5, action: 'Cause identification and responsibility determination' },
        { days: 10, action: 'Repair works commencement' },
        { days: 21, action: 'Completion and damage assessment' }
      ],
      medium: [
        { days: 3, action: 'Investigation scheduling' },
        { days: 7, action: 'Report and recommendations' },
        { days: 14, action: 'Repair works planning' },
        { days: 28, action: 'Resolution confirmation' }
      ]
    },
    service_charge: {
      high: [
        { days: 2, action: 'Detailed breakdown provision' },
        { days: 7, action: 'Supporting documentation sharing' },
        { days: 14, action: 'Query resolution or tribunal guidance' },
        { days: 30, action: 'Formal dispute process if required' }
      ],
      medium: [
        { days: 3, action: 'Explanation and documentation' },
        { days: 10, action: 'Follow-up on understanding' },
        { days: 21, action: 'Payment arrangement if needed' }
      ]
    },
    safety: {
      critical: [
        { days: 1, action: 'Safety assessment completion', trigger: 'immediate_danger' },
        { days: 2, action: 'Emergency measures implementation' },
        { days: 5, action: 'Specialist contractor engagement' },
        { days: 10, action: 'Regulatory compliance verification' },
        { days: 21, action: 'Long-term safety solution confirmation' }
      ]
    },
    noise: {
      high: [
        { days: 2, action: 'Incident documentation and investigation' },
        { days: 7, action: 'Mediation attempt or neighbour contact' },
        { days: 14, action: 'Monitoring period assessment' },
        { days: 28, action: 'Formal enforcement if required' }
      ]
    },
    maintenance: {
      critical: [
        { days: 1, action: 'Emergency response confirmation' },
        { days: 3, action: 'Temporary solution implementation' },
        { days: 10, action: 'Permanent repair completion' }
      ],
      high: [
        { days: 2, action: 'Contractor appointment scheduling' },
        { days: 7, action: 'Repair works commencement' },
        { days: 14, action: 'Completion and quality check' }
      ]
    }
  };

  // Select appropriate timeline
  const issueTimelines = baseTimelines[primaryIssue as keyof typeof baseTimelines];
  if (issueTimelines) {
    const urgencyTimeline = issueTimelines[urgencyLevel as keyof typeof issueTimelines];
    if (urgencyTimeline) {
      followUp.escalation_timeline = [...urgencyTimeline];
    }
  }

  // Add legal compliance checkpoints
  if (legalCompliance.risk_level === 'critical' || legalCompliance.risk_level === 'high') {
    followUp.escalation_timeline.push({
      days: 7,
      action: 'Legal compliance verification',
      trigger: 'regulatory_requirements'
    });

    if (legalCompliance.statutory_requirements.length > 0) {
      followUp.escalation_timeline.push({
        days: 14,
        action: 'Statutory requirement fulfilment check',
        trigger: 'legal_obligations'
      });
    }
  }

  // Historical pattern adaptations
  if (historicalPatterns.common_issues.includes(primaryIssue)) {
    followUp.strategy = 'proactive_historical';
    followUp.escalation_timeline.unshift({
      days: 0,
      action: 'Proactive communication based on building history'
    });
  }

  // Monitoring points
  followUp.monitoring_points = [
    {
      timing: 'daily',
      check: 'Email read receipt and response monitoring',
      method: 'automated'
    },
    {
      timing: 'weekly',
      check: 'Resolution progress assessment',
      method: 'system_check'
    },
    {
      timing: 'bi-weekly',
      check: 'Resident satisfaction survey trigger',
      method: 'automated_survey'
    }
  ];

  // Success criteria based on issue type
  switch (primaryIssue) {
    case 'leak':
      followUp.success_criteria = [
        'Source identified and repaired',
        'Damage assessed and insurance claim initiated',
        'Affected residents notified of resolution',
        'No further leak reports within 30 days'
      ];
      break;
    case 'service_charge':
      followUp.success_criteria = [
        'Query fully explained with documentation',
        'Resident understanding confirmed',
        'Any disputes resolved or tribunal process initiated',
        'Payment arrangements confirmed if applicable'
      ];
      break;
    case 'safety':
      followUp.success_criteria = [
        'Safety hazard eliminated or controlled',
        'Regulatory compliance achieved',
        'All residents informed of resolution',
        'Preventive measures implemented'
      ];
      break;
    default:
      followUp.success_criteria = [
        'Issue acknowledged and understood',
        'Action plan implemented',
        'Resident satisfaction achieved',
        'Follow-up requirements completed'
      ];
  }

  // Risk mitigation strategies
  followUp.risk_mitigation = [
    'Automated reminder system for missed deadlines',
    'Escalation to senior management if targets missed',
    'Regular communication to prevent dissatisfaction',
    'Documentation trail for legal protection'
  ];

  if (building?.name && historicalPatterns.building_specific_insights.length > 0) {
    followUp.risk_mitigation.push(
      `Building-specific protocols: ${historicalPatterns.building_specific_insights.join('; ')}`
    );
  }

  return followUp;
}

// Export the wrapped handler with subscription middleware
export const POST = withOutlookSubscription(handleBlocIQOutlookAI, {
  requestType: 'ai_chat',
  tokensRequired: 5, // AI chat requires more tokens
  includeBuildings: true
});