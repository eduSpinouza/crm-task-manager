import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserAsync, createSession, signJWT, logLoginEvent } from '@/lib/auth';
import { isLicenseExpired } from '@/lib/licenseUtils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Get client info
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Authenticate against Redis first, then USERS_CONFIG fallback
        const user = await authenticateUserAsync(username, password);
        if (!user) {
            await logLoginEvent(username, ip, userAgent, false);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (isLicenseExpired(user.license)) {
            await logLoginEvent(user.username, ip, userAgent, false);
            return NextResponse.json(
                { error: 'Your license has expired. Please contact your administrator to renew.' },
                { status: 403 }
            );
        }

        // Log successful login before creating session
        await logLoginEvent(user.username, ip, userAgent, true);

        // Create session (invalidates any previous session for this user)
        const session = await createSession(user.username, ip, userAgent);

        // Sign JWT with session ID and role
        const token = signJWT({
            userId: user.username,
            sessionId: session.sessionId,
            role: user.role || 'user',
        });

        // Set JWT as httpOnly cookie
        const response = NextResponse.json({
            success: true,
            user: { name: user.username, role: user.role || 'user' },
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
