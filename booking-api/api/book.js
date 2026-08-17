import { google } from 'googleapis';

export default async function handler(req, res) {
  const origin = process.env.SITE_ORIGIN || 'https://www.bamswebsitebuilder.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, start, end, notes = '' } = req.body || {};
    if (!name || !email || !start || !end) return res.status(400).json({ error: 'Missing booking details' });

    const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      sendUpdates: 'all',
      requestBody: {
        summary: `Free Website Consultation - ${name}`,
        description: notes,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: [{ email }]
      }
    });

    res.status(200).json({ ok: true, eventId: event.data.id, htmlLink: event.data.htmlLink });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create booking' });
  }
}
