/**
 * POST /api/users/export-sheets
 *
 * Creates a new Google Spreadsheet in the user's Drive and writes the
 * provided user rows into it.
 *
 * Body: { rows: ExportUserData[], title?: string }
 * Returns: { url: string, spreadsheetId: string }
 *
 * Error responses:
 *   401  — not authenticated
 *   409  — sheets_not_connected (user hasn't completed OAuth)
 *   500  — server / Google API error
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getSheetsAccount, deleteSheetsAccount } from '@/lib/sheetsAccount';
import { mintAccessToken } from '@/lib/sheetsAuth';
import { EXPORT_COLUMNS, toRow, type ExportUserData } from '@/lib/export/columns';

const SHEETS_CHUNK_SIZE = 10_000; // rows per values append request

export async function POST(request: NextRequest) {
    // Auth
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = payload.userId;

    // Load Sheets account
    const acct = await getSheetsAccount(username);
    if (!acct) {
        return NextResponse.json({ error: 'sheets_not_connected' }, { status: 409 });
    }

    // Mint access token — handle revoked refresh tokens
    let accessToken: string;
    try {
        accessToken = await mintAccessToken(acct.refreshToken);
    } catch (err: any) {
        if (err.message === 'invalid_grant') {
            await deleteSheetsAccount(username);
            return NextResponse.json({ error: 'sheets_not_connected' }, { status: 409 });
        }
        console.error('[export-sheets] Token mint failed:', err);
        return NextResponse.json({ error: 'Failed to authenticate with Google' }, { status: 500 });
    }

    // Parse body
    let rows: ExportUserData[];
    let title: string;
    try {
        const body = await request.json();
        rows = body.rows ?? [];
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        title = body.title || `User List ${dateStr}`;
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const authHeader = `Bearer ${accessToken}`;

    // 1. Create the spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: { title },
            sheets: [{ properties: { title: 'Users' } }],
        }),
    });

    if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        console.error('[export-sheets] Create failed:', errData);
        return NextResponse.json({ error: 'Failed to create Google Spreadsheet' }, { status: 500 });
    }

    const { spreadsheetId, spreadsheetUrl } = await createRes.json();

    // 2. Write header + data rows in chunks
    const headers = EXPORT_COLUMNS.map(c => c.header);
    const allRows = [headers, ...rows.map(r => toRow(r))];

    // Write first chunk starting at A1
    let startRow = 1;
    for (let i = 0; i < allRows.length; i += SHEETS_CHUNK_SIZE) {
        const chunk = allRows.slice(i, i + SHEETS_CHUNK_SIZE);
        const range = `Users!A${startRow}`;

        const writeRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
            {
                method: 'PUT',
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: chunk }),
            }
        );

        if (!writeRes.ok) {
            const errData = await writeRes.json().catch(() => ({}));
            console.error('[export-sheets] Write failed at row', startRow, ':', errData);
            return NextResponse.json({ error: 'Failed to write data to Google Spreadsheet' }, { status: 500 });
        }

        startRow += chunk.length;
    }

    return NextResponse.json({ url: spreadsheetUrl, spreadsheetId });
}
