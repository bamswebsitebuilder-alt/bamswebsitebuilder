import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const code = String(req.query.code || '');
    if (!code) return res.status(400).send('Missing Google authorization code.');

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      return res.status(400).send('Google did not return a refresh token. Revoke the app connection and authorize again.');
    }

    res.status(200).send(`Authorization successful. Save this refresh token securely as GOOGLE_REFRESH_TOKEN in Vercel, then close this window: ${tokens.refresh_token}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Google authorization failed.');
  }
}
