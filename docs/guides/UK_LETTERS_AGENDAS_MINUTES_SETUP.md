# UK Letters + Agendas + Minutes System

## Overview
This system provides three specialized AI endpoints for drafting UK business letters, meeting agendas, and meeting minutes for leasehold block management.

## Endpoints

### 1. Letter Draft (`/api/drafts/letter`)
Drafts UK business letters with proper formatting and tone.

**Request:**
```javascript
await fetch("/api/drafts/letter", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({
    to_name: "Jane Smith",
    to_address: "Flat 4B, Ashwood House, London W1",
    subject_hint: "Lift outage update",
    context: "We need to confirm contractor visit times and reassure residents."
  })
});
```

**Response:**
```json
{
  "content": "Full letter text, ready to paste",
  "meta": {
    "subject": "Re: Lift Outage Update",
    "to_name": "Jane Smith",
    "to_address": "Flat 4B, Ashwood House, London W1",
    "cc": [],
    "enclosures": [],
    "body": "Dear Jane Smith\n\n..."
  }
}
```

### 2. Agenda Draft (`/api/drafts/agenda`)
Creates meeting agendas for AGM, Directors, or Contractor meetings.

**Request:**
```javascript
await fetch("/api/drafts/agenda", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({
    meeting_type: "Directors",
    date: "2025-09-10", 
    time: "18:00", 
    location: "Zoom",
    chair: "Alex Morgan", 
    secretary: "Ellie Oxley",
    attendees: ["Alex Morgan","Priya Shah","Sam Lee"],
    inputs: "Discuss FRA actions; review budget; leaks at flats 2C/3B."
  })
});
```

**Response:**
```json
{
  "content": "Human-readable agenda",
  "json": {
    "title": "Directors' Meeting",
    "date": "2025-09-10",
    "time": "18:00",
    "location": "Zoom",
    "chair": "Alex Morgan",
    "secretary": "Ellie Oxley",
    "attendees": ["Alex Morgan","Priya Shah","Sam Lee"],
    "apologies": [],
    "items": [
      {
        "id": "1",
        "title": "Apologies",
        "outcome": "info",
        "owner": "Secretary",
        "duration_mins": 5,
        "docs": []
      }
    ]
  }
}
```

### 3. Minutes Draft (`/api/drafts/minutes`)
Creates meeting minutes from agenda and notes.

**Request:**
```javascript
await fetch("/api/drafts/minutes", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({
    agenda_json, // pass through the JSON from the agenda endpoint if you have it
    notes: "Actions agreed on lifts and leaks…",
    decisions: "Approved previous minutes; agreed tender route for roof.",
    attendees: ["Alex Morgan","Priya Shah","Sam Lee"],
    apologies: ["Jordan White"],
    next_meeting: { date: "2025-10-15", time: "18:00", location: "Zoom" }
  })
});
```

**Response:**
```json
{
  "content": "Readable minutes text",
  "json": {
    "title": "Directors' Meeting Minutes",
    "date": "2025-09-10",
    "attendees": ["Alex Morgan","Priya Shah","Sam Lee"],
    "apologies": ["Jordan White"],
    "items": [
      {
        "id": "1",
        "title": "Apologies",
        "summary": "Jordan White sent apologies",
        "decision": null,
        "vote": null
      }
    ],
    "actions": [
      {
        "id": "1",
        "owner": "Alex Morgan",
        "action": "Contact lift contractor",
        "due_date": "2025-09-15"
      }
    ],
    "next_meeting": {
      "date": "2025-10-15",
      "time": "18:00",
      "location": "Zoom"
    }
  }
}
```

## UK Business Letter Rules
- UK English spelling and dates (e.g., 16 August 2025)
- Recipient block at top with optional subject line "Re: …"
- Greeting: "Dear [Name]" (no comma)
- Sign off: "Kind regards"
- Clear 3–6 paragraph structure: purpose → facts → request/next steps → closing
- Never advise withholding service charges
- Reference FTT s27A for payability if relevant

## Meeting Agenda Structure
- Default duration: 60 minutes (AGM: 120 minutes)
- Typical items: Apologies, Declarations, Approve previous minutes, Matters arising, Building updates, Finance snapshot, Major works/Section 20, Contractor/Insurer items, AOB, Next meeting
- Each item includes: title, outcome (info/decision), owner, duration, linked documents

## Meeting Minutes Structure
- Attendees and apologies
- Agenda items with brief summary
- Decisions and actions with owner and due date
- Votes/resolutions if any
- Risks and next meeting details
- Neutral tone with clear action list

## Configuration
The system uses prompts defined in `prompts/policy.yml` with merge rules for different contexts:
- `context == 'letter'` → includes `ask-blociq-core` and `uk-letter-style`
- `context == 'agenda'` → includes `ask-blociq-core` and `meeting-agenda`
- `context == 'minutes'` → includes `ask-blociq-core` and `meeting-minutes`

## Environment Variables
- `OPENAI_MAIN_MODEL`: OpenAI model to use (defaults to "gpt-4o-mini")
- `OPENAI_API_KEY`: OpenAI API key
