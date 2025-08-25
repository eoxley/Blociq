#!/usr/bin/env node

/**
 * Bulk Import Industry Knowledge
 * 
 * This script allows developers to bulk import industry knowledge from:
 * 1. JSON files with structured data
 * 2. CSV files with document metadata
 * 3. Direct API calls with predefined knowledge
 * 
 * Usage:
 * node scripts/bulk-import-industry-knowledge.js --type=json --file=knowledge-data.json
 * node scripts/bulk-import-industry-knowledge.js --type=csv --file=documents.csv
 * node scripts/bulk-import-industry-knowledge.js --type=api --category="Fire & Life Safety"
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value;
  }
});

const { type, file, category, source, version } = options;

if (!type) {
  console.error('❌ Please specify import type: --type=json|csv|api');
  process.exit(1);
}

async function main() {
  try {
    console.log('🚀 Starting bulk import of industry knowledge...\n');

    switch (type) {
      case 'json':
        if (!file) {
          console.error('❌ Please specify JSON file: --file=path/to/file.json');
          process.exit(1);
        }
        await importFromJSON(file);
        break;

      case 'csv':
        if (!file) {
          console.error('❌ Please specify CSV file: --file=path/to/file.csv');
          process.exit(1);
        }
        await importFromCSV(file);
        break;

      case 'api':
        await importFromAPI(category, source, version);
        break;

      default:
        console.error('❌ Invalid import type. Use: json, csv, or api');
        process.exit(1);
    }

    console.log('\n✅ Bulk import completed successfully!');
  } catch (error) {
    console.error('\n❌ Bulk import failed:', error.message);
    process.exit(1);
  }
}

async function importFromJSON(filePath) {
  console.log(`📁 Importing from JSON file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (data.documents) {
    await importDocuments(data.documents);
  }
  
  if (data.standards) {
    await importStandards(data.standards);
  }
  
  if (data.guidance) {
    await importGuidance(data.guidance);
  }
}

async function importFromCSV(filePath) {
  console.log(`📁 Importing from CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Simple CSV parser (you might want to use a proper CSV library)
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const documents = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const doc = {};
    headers.forEach((header, index) => {
      doc[header] = values[index] || '';
    });
    documents.push(doc);
  }
  
  await importDocuments(documents);
}

async function importFromAPI(category, source, version) {
  console.log(`🔌 Importing via API for category: ${category || 'all'}`);
  
  // Predefined industry knowledge data
  const predefinedKnowledge = {
    standards: [
      {
        name: "BS 9999:2017 Fire Safety",
        category: "Fire & Life Safety",
        description: "Code of practice for fire safety in the design, management and use of buildings",
        requirements: [
          "Fire risk assessment",
          "Fire safety strategy",
          "Emergency planning",
          "Staff training"
        ],
        frequency: "Annual review",
        legal_basis: "Building Regulations Approved Document B",
        guidance_notes: "Essential for all non-domestic buildings"
      },
      {
        name: "BS 5839-1:2017 Fire Detection",
        category: "Fire & Life Safety",
        description: "Fire detection and fire alarm systems for buildings",
        requirements: [
          "System design to BS 5839-1",
          "Installation to BS 5839-6",
          "Commissioning to BS 5839-1",
          "Maintenance to BS 5839-1"
        ],
        frequency: "Weekly testing, annual service",
        legal_basis: "Fire Safety Order 2005",
        guidance_notes: "Critical for building safety compliance"
      }
    ],
    guidance: [
      {
        category: "Fire & Life Safety",
        title: "Fire Safety Management Best Practice",
        description: "Comprehensive guide to fire safety management in buildings",
        content: "Effective fire safety management requires a systematic approach including regular risk assessments, staff training, emergency planning, and ongoing monitoring. Key elements include: 1) Fire risk assessment review at least annually, 2) Staff fire safety training for all employees, 3) Emergency evacuation procedures and drills, 4) Fire safety equipment maintenance schedules, 5) Incident reporting and investigation procedures.",
        source: "Industry Best Practice",
        version: "2024",
        relevance_score: 95,
        tags: ["fire safety", "management", "best practice", "compliance"]
      }
    ]
  };

  if (category) {
    predefinedKnowledge.standards = predefinedKnowledge.standards.filter(s => 
      s.category.toLowerCase().includes(category.toLowerCase())
    );
    predefinedKnowledge.guidance = predefinedKnowledge.guidance.filter(g => 
      g.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  await importStandards(predefinedKnowledge.standards);
  await importGuidance(predefinedKnowledge.guidance);
}

async function importDocuments(documents) {
  console.log(`📄 Importing ${documents.length} documents...`);
  
  for (const doc of documents) {
    try {
      const { data, error } = await supabase
        .from('industry_documents')
        .insert({
          title: doc.title,
          category: doc.category,
          source: doc.source || 'Imported',
          version: doc.version || 'Current',
          file_url: doc.file_url || '',
          file_name: doc.file_name || doc.title,
          file_size: doc.file_size || 0,
          mime_type: doc.mime_type || 'application/pdf',
          extracted_content: doc.extracted_content || doc.content || '',
          status: 'processed',
          processed_at: new Date().toISOString(),
          tags: doc.tags || []
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to import document "${doc.title}":`, error.message);
      } else {
        console.log(`✅ Imported document: ${doc.title}`);
        
        // If document has extracted content, create knowledge extractions
        if (doc.extracted_content || doc.content) {
          await createKnowledgeExtractions(data.id, doc.extracted_content || doc.content, doc.category);
        }
      }
    } catch (error) {
      console.error(`❌ Error importing document "${doc.title}":`, error.message);
    }
  }
}

async function importStandards(standards) {
  console.log(`📋 Importing ${standards.length} standards...`);
  
  for (const standard of standards) {
    try {
      const { data, error } = await supabase
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
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to import standard "${standard.name}":`, error.message);
      } else {
        console.log(`✅ Imported standard: ${standard.name}`);
      }
    } catch (error) {
      console.error(`❌ Error importing standard "${standard.name}":`, error.message);
    }
  }
}

async function importGuidance(guidance) {
  console.log(`📚 Importing ${guidance.length} guidance documents...`);
  
  for (const guide of guidance) {
    try {
      const { data, error } = await supabase
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
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to import guidance "${guide.title}":`, error.message);
      } else {
        console.log(`✅ Imported guidance: ${guide.title}`);
      }
    } catch (error) {
      console.error(`❌ Error importing guidance "${guide.title}":`, error.message);
    }
  }
}

async function createKnowledgeExtractions(documentId, content, category) {
  try {
    // Simple extraction logic - in production you'd use AI
    const extractions = [
      {
        document_id: documentId,
        extraction_type: 'guidance',
        content: content.substring(0, 500) + '...',
        confidence_score: 0.8,
        metadata: { category, extraction_method: 'bulk_import' }
      }
    ];

    for (const extraction of extractions) {
      await supabase
        .from('industry_knowledge_extractions')
        .insert(extraction);
    }
  } catch (error) {
    console.error('Warning: Failed to create knowledge extractions:', error.message);
  }
}

// Run the script
main();
