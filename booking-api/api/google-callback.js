import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const redirectUri = `${process.env.BACKEND_URL}/api/google-callback`;
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const { tokens } = await oauth2.getToken(String(req.query.code || ''));
    if (!tokens.refresh_token) {
      return res.status(400).send('Google did not return a refresh token. Revoke the app connection and authorize again.');
    }
    res.status(200).send(`Authorization successful. Save this refresh token securely as GOOGLE_REFRESH_TOKEN in Vercel, then close this window: ${tokens.refresh_token}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Google authorization failed.');
  }
}
