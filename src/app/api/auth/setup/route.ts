import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

// Dev-only utility to generate password hashes
// Usage: GET /api/auth/setup?password=mypassword
export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    if (!password) {
        return NextResponse.json({
            error: 'Provide ?password=yourpassword to generate a hash',
            usage: 'GET /api/auth/setup?password=mypassword',
        }, { status: 400 });
    }

    const hash = hashPassword(password);

    return NextResponse.json({
        password,
        hash,
        instruction: 'Add this to your USERS_CONFIG env var as: [{"username":"youruser","passwordHash":"' + hash + '"}]',
    });
}
