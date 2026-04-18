import { NextRequest } from 'next/server';
import { setSheetsAccount } from '@/lib/sheetsAccount';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
        return htmlClose('error', `Google denied access: ${error}`);
    }

    if (!code || !stateParam) {
        return htmlClose('error', 'Missing code or state in callback.');
    }

    let username: string;
    try {
        const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
        username = decoded.username;
        if (!username) throw new Error('Missing username in state');
    } catch {
        return htmlClose('error', 'Invalid state parameter.');
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_SHEETS_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return htmlClose('error', 'Google Sheets OAuth is not configured on the server.');
    }

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.refresh_token) {
            console.error('[SheetsCallback] Token exchange failed:', tokenData);
            return htmlClose('error', 'Failed to obtain refresh token. Make sure you granted offline access and try again.');
        }

        // Fetch Google account email from userinfo
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        if (!userInfoRes.ok || !userInfo.email) {
            return htmlClose('error', 'Could not retrieve Google account address.');
        }

        await setSheetsAccount(username, {
            email: userInfo.email,
            refreshToken: tokenData.refresh_token,
            createdAt: Date.now(),
        });

        return htmlClose('success', userInfo.email);
    } catch (err: any) {
        console.error('[SheetsCallback] Unexpected error:', err);
        return htmlClose('error', 'An unexpected error occurred.');
    }
}

function htmlClose(status: 'success' | 'error', detail: string) {
    const html = `<!DOCTYPE html>
<html>
<head><title>Google Sheets Connection</title></head>
<body>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'sheets-oauth', status: '${status}', detail: ${JSON.stringify(detail)} },
        window.location.origin
      );
    }
  } catch(e) {}
  window.close();
</script>
<p>${status === 'success' ? `Connected ${detail} successfully. You can close this window.` : `Error: ${detail}`}</p>
</body>
</html>`;
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
        status: status === 'success' ? 200 : 400,
    });
}
