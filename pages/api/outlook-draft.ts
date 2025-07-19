import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subject, body, to } = req.body;

  const {
    OUTLOOK_TENANT_ID,
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_USER_EMAIL,
  } = process.env;

  try {
    // Step 1: Get access token
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID!,
        client_secret: OUTLOOK_CLIENT_SECRET!,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 2: Create the draft
    const draftRes = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${OUTLOOK_USER_EMAIL}/messages`,
      {
        subject: subject || 'Draft from BlocIQ Assistant',
        body: {
          contentType: 'Text',
          content: body || '',
        },
        toRecipients: to ? [{ emailAddress: { address: to } }] : [],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ success: true, draftId: draftRes.data.id });
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message || 'Axios error occurred';
    }
    
    console.error('Outlook Draft Error:', errorMessage);
    res.status(500).json({ error: 'Failed to create Outlook draft' });
  }
}
