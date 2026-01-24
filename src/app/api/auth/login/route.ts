import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');

    if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Mock Login Success
    // We are no longer authenticating against the external API here.
    // This is just a gatekeeper for the internal app.
    console.log(`Mock login attempt for user: ${username} `);

    return NextResponse.json({
        success: true,
        user: { name: username },
        token: 'internal-mock-token', // This token is just to satisfy the frontend check
        msg: 'Mock Login Successful'
    });
}
