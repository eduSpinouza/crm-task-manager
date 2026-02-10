import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        const { taskIds, note, followResult, ...otherData } = await request.json();

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return NextResponse.json({ error: 'No taskIds provided' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        const v = Date.now();
        const targetUrl = `${baseUrl}/api/manage/urge/task/addFollow?v=${v}`;

        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        for (const taskId of taskIds) {
            await delay(500);

            const payload = {
                taskId,
                note,
                followResult,
                ...otherData
            };

            try {
                const response = await axios.post(
                    targetUrl,
                    payload,
                    {
                        headers: {
                            'Authentication': authToken,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Cookie': `Admin-Token=${token}`
                        }
                    }
                );
                results.push({ taskId, status: 'success', data: response.data });
            } catch (err: any) {
                console.error(`Follow up failed for taskId ${taskId}:`, err.message);
                errors.push({ taskId, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            failed: errors.length,
            results,
            errors
        });

    } catch (error: any) {
        console.error('Follow Up Proxy Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to process follow ups', details: error.message },
            { status: 500 }
        );
    }
}
