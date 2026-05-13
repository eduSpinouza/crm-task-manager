'use client';

import * as React from 'react';
import { resolveFollowResult } from '@/lib/followResult';

interface FollowResultChipProps {
    value: string | number | null | undefined;
    date?: string | Date;
}

function relativeTime(date: string | Date): string {
    const ms = Date.now() - new Date(date).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function FollowResultChip({ value, date }: FollowResultChipProps) {
    const { label, bg, fg, bold } = resolveFollowResult(value);

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 20,
                padding: '2px 8px',
                borderRadius: 10,
                background: bg,
                color: fg,
                fontSize: 11,
                fontWeight: bold ? 600 : 500,
                whiteSpace: 'nowrap',
                lineHeight: 1,
            }}
        >
            {label}
            {date && (
                <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
                    {' · '}{relativeTime(date)}
                </span>
            )}
        </span>
    );
}
