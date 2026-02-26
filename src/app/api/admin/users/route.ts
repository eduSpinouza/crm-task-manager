import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, listUsersAsync, createUser, deleteUserAsync, type UserRole } from '@/lib/auth';

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

        // Strip password hashes from response
        const safeUsers = users.map(u => ({
            username: u.username,
            role: u.role,
            createdAt: u.createdAt,
            createdBy: u.createdBy,
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
