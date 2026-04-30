import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const orderId = searchParams.get('orderId');
    const token = request.headers.get('authorization');
    const baseUrl = request.headers.get('x-api-base-url');

    if (!taskId || !orderId) {
        return NextResponse.json({ error: 'taskId and orderId are required' }, { status: 400 });
    }

    if (!token) {
        return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    if (!baseUrl) {
        return NextResponse.json({ error: 'Missing API base URL. Configure it in Settings.' }, { status: 400 });
    }

    try {
        const v = Date.now();
        const targetUrl = `${baseUrl}/api/manage/urge/task/getTaskInfo/${taskId}/${orderId}?v=${v}`;

        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        const workerUrl = process.env.CLOUDFLARE_WORKER_URL ?? targetUrl;
        const workerSecret = process.env.CLOUDFLARE_WORKER_SECRET;

        const response = await axios.get(workerUrl, {
            headers: {
                'Authentication': authToken,
                'Accept': 'application/json',
                'Cookie': `Admin-Token=${token}`,
                ...(workerUrl !== targetUrl && workerSecret && {
                    'X-Target-URL': targetUrl,
                    'X-Worker-Secret': workerSecret,
                }),
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
