import { NextRequest, NextResponse } from 'next/server';
import {
    verifyJWT, listUsersAsync, createUser, deleteUserAsync, setUserBlocked, setUserLicense,
    renameUser, getLoginHistory, getKickHistory, sessionStore, destroySession, type UserRole,
} from '@/lib/auth';

// Helper to verify admin role from JWT
function getAdminPayload(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    const payload = verifyJWT(token);
    if (!payload || payload.role !== 'admin') return null;

    return payload;
}

// GET — List all users (admin only)
export async function GET(request: NextRequest) {
    const admin = getAdminPayload(request);
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const users = await listUsersAsync();

        // Enrich each user with session info and security logs
        const safeUsers = await Promise.all(users.map(async u => {
            const [currentSession, loginHistory, kickHistory] = await Promise.all([
                sessionStore.get(u.username),
                getLoginHistory(u.username),
                getKickHistory(u.username),
            ]);
            return {
                username: u.username,
                role: u.role,
                createdAt: u.createdAt,
                createdBy: u.createdBy,
                blocked: u.blocked ?? false,
                license: u.license ?? null,
                currentSession: currentSession ?? null,
                loginHistory,
                kickHistory,
            };
        }));

        return NextResponse.json({ success: true, users: safeUsers });
    } catch (error: any) {
        console.error('List users error:', error.message);
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
}

// POST — Create a new user (admin only)
export async function POST(request: NextRequest) {
    const admin = getAdminPayload(request);
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username, password, role } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        if (username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const validRoles: UserRole[] = ['admin', 'user'];
        const userRole: UserRole = validRoles.includes(role) ? role : 'user';

        const user = await createUser(username, password, userRole, admin.userId);

        return NextResponse.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                createdAt: user.createdAt,
                createdBy: user.createdBy,
            },
        });
    } catch (error: any) {
        console.error('Create user error:', error.message);

        if (error.message.includes('already exists')) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        if (error.message.includes('Redis is required')) {
            return NextResponse.json({ error: 'User management requires Redis. Please configure Upstash Redis.' }, { status: 503 });
        }

        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

// DELETE — Delete a user (admin only)
export async function DELETE(request: NextRequest) {
    const admin = getAdminPayload(request);
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        await deleteUserAsync(username, admin.userId);

        return NextResponse.json({ success: true, message: `User "${username}" deleted` });
    } catch (error: any) {
        console.error('Delete user error:', error.message);

        if (error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message.includes('Cannot delete your own')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

// PATCH — Block or unblock a user (admin only)
export async function PATCH(request: NextRequest) {
    const admin = getAdminPayload(request);
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username, blocked, action, durationDays } = body;

        if (!username) {
            return NextResponse.json({ error: 'username is required' }, { status: 400 });
        }

        if (action === 'rename') {
            const { newUsername } = body;
            if (!newUsername || typeof newUsername !== 'string' || newUsername.trim().length < 3) {
                return NextResponse.json({ error: 'New username must be at least 3 characters' }, { status: 400 });
            }
            await renameUser(username, newUsername.trim(), admin.userId);
            return NextResponse.json({ success: true, message: `User renamed to "${newUsername.trim()}"` });
        }

        if (action === 'setLicense') {
            const validPresets = [30, 60, 90, 180, 365];
            if (!durationDays || !validPresets.includes(durationDays)) {
                return NextResponse.json(
                    { error: 'durationDays must be one of: 30, 60, 90, 180, 365' },
                    { status: 400 }
                );
            }
            let resolvedStartDate: number | undefined;
            if (body.startDate !== undefined) {
                const parsed = Number(body.startDate);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    return NextResponse.json({ error: 'startDate must be a valid timestamp' }, { status: 400 });
                }
                resolvedStartDate = parsed;
            }
            await setUserLicense(username, durationDays, resolvedStartDate);
            return NextResponse.json({ success: true, message: `License set for "${username}": ${durationDays} days` });
        }

        if (typeof blocked !== 'boolean') {
            return NextResponse.json({ error: 'blocked (boolean) or a valid action is required' }, { status: 400 });
        }

        if (username === admin.userId) {
            return NextResponse.json({ error: 'Cannot block your own account' }, { status: 400 });
        }

        await setUserBlocked(username, blocked);

        // When blocking, immediately destroy their active session
        if (blocked) {
            await destroySession(username);
        }

        return NextResponse.json({ success: true, message: `User "${username}" ${blocked ? 'blocked' : 'unblocked'}` });
    } catch (error: any) {
        console.error('Block/unblock user error:', error.message);

        if (error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message.includes('Redis is required')) {
            return NextResponse.json({ error: 'User management requires Redis.' }, { status: 503 });
        }

        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
