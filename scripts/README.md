# Block Management Test Data Generator

This script sends 25 realistic property management emails and creates 5 calendar events using Microsoft Graph API to populate your BlocIQ system with test data.

## Features

- **25 Realistic Emails**: Property management scenarios including service charges, maintenance requests, complaints, etc.
- **5 Calendar Events**: Block management meetings and events
- **Inbox Summary**: Shows recent messages with flags and categories
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Built-in delays to prevent API rate limits

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the scripts directory:

```bash
MSAL_CLIENT_ID=your-client-id
MSAL_CLIENT_SECRET=your-client-secret
MSAL_TENANT_ID=your-tenant-id
```

### 3. Microsoft Graph API Permissions

Ensure your Azure AD app has the following permissions:
- `Mail.Send` - Send emails
- `Calendars.ReadWrite` - Create calendar events
- `Mail.Read` - Read inbox messages

## Usage

### Run the Script

```bash
python send_test_emails.py
```

### Expected Output

```
🚀 Block Management Test Data Generator
==================================================
🔐 Getting access token...
✅ Access token obtained successfully

📧 Sending 25 emails...
--------------------------------------------------
[1/25] ✅ Sent: Service Charge Breakdown Request | Status: 202
[2/25] ✅ Sent: Ceiling Leak in Flat 12 | Status: 202
...

📅 Creating calendar events...
--------------------------------------------------
[1/5] ✅ Created event: Fire Alarm Testing | Status: 201
[2/5] ✅ Created event: Lift Maintenance Review | Status: 201
...

📊 Summary
==================================================
✅ Emails sent: 25/25
✅ Events created: 5/5

📬 Inbox Summary (10 recent messages):
------------------------------------------------------------
📧 Service Charge Breakdown Request
   From: eleanor.oxley@blociq.co.uk
   Received: 2024-01-15T10:30:00Z
   Flag: notFlagged | Categories: []

🎉 Test data generation complete!
```

## Email Subjects Included

1. Service Charge Breakdown Request
2. Ceiling Leak in Flat 12
3. Request for Electric Meter Access
4. Query About Pets in Lease
5. Lift Outage Reported – Urgent
6. Bike Storage Overcrowding
7. Airbnb Lettings in the Block
8. Tree Trimming Schedule
9. AGM Meeting Documents Missing
10. Insurance Certificate Request
11. Pest Issue in Basement
12. Communal Lighting Fault
13. Water Pressure Complaint
14. Question on Major Works Cost
15. EICR Certificate Renewal Reminder
16. Fire Alarm Trigger – False Alert
17. Cleaning Contractor Performance
18. Subletting Consent Query
19. Blocked Drainage in Courtyard
20. Change of Correspondence Address
21. Window Cleaning Schedule Request
22. Refuse Area Cleanliness
23. Concierge Not Present
24. Leak Trace Investigation Follow-Up
25. Complaint About Balcony Use

## Calendar Events Created

1. Fire Alarm Testing (1 day from now)
2. Lift Maintenance Review (2 days from now)
3. Service Charge Budget Planning (3 days from now)
4. Residents AGM (5 days from now)
5. Contractor Site Visit (6 days from now)

## Troubleshooting

### Common Issues

1. **Authentication Error**: Check your client ID, secret, and tenant ID
2. **Permission Error**: Ensure your Azure AD app has the required permissions
3. **Rate Limiting**: The script includes delays, but you may need to increase them
4. **Network Issues**: Check your internet connection and firewall settings

### Debug Mode

To see more detailed error information, you can modify the script to print full response details:

```python
print(f"Response: {response.text}")
```

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for production deployments
- Consider using managed identities for Azure-hosted applications
- Rotate client secrets regularly

## Customization

You can easily modify the script to:
- Change email subjects and bodies
- Add more calendar events
- Modify the recipient email address
- Adjust timing and delays
- Add different types of test data 