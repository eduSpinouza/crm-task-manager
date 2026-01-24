import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
    const token = request.headers.get('Authorization');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    try {
        const { taskIds, note, followResult, ...otherData } = await request.json();

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return NextResponse.json({ error: 'No taskIds provided' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        // URL with dynamic timestamp
        const v = Date.now();
        const targetUrl = `https://crm.cashimex.mx/api/manage/urge/task/addFollow?v=${v}`;

        // Auth token with Bear prefix (matching other routes)
        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        for (const taskId of taskIds) {
            // Loop with delay
            await delay(500); // 500ms delay to prevent rate limiting

            const payload = {
                taskId,
                note,
                followResult,
                ...otherData
                // Expected: phone, followTarget="0", ptpTime=null etc. passed from frontend
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
