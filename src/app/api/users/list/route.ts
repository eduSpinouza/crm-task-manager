import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    const token = request.headers.get('Authorization');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Default payload structure based on user request
        // The frontend should send { current: page, size: 10, ...filters }

        // Generate dynamic URL parameters
        const now = new Date();
        // const v = now.getFullYear().toString() +
        //     (now.getMonth() + 1).toString().padStart(2, '0') +
        //     now.getDate().toString().padStart(2, '0');
        const v = Date.now();
        const targetUrl = `https://crm.cashimex.mx/api/manage/urge/task/waitUrgeTaskPage?v=${v}`;
        // Note: The v and t params here seem to be checked by the server, but might be static or dynamic.
        // For list fetch, user provided: v=653704202&t=1769114579708
        // We can try to make them dynamic or use the user's provided ones. Let's use dynamic to be safe, or static if that fails.
        // Given the login worked with dynamic (assumed), we'll try dynamic here too or strip them if not strictly needed?
        // User provided URL has them. Let's keep the user's provided URL parameters for now to ensure it works as verified by them.

        // Actually, let's use the exact URL provided by user for the list endpoint.

        // The external API uses 'authentication' header with 'Bear ' prefix (not 'Authorization' / 'Bearer')
        // If the token already includes 'Bear ', use it as-is; otherwise prepend it
        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        const response = await axios.post(
            targetUrl,
            {
                productName: body.productName ?? null,
                followResult: body.followResult ?? null,
                repayId: body.repayId ?? null,
                userId: body.userId ?? null,
                appCode: body.appCode ?? null,
                overdueDay: body.overdueDay ?? null,
                urgeUserId: body.urgeUserId ?? null,
                stageId: body.stageId ?? 1,
                phone: body.phone ?? null,
                userName: body.userName ?? null,
                repayType: body.repayType ?? null,
                urgeOrganizationIds: body.urgeOrganizationIds ?? null,
                current: String(body.current ?? 1),
                size: String(body.size ?? 10)
            },
            {
                headers: {
                    'Authentication': authToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cookie': `Admin-Token=${token}`
                }
            }
        );

        console.log(JSON.stringify(response.data));

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('User List Proxy Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch users', details: error.message },
            { status: error.response?.status || 500 }
        );
    }
}
