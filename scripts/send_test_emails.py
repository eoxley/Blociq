#!/usr/bin/env python3
"""
Block Management Test Data Generator
Sends 25 realistic property management emails and creates 5 calendar events
using Microsoft Graph API.
"""

import requests
from datetime import datetime, timedelta
import random
import time
import json
import os
from typing import List, Dict, Any

# Configuration - Replace with your real credentials
CLIENT_ID = os.getenv('MSAL_CLIENT_ID', 'your-client-id')
CLIENT_SECRET = os.getenv('MSAL_CLIENT_SECRET', 'your-client-secret')
TENANT_ID = os.getenv('MSAL_TENANT_ID', 'your-tenant-id')
EMAIL = 'eleanor.oxley@blociq.co.uk'

GRAPH_URL = 'https://graph.microsoft.com/v1.0'

def get_access_token() -> str:
    """
    Get access token using client credentials flow.
    You can also use a cached token or implement MSAL for better token management.
    """
    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'scope': 'https://graph.microsoft.com/.default'
    }
    
    response = requests.post(token_url, data=data)
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        raise Exception(f"Failed to get access token: {response.text}")

def send_email(headers: Dict[str, str], subject: str, body: str, recipient: str) -> bool:
    """Send a single email using Microsoft Graph API."""
    email_data = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": recipient
                    }
                }
            ]
        },
        "saveToSentItems": "false"
    }

    try:
        response = requests.post(
            f"{GRAPH_URL}/users/{EMAIL}/sendMail", 
            headers=headers, 
            json=email_data
        )
        
        if response.status_code in [200, 202]:
            print(f"✅ Sent: {subject} | Status: {response.status_code}")
            return True
        else:
            print(f"❌ Failed: {subject} | Status: {response.status_code} | Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending {subject}: {str(e)}")
        return False

def create_calendar_event(headers: Dict[str, str], title: str, day_offset: int) -> bool:
    """Create a calendar event using Microsoft Graph API."""
    now = datetime.utcnow()
    start_time = (now + timedelta(days=day_offset)).replace(hour=10, minute=0)
    end_time = start_time + timedelta(hours=1)

    event_data = {
        "subject": title,
        "start": {
            "dateTime": start_time.isoformat(), 
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": end_time.isoformat(), 
            "timeZone": "UTC"
        },
        "location": {
            "displayName": "BlocIQ HQ"
        },
        "body": {
            "contentType": "Text",
            "content": f"Block management meeting: {title}"
        }
    }

    try:
        response = requests.post(
            f"{GRAPH_URL}/users/{EMAIL}/calendar/events", 
            headers=headers, 
            json=event_data
        )
        
        if response.status_code == 201:
            print(f"✅ Created event: {title} | Status: {response.status_code}")
            return True
        else:
            print(f"❌ Failed to create event: {title} | Status: {response.status_code} | Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating event {title}: {str(e)}")
        return False

def get_inbox_summary(headers: Dict[str, str]) -> None:
    """Get a summary of recent inbox messages."""
    try:
        response = requests.get(
            f"{GRAPH_URL}/users/{EMAIL}/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime desc", 
            headers=headers
        )
        
        if response.status_code == 200:
            messages = response.json().get('value', [])
            print(f"\n📬 Inbox Summary ({len(messages)} recent messages):")
            print("-" * 60)
            
            for msg in messages:
                received = msg.get('receivedDateTime', 'Unknown')
                subject = msg.get('subject', 'No Subject')
                sender = msg.get('from', {}).get('emailAddress', {}).get('address', 'Unknown')
                flagged = msg.get("flag", {}).get("flagStatus", "notFlagged")
                categories = msg.get("categories", [])
                
                print(f"📧 {subject}")
                print(f"   From: {sender}")
                print(f"   Received: {received}")
                print(f"   Flag: {flagged} | Categories: {categories}")
                print()
        else:
            print(f"❌ Failed to get inbox: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting inbox summary: {str(e)}")

def main():
    """Main function to send emails and create calendar events."""
    print("🚀 Block Management Test Data Generator")
    print("=" * 50)
    
    # Get access token
    try:
        print("🔐 Getting access token...")
        access_token = get_access_token()
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        print("✅ Access token obtained successfully")
    except Exception as e:
        print(f"❌ Failed to get access token: {str(e)}")
        return

    # Email subjects and bodies for realistic property management scenarios
    subjects = [
        "Service Charge Breakdown Request",
        "Ceiling Leak in Flat 12",
        "Request for Electric Meter Access",
        "Query About Pets in Lease",
        "Lift Outage Reported – Urgent",
        "Bike Storage Overcrowding",
        "Airbnb Lettings in the Block",
        "Tree Trimming Schedule",
        "AGM Meeting Documents Missing",
        "Insurance Certificate Request",
        "Pest Issue in Basement",
        "Communal Lighting Fault",
        "Water Pressure Complaint",
        "Question on Major Works Cost",
        "EICR Certificate Renewal Reminder",
        "Fire Alarm Trigger – False Alert",
        "Cleaning Contractor Performance",
        "Subletting Consent Query",
        "Blocked Drainage in Courtyard",
        "Change of Correspondence Address",
        "Window Cleaning Schedule Request",
        "Refuse Area Cleanliness",
        "Concierge Not Present",
        "Leak Trace Investigation Follow-Up",
        "Complaint About Balcony Use"
    ]

    bodies = [
        "Dear team, could you please send a full breakdown of the latest service charge? Thank you.",
        "There is a water leak through the ceiling in my living room—please advise what to do.",
        "I need access to the electric meter cupboard for a reading.",
        "Can you confirm if pets are allowed in the building under my lease?",
        "The lift in the West Block is out of order again, can you update us urgently?",
        "Bike storage is overflowing and needs a review or more racks.",
        "We've seen flats being let on Airbnb—please investigate.",
        "When is the next tree trimming scheduled for the garden?",
        "We didn't receive the documents before the AGM. Can these be shared?",
        "Please provide the latest insurance certificate for our records.",
        "There are rats in the bin area—can pest control attend?",
        "Several communal lights are out on the 2nd floor corridor.",
        "Water pressure is very low in my flat—any known issues?",
        "Can you explain how the major works were costed?",
        "The EICR looks due for renewal, is this being arranged?",
        "The alarm went off again in the middle of the night.",
        "The standard of cleaning has noticeably dropped lately.",
        "Do I need to apply for consent to sublet?",
        "There's water pooling in the courtyard—possibly blocked drains.",
        "I've changed address—please update my records.",
        "When are the windows due for cleaning next?",
        "The refuse area needs urgent attention.",
        "Concierge was absent during their shift yesterday.",
        "Any update on the leak trace above my flat?",
        "Neighbours are using the balcony for noisy gatherings at night."
    ]

    # Send emails
    print(f"\n📧 Sending {len(subjects)} emails...")
    print("-" * 50)
    
    successful_emails = 0
    for i, (subject, body) in enumerate(zip(subjects, bodies), 1):
        print(f"[{i}/{len(subjects)}] ", end="")
        if send_email(headers, subject, body, EMAIL):
            successful_emails += 1
        time.sleep(1)  # Prevent rate limits

    # Create calendar events
    print(f"\n📅 Creating calendar events...")
    print("-" * 50)
    
    events = [
        ("Fire Alarm Testing", 1),
        ("Lift Maintenance Review", 2),
        ("Service Charge Budget Planning", 3),
        ("Residents AGM", 5),
        ("Contractor Site Visit", 6),
    ]
    
    successful_events = 0
    for i, (title, day_offset) in enumerate(events, 1):
        print(f"[{i}/{len(events)}] ", end="")
        if create_calendar_event(headers, title, day_offset):
            successful_events += 1
        time.sleep(0.5)  # Prevent rate limits

    # Summary
    print(f"\n📊 Summary")
    print("=" * 50)
    print(f"✅ Emails sent: {successful_emails}/{len(subjects)}")
    print(f"✅ Events created: {successful_events}/{len(events)}")
    
    # Get inbox summary
    get_inbox_summary(headers)
    
    print(f"\n🎉 Test data generation complete!")

if __name__ == "__main__":
    main() 