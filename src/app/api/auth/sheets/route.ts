/**
 * GET  /api/auth/sheets  — returns { connected: boolean, email?: string }
 * DELETE /api/auth/sheets — disconnects the Google Sheets account
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getSheetsAccount, deleteSheetsAccount } from '@/lib/sheetsAccount';

function getUser(request: NextRequest): string | null {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyJWT(token);
    return payload?.userId ?? null;
}

export async function GET(request: NextRequest) {
    const username = getUser(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const acct = await getSheetsAccount(username);
    if (!acct) {
        return NextResponse.json({ connected: false });
    }
    return NextResponse.json({ connected: true, email: acct.email });
}

export async function DELETE(request: NextRequest) {
    const username = getUser(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteSheetsAccount(username);
    return NextResponse.json({ success: true });
}
