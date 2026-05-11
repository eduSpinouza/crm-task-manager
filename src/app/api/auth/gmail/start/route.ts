import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { randomBytes } from 'crypto';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'openid',
    'email',
].join(' ');

export async function GET(request: NextRequest) {
    // Require a valid session — we need the username to key the account in Redis
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: 'Google OAuth is not configured on the server. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI.' },
            { status: 500 }
        );
    }

    // state encodes a CSRF nonce + the username so the callback can store the
    // account in the right Redis key without relying on the session cookie
    // (the callback could arrive in a popup with no cookie in some browsers).
    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ nonce, username: payload.userId })).toString('base64url');

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent', // forces refresh_token issuance even if previously authorized
        state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(authUrl);
}
