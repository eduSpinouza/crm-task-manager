import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getAccount } from '@/lib/emailAccounts';
import { EmailService, UserData } from '@/lib/email/EmailService';

// Set EMAIL_TEST_OVERRIDE env var to redirect all sends to a single address during testing
const TEST_EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE ?? null;

export async function POST(request: NextRequest) {
    // Require a valid session
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { users, subject, bodyTemplate, accountId } = body as {
            users: UserData[];
            subject: string;
            bodyTemplate: string;
            accountId: string;
        };

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'No users provided' }, { status: 400 });
        }
        if (!subject || !bodyTemplate) {
            return NextResponse.json({ error: 'Subject and body template required' }, { status: 400 });
        }
        if (!accountId) {
            return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
        }

        // Look up the account in Redis — ensures only the account owner can use it
        const account = await getAccount(payload.userId, accountId);
        if (!account) {
            return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
        }

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: 'Google OAuth credentials are not configured on the server.' },
                { status: 500 }
            );
        }

        // TEST MODE: redirect first recipient for smoke-testing
        let usersToSend = users;
        if (TEST_EMAIL_OVERRIDE) {
            usersToSend = users.map((u, i) =>
                i === 0 ? { ...u, email: TEST_EMAIL_OVERRIDE } : u
            );
            console.log(`[TEST MODE] First email redirected to: ${TEST_EMAIL_OVERRIDE}`);
        }

        const emailService = new EmailService({
            provider: 'gmail-rest',
            user: account.email,
            clientId,
            clientSecret,
            refreshToken: account.refreshToken,
        });

        const result = await emailService.sendToUsers(usersToSend, subject, bodyTemplate, 200);

        return NextResponse.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
            details: result.results,
        });
    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send emails' },
            { status: 500 }
        );
    }
}
