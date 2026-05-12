import { NextRequest, NextResponse } from 'next/server';
import { addAccount, listAccounts, updateAccount } from '@/lib/emailAccounts';

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

    // Decode state to get username
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
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return htmlClose('error', 'Google OAuth is not configured on the server.');
    }

    // Exchange auth code for tokens
    let refreshToken: string;
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
            console.error('[GmailCallback] Token exchange failed:', tokenData);
            return htmlClose('error', 'Failed to obtain refresh token. Make sure you granted offline access and try again.');
        }

        refreshToken = tokenData.refresh_token;

        // Fetch Gmail address from Google userinfo
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        if (!userInfoRes.ok || !userInfo.email) {
            return htmlClose('error', 'Could not retrieve Gmail address from Google.');
        }

        const existing = await listAccounts(username);
        const match = existing.find(a => a.email === userInfo.email);
        if (match) {
            await updateAccount(username, match.id, { refreshToken });
        } else {
            await addAccount(username, {
                email: userInfo.email,
                refreshToken,
            });
        }

        return htmlClose('success', userInfo.email);
    } catch (err: any) {
        console.error('[GmailCallback] Unexpected error:', err);
        return htmlClose('error', 'An unexpected error occurred.');
    }
}

/**
 * Returns a minimal HTML page that:
 * - Posts a message to window.opener so the Settings dialog can refresh
 * - Then closes the popup window
 */
function htmlClose(status: 'success' | 'error', detail: string) {
    const html = `<!DOCTYPE html>
<html>
<head><title>Gmail Connection</title></head>
<body>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'gmail-oauth', status: '${status}', detail: ${JSON.stringify(detail)} },
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
