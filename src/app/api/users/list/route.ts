import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    const token = request.headers.get('Authorization');
    const baseUrl = request.headers.get('X-API-Base-URL');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    if (!baseUrl) {
        return NextResponse.json({ error: 'Missing API base URL. Configure it in Settings.' }, { status: 400 });
    }

    try {
        const body = await request.json();

        const v = Date.now();
        const targetUrl = `${baseUrl}/api/manage/urge/task/waitUrgeTaskPage?v=${v}`;

        // The external API uses 'authentication' header with 'Bear ' prefix
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
