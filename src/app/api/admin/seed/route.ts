import { NextRequest, NextResponse } from 'next/server';
import { seedUsersFromEnv } from '@/lib/auth';

// POST — Seed users from USERS_CONFIG env var into Redis
// Also creates a 'superadmin' account if adminPassword is provided
// Protected by SEED_SECRET env var (or dev mode)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const seedSecret = process.env.SEED_SECRET;

        if (seedSecret) {
            if (body.secret !== seedSecret) {
                return NextResponse.json({ error: 'Invalid seed secret' }, { status: 403 });
            }
        } else {
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({
                    error: 'Set SEED_SECRET env var to use this endpoint in production',
                }, { status: 403 });
            }
        }

        // adminPassword: if provided, creates a 'superadmin' account with this password
        const result = await seedUsersFromEnv(body.adminPassword);

        return NextResponse.json({
            success: true,
            message: 'Seed complete',
            seeded: result.seeded,
            skipped: result.skipped,
            admin: result.admin || null,
        });
    } catch (error: any) {
        console.error('Seed error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
