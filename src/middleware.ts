import { NextRequest, NextResponse } from 'next/server';

// Middleware runs on Edge runtime - only check for cookie existence
// Full JWT + session validation happens in API routes (Node.js runtime)
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes - no auth required
    const publicPaths = ['/login', '/about', '/privacy', '/api/auth/login', '/api/auth/setup', '/api/admin/seed', '/api/auth/gmail/callback'];
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Static files and Next.js internals - skip
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    // Check for auth cookie
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        // API routes return 401, page routes redirect to login
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Cookie exists - allow request through
    // Full JWT signature + session validation happens at the API route level
    // This is necessary because Edge runtime doesn't support Node.js crypto
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all routes except static files
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
