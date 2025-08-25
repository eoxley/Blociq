import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin privileges
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole || !['admin', 'manager'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions for bulk import' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      type, 
      data, 
      category, 
      source, 
      version,
      overwrite = false 
    } = body

    if (!type || !data) {
      return NextResponse.json({ 
        error: 'Missing required fields: type and data' 
      }, { status: 400 })
    }

    let results: any = {
      imported: { documents: 0, standards: 0, guidance: 0 },
      errors: [],
      warnings: []
    }

    try {
      switch (type) {
        case 'documents':
          results = await importDocuments(data, overwrite)
          break

        case 'standards':
          results = await importStandards(data, overwrite)
          break

        case 'guidance':
          results = await importGuidance(data, overwrite)
          break

        case 'all':
          // Import all types
          const docResults = await importDocuments(data.documents || [], overwrite)
          const stdResults = await importStandards(data.standards || [], overwrite)
          const guideResults = await importGuidance(data.guidance || [], overwrite)
          
          results.imported.documents = docResults.imported.documents
          results.imported.standards = stdResults.imported.standards
          results.imported.guidance = guideResults.imported.guidance
          results.errors = [...docResults.errors, ...stdResults.errors, ...guideResults.errors]
          results.warnings = [...docResults.warnings, ...stdResults.warnings, ...guideResults.warnings]
          break

        default:
          return NextResponse.json({ 
            error: 'Invalid type. Use: documents, standards, guidance, or all' 
          }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: `Bulk import completed successfully`,
        results
      })

    } catch (importError) {
      console.error('Bulk import error:', importError)
      return NextResponse.json({ 
        error: 'Import failed', 
        details: importError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Bulk import API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function importDocuments(documents: any[], overwrite: boolean) {
  const results = { imported: { documents: 0 }, errors: [], warnings: [] }

  for (const doc of documents) {
    try {
      // Check if document already exists
      if (!overwrite) {
        const { data: existing } = await supabase
          .from('industry_documents')
          .select('id')
          .eq('title', doc.title)
          .eq('category', doc.category)
          .single()

        if (existing) {
          results.warnings.push(`Document "${doc.title}" already exists, skipping`)
          continue
        }
      }

      const { data, error } = await supabase
        .from('industry_documents')
        .insert({
          title: doc.title,
          category: doc.category,
          source: doc.source || 'Bulk Import',
          version: doc.version || 'Current',
          file_url: doc.file_url || '',
          file_name: doc.file_name || doc.title,
          file_size: doc.file_size || 0,
          mime_type: doc.mime_type || 'application/pdf',
          extracted_content: doc.extracted_content || doc.content || '',
          status: 'processed',
          processed_at: new Date().toISOString(),
          tags: doc.tags || [],
          uploaded_by: user.id
        })
        .select()
        .single()

      if (error) {
        results.errors.push(`Failed to import document "${doc.title}": ${error.message}`)
      } else {
        results.imported.documents++
        
        // Create knowledge extractions if content exists
        if (doc.extracted_content || doc.content) {
          await createKnowledgeExtractions(data.id, doc.extracted_content || doc.content, doc.category)
        }
      }
    } catch (error) {
      results.errors.push(`Error importing document "${doc.title}": ${error.message}`)
    }
  }

  return results
}

async function importStandards(standards: any[], overwrite: boolean) {
  const results = { imported: { standards: 0 }, errors: [], warnings: [] }

  for (const standard of standards) {
    try {
      // Check if standard already exists
      if (!overwrite) {
        const { data: existing } = await supabase
          .from('industry_standards')
          .select('id')
          .eq('name', standard.name)
          .eq('category', standard.category)
          .single()

        if (existing) {
          results.warnings.push(`Standard "${standard.name}" already exists, skipping`)
          continue
        }
      }

      const { error } = await supabase
        .from('industry_standards')
        .insert({
          name: standard.name,
          category: standard.category,
          description: standard.description,
          requirements: standard.requirements || [],
          frequency: standard.frequency,
          legal_basis: standard.legal_basis,
          guidance_notes: standard.guidance_notes
        })

      if (error) {
        results.errors.push(`Failed to import standard "${standard.name}": ${error.message}`)
      } else {
        results.imported.standards++
      }
    } catch (error) {
      results.errors.push(`Error importing standard "${standard.name}": ${error.message}`)
    }
  }

  return results
}

async function importGuidance(guidance: any[], overwrite: boolean) {
  const results = { imported: { guidance: 0 }, errors: [], warnings: [] }

  for (const guide of guidance) {
    try {
      // Check if guidance already exists
      if (!overwrite) {
        const { data: existing } = await supabase
          .from('industry_guidance')
          .select('id')
          .eq('title', guide.title)
          .eq('category', guide.category)
          .single()

        if (existing) {
          results.warnings.push(`Guidance "${guide.title}" already exists, skipping`)
          continue
        }
      }

      const { error } = await supabase
        .from('industry_guidance')
        .insert({
          category: guide.category,
          title: guide.title,
          description: guide.description,
          content: guide.content,
          source: guide.source,
          version: guide.version,
          relevance_score: guide.relevance_score || 100,
          tags: guide.tags || []
        })

      if (error) {
        results.errors.push(`Failed to import guidance "${guide.title}": ${error.message}`)
      } else {
        results.imported.guidance++
      }
    } catch (error) {
      results.errors.push(`Error importing guidance "${guide.title}": ${error.message}`)
    }
  }

  return results
}

async function createKnowledgeExtractions(documentId: string, content: string, category: string) {
  try {
    const extractions = [
      {
        document_id: documentId,
        extraction_type: 'guidance',
        content: content.length > 500 ? content.substring(0, 500) + '...' : content,
        confidence_score: 0.8,
        metadata: { category, extraction_method: 'bulk_import' }
      }
    ]

    for (const extraction of extractions) {
      await supabase
        .from('industry_knowledge_extractions')
        .insert(extraction)
    }
  } catch (error) {
    console.error('Warning: Failed to create knowledge extractions:', error.message)
  }
}
