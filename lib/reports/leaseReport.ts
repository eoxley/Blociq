import type { PinCite } from "@/lib/reports/pincite";
import { findPinCites, findPinCitesWithPages, selectCitesForSection, formatPinCites } from "@/lib/reports/pincite";

export function renderLeaseReport(params: {
  fields: any;
  text?: string;              // pass full text if available
  pages?: string[] | null;    // pass per-page text if available
  confidence?: Record<string, number>;
  disclaimer?: string;
}) {
  const f = params.fields || {};
  const conf = params.confidence || {};
  const c = (k: string) => (f[k] ?? "Not explicitly stated; general covenant may apply.");
  const confLabel = (k: string) => conf[k] > 0.8 ? "✓" : conf[k] > 0.5 ? "~" : "?";
  const pages = params.pages ?? null;

  // Detect citations from text or pages
  let cites: PinCite[] = [];
  if (pages && pages.length) {
    cites = findPinCitesWithPages(pages);
  } else if (params.text) {
    cites = findPinCites(params.text);
  }

  // Helper to render a trailing citations line for a section
  const citeLine = (picked: PinCite[]) => picked.length ? formatPinCites(picked) : "";

  // Helper to create a section with citations
  const sec = (title: string, body: string, keywords: string[]) => {
    const picked = selectCitesForSection(cites, pages, keywords, 3);
    const citations = citeLine(picked);
    return [
      `## ${title}`,
      "",
      body,
      citations ? `\n${citations}` : "",
      "",
      "---",
      ""
    ].filter(line => line !== "").join("\n");
  };

  const parts: string[] = [];
  
  parts.push("# Lease Summary Report");
  parts.push("");
  parts.push(`**Generated:** ${new Date().toLocaleDateString('en-GB')} | **Source:** Document AI Enhanced${cites.length ? ` | **Citations Found:** ${cites.length}` : ""}`);
  parts.push("");
  parts.push("---");
  parts.push("");
  
  parts.push("## Executive Summary");
  parts.push("");
  parts.push(`This lease report covers the property at **${f.property_address || "Address not clearly identified"}**. `);
  parts.push(`The lease is between **${f.lessor_name || "Lessor TBD"}** (Lessor) and **${f.lessee_name || "Lessee TBD"}** (Lessee). `);
  parts.push(`${f.term_years ? `The lease term is **${f.term_years} years** ` : "Lease term not clearly specified "}`);
  parts.push(`${f.term_start ? `starting from **${f.term_start}**` : "with start date TBD"}. `);
  parts.push(`${f.service_charge_percent ? `Service charge apportionment is **${f.service_charge_percent}%**. ` : "Service charge percentage not specified. "}`);
  parts.push(`${f.ground_rent_terms ? `Ground rent: **${f.ground_rent_terms}**.` : "Ground rent terms not clearly stated."}`);
  parts.push("");
  parts.push("---");
  parts.push("");
  
  parts.push("## Basic Property Details");
  parts.push("");
  parts.push(`**Property Address:** ${confLabel('property_address')} ${c('property_address')}`);
  parts.push("");
  parts.push(`**Title Number:** ${confLabel('title_number')} ${f.title_number || "Not identified"}`);
  parts.push("");
  parts.push(`**Lessor:** ${confLabel('lessor_name')} ${c('lessor_name')}`);
  parts.push("");
  parts.push(`**Lessee:** ${confLabel('lessee_name')} ${c('lessee_name')}`);
  parts.push("");
  parts.push(`**Lease Term:** ${confLabel('term_years')} ${f.term_years ? `${f.term_years} years` : "Not clearly specified"}`);
  parts.push("");
  parts.push(`**Term Start:** ${confLabel('term_start')} ${c('term_start')}`);
  parts.push("");
  parts.push(`**Term End:** ${confLabel('term_end')} ${f.term_end || (f.term_start && f.term_years ? "Calculated from start date + term" : "Not specified")}`);
  parts.push("");
  parts.push("---");
  parts.push("");

  // Enhanced sections with citations
  parts.push(sec("Repair & Maintenance Obligations (split)",
    `${confLabel('repairs_split_summary')} ${c('repairs_split_summary')}`,
    ["repair", "maintain", "retained parts", "tenant covenants", "landlord covenants"]));

  parts.push(sec("Service Charge",
    `**Percentage:** ${confLabel('service_charge_percent')} ${f.service_charge_percent ? `${f.service_charge_percent}%` : "Unknown"}\n\n**Apportionment Basis:** ${confLabel('apportionment_basis')} ${c('apportionment_basis')}`,
    ["service charge", "service costs", "schedule 8", "management fee", "reserve"]));

  parts.push(sec("Ground Rent", 
    `${confLabel('ground_rent_terms')} ${c('ground_rent_terms')}`, 
    ["ground rent", "rent review", "RPI"]));

  parts.push(sec("Demised Premises (inclusions/exclusions)",
    "Not explicitly stated; general covenant may apply.",
    ["demised", "schedule 1", "property includes"]));

  parts.push(sec("Rights & Access / Services",
    "Not explicitly stated; general covenant may apply.",
    ["rights", "reservations", "schedule 3", "schedule 4", "access", "service media"]));

  parts.push(sec("Use Restrictions (pets, nuisance, ASB)",
    "Not explicitly stated; general covenant may apply.",
    ["use", "nuisance", "pets", "regulations", "schedule 6"]));

  parts.push(sec("Alterations / Improvements",
    `${confLabel('alterations_rules')} ${c('alterations_rules')}`,
    ["alteration", "structural", "consent", "decorat"]));

  parts.push(sec("Subletting & Assignment",
    `${confLabel('subletting_rules')} ${c('subletting_rules')}`,
    ["underlet", "assign", "part with possession", "AST"]));

  parts.push(sec("Insurance",
    `${confLabel('insurance_obligations')} ${c('insurance_obligations')}`,
    ["insurance", "rebuild", "insured risk", "schedule 7"]));

  parts.push(sec("Forfeiture / Remedial powers",
    "Not explicitly stated; general covenant may apply.",
    ["forfeit", "re-entry", "section 146", "breach", "remedy"]));

  parts.push("## Other Key Provisions");
  parts.push("");
  parts.push("Additional provisions not covered in standard categories.");
  parts.push("");
  parts.push("---");
  parts.push("");
  
  parts.push("## Confidence Indicators");
  parts.push("");
  parts.push("✓ = High confidence (80%+) | ~ = Medium confidence (50-80%) | ? = Low confidence (<50%)");
  parts.push("");
  parts.push(Object.keys(conf).length > 0 ? 
    Object.entries(conf)
      .filter(([_, score]) => typeof score === 'number')
      .map(([key, score]) => `- **${key.replace(/_/g, ' ')}**: ${confLabel(key)} ${Math.round((score as number) * 100)}%`)
      .join('\n') 
    : "No confidence data available.");
  parts.push("");
  parts.push("---");
  parts.push("");
  
  parts.push("## Disclaimer");
  parts.push("");
  parts.push(params.disclaimer || [
    "This is an AI-generated lease report based on document analysis.",
    "It is not legal advice and should not be relied upon for legal decisions.",
    "Please consult with a qualified legal professional for definitive interpretation.",
    "Accuracy depends on document quality and legibility of the source material."
  ].join(' '));
  parts.push("");

  return parts.join("\n");
}

export function renderLeaseReportHTML(params: {
  fields: any;
  text?: string;
  pages?: string[] | null;
  confidence?: Record<string, number>;
  disclaimer?: string;
}): string {
  const markdownContent = renderLeaseReport(params);
  
  // Simple markdown to HTML conversion for basic formatting
  return markdownContent
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
    .replace(/<p><hr><\/p>/g, '<hr>')
    .replace(/<p><ul>/g, '<ul>')
    .replace(/<\/ul><\/p>/g, '</ul>');
}