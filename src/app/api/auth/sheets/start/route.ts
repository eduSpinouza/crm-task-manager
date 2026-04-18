import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { randomBytes } from 'crypto';

// drive.file scope: create and manage files created by this app in the user's Drive.
// This is sufficient to create and write new spreadsheets.
// No need for the broader `spreadsheets` scope.
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email',
].join(' ');

export async function GET(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_SHEETS_OAUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: 'Google Sheets OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_SHEETS_OAUTH_REDIRECT_URI.' },
            { status: 500 }
        );
    }

    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ nonce, username: payload.userId })).toString('base64url');

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
