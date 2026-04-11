import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import {
    listAccounts,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    type EmailAccountPublic,
} from '@/lib/emailAccounts';

function getUsername(request: NextRequest): string | null {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyJWT(token);
    return payload?.userId ?? null;
}

// GET — list accounts (never returns refreshToken)
export async function GET(request: NextRequest) {
    const username = getUsername(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await listAccounts(username);
    const safe: EmailAccountPublic[] = accounts.map(({ refreshToken: _rt, ...rest }) => rest);
    return NextResponse.json({ accounts: safe });
}

// PATCH — rename label or set as default
export async function PATCH(request: NextRequest) {
    const username = getUsername(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, label, isDefault } = body as { id: string; label?: string; isDefault?: boolean };

    if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (isDefault === true) {
        const ok = await setDefaultAccount(username, id);
        if (!ok) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (label !== undefined) {
        const updated = await updateAccount(username, id, { label });
        if (!updated) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

// DELETE — remove an account
export async function DELETE(request: NextRequest) {
    const username = getUsername(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const ok = await deleteAccount(username, id);
    if (!ok) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
}
