import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, validateSession, destroySession } from '@/lib/auth';

// Check if current session is still valid
export async function GET(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 });
    }

    // Server-side session check (now async and supports Redis)
    const isValid = await validateSession(payload.userId, payload.sessionId);
    if (!isValid) {
        return NextResponse.json({
            valid: false,
            reason: 'session_ended',
            message: 'Your session was ended because the account was accessed from another location.',
        }, { status: 401 });
    }

    return NextResponse.json({
        valid: true,
        user: { name: payload.userId },
    });
}

// Logout - destroy session and clear cookie
export async function DELETE(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    if (token) {
        const payload = verifyJWT(token);
        if (payload) {
            // Best effort to destroy session (now async)
            try {
                await destroySession(payload.userId);
            } catch (e) {
                console.error("Failed to destroy session:", e);
            }
        }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    return response;
}
