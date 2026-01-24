import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const orderId = searchParams.get('orderId');
    const token = request.headers.get('authorization');

    if (!taskId || !orderId) {
        return NextResponse.json({ error: 'taskId and orderId are required' }, { status: 400 });
    }

    if (!token) {
        return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    try {
        const v = Date.now();
        const targetUrl = `https://crm.cashimex.mx/api/manage/urge/task/getTaskInfo/${taskId}/${orderId}?v=${v}`;

        // Use same auth pattern as list endpoint
        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        const response = await axios.get(targetUrl, {
            headers: {
                'Authentication': authToken,
                'Accept': 'application/json',
                'Cookie': `Admin-Token=${token}`
            }
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Task Info Proxy Error:', error.message);
        if (error.response) {
            return NextResponse.json(error.response.data, { status: error.response.status });
        }
        return NextResponse.json(
            { error: 'Failed to fetch task info', details: error.message },
            { status: 500 }
        );
    }
}
