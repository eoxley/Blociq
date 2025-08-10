/**
 * Utility function to handle AI document analysis after upload
 * This function is called automatically after a document is uploaded
 */

export const handleUploadComplete = async (documentId: string) => {
  try {
    console.log('🤖 Starting AI document analysis for document:', documentId);
    
    const res = await fetch('/api/extract-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });

    const result = await res.json();

    if (res.ok) {
      console.log('✅ AI summary complete:', result);
      return {
        success: true,
        data: result,
        message: `Document summarised as ${result.doc_type || 'Unknown'}`
      };
    } else {
      console.error('❌ Error extracting summary:', result.error);
      return {
        success: false,
        error: result.error,
        message: 'Could not summarise document'
      };
    }
  } catch (error) {
    console.error('❌ AI analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Could not summarise document'
    };
  }
};

/**
 * Update document with AI-extracted data
 */
export const updateDocumentWithAIAnalysis = async (
  documentId: string, 
  analysisResult: any,
  supabase: any
) => {
  try {
    const updateData: any = {};
    
    // Update document type if AI found a better one
    if (analysisResult.doc_type && analysisResult.doc_type !== 'Unknown') {
      updateData.doc_type = analysisResult.doc_type;
    }
    
    // Update issue date if found
    if (analysisResult.issue_date && analysisResult.issue_date !== 'Not found') {
      updateData.start_date = analysisResult.issue_date;
    }
    
    // Update expiry date if found
    if (analysisResult.expiry_date && analysisResult.expiry_date !== 'Not found') {
      updateData.expiry_date = analysisResult.expiry_date;
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('compliance_docs')
        .update(updateData)
        .eq('id', documentId);
        
      if (updateError) {
        console.error('⚠️ Failed to update document with AI data:', updateError);
        return false;
      } else {
        console.log('✅ Document updated with AI analysis results');
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating document with AI analysis:', error);
    return false;
  }
};

/**
 * Complete workflow: Upload document, analyze with AI, and update database
 */
export const uploadAndAnalyzeDocument = async (
  file: File,
  buildingId: number,
  uploadedBy: string,
  supabase: any
) => {
  try {
    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const filePath = `compliance_docs/${buildingId}/${Date.now()}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    const publicUrl = supabase.storage
      .from("documents")
      .getPublicUrl(filePath).data.publicUrl;

    // 2. Create database record
    const documentId = crypto.randomUUID();
    const { data, error: insertError } = await supabase
      .from('compliance_docs')
      .insert([{
        id: documentId,
        building_id: buildingId,
        doc_url: publicUrl,
        uploaded_by: uploadedBy,
        doc_type: 'Unknown', // Will be updated by AI
        start_date: null,
        expiry_date: null,
        reminder_days: null,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    // 3. Trigger AI analysis
    const analysisResult = await handleUploadComplete(documentId);
    
    if (analysisResult.success) {
      // 4. Update document with AI results
      await updateDocumentWithAIAnalysis(documentId, analysisResult.data, supabase);
    }

    return {
      success: true,
      documentId,
      analysisResult,
      data: data?.[0]
    };

  } catch (error) {
    console.error('❌ Upload and analysis workflow failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 