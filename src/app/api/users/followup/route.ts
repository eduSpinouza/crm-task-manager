import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getCountryConfig, cleanPhoneNumber } from '@/lib/phoneUtils';

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
        // Destructure `phone` out explicitly — the route always computes phone per-task
        // and must not let a top-level placeholder from the client overwrite it via ...otherData
        const { tasks, note, followResult, followTarget, phone: _ignored, ...otherData } = await request.json();

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        const { countryCode, minLocalLength } = getCountryConfig(baseUrl);
        const v = Date.now();
        const targetUrl = `${baseUrl}/api/manage/urge/task/addFollow?v=${v}`;

        const authToken = token.startsWith('Bear ') ? token : `Bear ${token}`;

        for (const task of tasks) {
            await delay(500);

            const { taskId, orderId, phone, phonePrefix, contact1Phone, contact2Phone, contact3Phone } = task;
            let phoneToSend = phone || '0000000000'; // Default fallback

            const targetStr = String(followTarget);
            let keepCountryCode = false; // Default for Self (0)

            if (targetStr === '0') {
                // Self -> use phonePrefix or fallback to phone
                phoneToSend = phonePrefix || phoneToSend;
                keepCountryCode = false;
            } else if (targetStr === '1') {
                // Emergency Contact 1
                phoneToSend = contact1Phone || phoneToSend;
                keepCountryCode = true;
            } else if (targetStr === '2') {
                // Emergency Contact 2
                phoneToSend = contact2Phone || phoneToSend;
                keepCountryCode = true;
            } else if (targetStr === '3') {
                // Contacts
                phoneToSend = contact3Phone || phoneToSend;
                keepCountryCode = true;
            }

            const payload = {
                taskId,
                note,
                followResult,
                followTarget,
                phone: cleanPhoneNumber(phoneToSend, keepCountryCode, countryCode, minLocalLength),
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
