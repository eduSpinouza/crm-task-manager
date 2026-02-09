import { NextRequest, NextResponse } from 'next/server';
import { EmailService, UserData } from '@/lib/email/EmailService';

// Test email override - set to a specific email to redirect all emails for testing, or null to disable
const TEST_EMAIL_OVERRIDE: string | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { users, subject, bodyTemplate, emailConfig } = body as {
            users: UserData[];
            subject: string;
            bodyTemplate: string;
            emailConfig: {
                provider: 'gmail';
                user: string;
                appPassword: string;
            };
        };

        // Validate required fields
        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'No users provided' }, { status: 400 });
        }
        if (!subject || !bodyTemplate) {
            return NextResponse.json({ error: 'Subject and body template required' }, { status: 400 });
        }
        if (!emailConfig || !emailConfig.user || !emailConfig.appPassword) {
            return NextResponse.json({ error: 'Email configuration required' }, { status: 400 });
        }

        // TEST MODE: Override first user's email for testing
        let usersToSend = users;
        if (TEST_EMAIL_OVERRIDE) {
            usersToSend = users.map((u, i) =>
                i === 0 ? { ...u, email: TEST_EMAIL_OVERRIDE } : u
            );
            console.log(`[TEST MODE] First email redirected to: ${TEST_EMAIL_OVERRIDE}`);
        }

        // Create email service with config
        const emailService = new EmailService({
            provider: emailConfig.provider,
            gmail: {
                user: emailConfig.user,
                appPassword: emailConfig.appPassword,
            },
        });

        // Send emails with rate limiting
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
