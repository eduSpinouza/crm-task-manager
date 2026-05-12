import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, validateSession, destroySession, findUserAsync } from '@/lib/auth';
import { getLicenseDaysLeft, getLicenseStatus } from '@/lib/licenseUtils';

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

    // Server-side session check (Redis-backed)
    const isValid = await validateSession(payload.userId, payload.sessionId);
    if (!isValid) {
        return NextResponse.json({
            valid: false,
            reason: 'session_ended',
            message: 'Your session was ended because the account was accessed from another location.',
        }, { status: 401 });
    }

    const user = await findUserAsync(payload.userId);
    const licenseStatus = getLicenseStatus(user?.license);

    if (licenseStatus === 'expired') {
        await destroySession(payload.userId);
        return NextResponse.json({
            valid: false,
            reason: 'license_expired',
            message: 'Your license has expired. Please contact your administrator.',
        }, { status: 401 });
    }

    const daysLeft = getLicenseDaysLeft(user?.license);

    return NextResponse.json({
        valid: true,
        user: { name: payload.userId, role: payload.role || 'user' },
        license: { daysLeft, status: licenseStatus },
    });
}

// Logout - destroy session and clear cookie
export async function DELETE(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    if (token) {
        const payload = verifyJWT(token);
        if (payload) {
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
