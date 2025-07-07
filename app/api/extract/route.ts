import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const prompt = `
You are an expert lease analyst AI.

From the lease content below, extract the following fields in structured JSON format.

Return **only** a single valid JSON object like this:

{
  "doc_type": "Lease",
  "building_name": "",
  "unit_reference": "",
  "is_headlease": false,
  "lease_start_date": "",
  "lease_end_date": "",
  "lease_term_years": "",
  "is_extended": false,
  "ownership_type": "Share of Freehold" | "Leasehold Only",
  "leaseholder_names": [],
  "leaseholder_contact": {
    "email": "",
    "phone": "",
    "correspondence_address": ""
  },
  "is_current_owner": true,
  "service_charge": {
    "apportionment": "",
    "frequency": "",
    "reserve_fund": "",
    "insurance_contribution": "",
    "special_terms": ""
  },
  "repair_responsibilities": {
    "demised_premises": "",
    "internal_repairs": "",
    "external_repairs": "",
    "common_parts_definition": "",
    "windows_balconies_roof": ""
  },
  "restrictions": {
    "subletting": "",
    "alterations": "",
    "pets": "",
    "noise": "",
    "flooring": "",
    "use": ""
  },
  "legal_clauses": {
    "landlord_notice_address": "",
    "service_method": "",
    "forfeiture_clause": "",
    "right_of_entry": "",
    "inspection_rights": ""
  },
  "building_rights": {
    "communal_areas": "",
    "repair_access": "",
    "fire_escape_rights": "",
    "bin_storage": ""
  },
  "optional": {
    "ground_rent_terms": "",
    "plans_attached": true,
    "schedule_of_condition": true,
    "deed_of_variation": true,
    "headlease_reference": ""
  }
}

Now, here is the lease content (you can truncate after 3000 words if needed):
---
${text.slice(0, 3000)}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const response = completion.choices[0]?.message?.content;

  try {
    const data = JSON.parse(response || "{}");
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to parse response", response);
    return NextResponse.json({ error: "Invalid JSON from OpenAI", raw: response }, { status: 500 });
  }
}
