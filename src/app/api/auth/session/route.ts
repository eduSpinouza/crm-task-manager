import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

// Check if current session is still valid
// NOTE: Currently uses JWT-only validation (no server-side session check)
// because Vercel serverless doesn't share in-memory state between instances.
// TODO: Add Vercel KV (free tier) to enable single-session enforcement.
export async function GET(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 });
    }

    // JWT is valid and not expired — session is good
    return NextResponse.json({
        valid: true,
        user: { name: payload.userId },
    });
}

// Logout - clear cookie
export async function DELETE(request: NextRequest) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    return response;
}
