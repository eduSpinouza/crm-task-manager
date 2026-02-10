import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, signJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Authenticate against stored credentials
        const user = authenticateUser(username, password);
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Get client info
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Create session (invalidates any previous session for this user)
        const session = createSession(user.username, ip, userAgent);

        // Sign JWT with session ID
        const token = signJWT({
            userId: user.username,
            sessionId: session.sessionId,
        });

        // Set JWT as httpOnly cookie
        const response = NextResponse.json({
            success: true,
            user: { name: user.username },
            msg: 'Login successful',
            warning: 'This account is licensed for single-user access. Logging in from another device will end your current session.',
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
    } catch (error: any) {
        console.error('Login error:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
