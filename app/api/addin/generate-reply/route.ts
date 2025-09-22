// app/api/addin/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { addinReplyAdapter } from '@/ai/adapters/addinReplyAdapter';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { originalSubject, originalSender, originalBody, context, buildingId, unitId } = body;

        console.log('🔄 BlocIQ Add-in reply generation:', {
            subject: originalSubject,
            sender: originalSender,
            bodyLength: originalBody?.length || 0,
            context,
            buildingId,
            unitId
        });

        // Validate required fields
        if (!originalBody && !originalSubject) {
            return NextResponse.json({
                success: false,
                error: 'Missing email content'
            }, { status: 400 });
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Resolve building/unit context from Supabase if provided
        let buildingContext = null;
        let leaseSummary = null;

        if (buildingId || unitId) {
            try {
                // Get building details
                if (buildingId) {
                    const { data: buildingData } = await supabase
                        .from('buildings')
                        .select('id, name, address')
                        .eq('id', buildingId)
                        .single();

                    if (buildingData) {
                        buildingContext = {
                            buildingId: buildingData.id,
                            buildingName: buildingData.name,
                            address: buildingData.address
                        };
                    }
                }

                // Get unit details if provided
                if (unitId) {
                    const { data: unitData } = await supabase
                        .from('units')
                        .select('id, unit_number, building_id')
                        .eq('id', unitId)
                        .single();

                    if (unitData) {
                        buildingContext = {
                            ...buildingContext,
                            unitId: unitData.id,
                            unitNumber: unitData.unit_number
                        };
                    }
                }

                // Try to get lease summary data from document_jobs for this building/unit
                if (buildingId) {
                    const { data: leaseJobs } = await supabase
                        .from('document_jobs')
                        .select('summary_json')
                        .eq('linked_building_id', buildingId)
                        .eq('status', 'READY')
                        .not('summary_json', 'is', null)
                        .order('updated_at', { ascending: false })
                        .limit(1);

                    if (leaseJobs && leaseJobs.length > 0) {
                        leaseSummary = leaseJobs[0].summary_json;
                    }
                }

            } catch (error) {
                console.error('⚠️ Error resolving building/unit context:', error);
                // Continue without context
            }
        }

        // Build Outlook context
        const outlookContext = {
            from: originalSender,
            subject: originalSubject,
            bodyPreview: originalBody,
            receivedDateTime: new Date().toISOString()
        };

        // Generate reply using BlocIQ pipeline
        const replyResult = await addinReplyAdapter({
            userInput: 'Generate a professional reply to this email',
            outlookContext,
            buildingContext,
            leaseSummary,
            userId: user.id
        });

        if (!replyResult.success) {
            return NextResponse.json({
                success: false,
                error: replyResult.message || 'Failed to generate reply'
            }, { status: 500 });
        }

        // Return in the format expected by Outlook add-in
        return NextResponse.json({
            success: true,
            reply: replyResult.bodyHtml,
            subjectSuggestion: replyResult.subjectSuggestion,
            usedFacts: replyResult.usedFacts || [],
            sources: replyResult.sources || [],
            timestamp: new Date().toISOString(),
            buildingContext: buildingContext?.buildingName ? {
                building: buildingContext.buildingName,
                unit: buildingContext.unitNumber
            } : null
        });

    } catch (error) {
        console.error('❌ Error generating BlocIQ reply:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to generate reply'
        }, { status: 500 });
    }
}

// CORS headers for Outlook add-in
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

