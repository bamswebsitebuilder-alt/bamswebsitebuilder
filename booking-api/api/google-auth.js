import { google } from 'googleapis';

export default async function handler(req, res) {
  const origin = process.env.SITE_ORIGIN || 'https://www.bamswebsitebuilder.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const redirectUri = `${process.env.BACKEND_URL}/api/google-callback`;
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events']
  });

  res.redirect(url);
}
