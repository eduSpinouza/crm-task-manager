'use client';

import * as React from 'react';

interface OverdueChipProps {
    days: number;
}

type Band = 'none' | 'fresh' | 'early' | 'mid' | 'late';

function getBand(days: number): Band {
    if (days <= 0) return 'none';
    if (days <= 7) return 'fresh';
    if (days <= 30) return 'early';
    if (days <= 60) return 'mid';
    return 'late';
}

const BAND_STYLES: Record<Band, { bg: string; fg: string; bold: boolean; dot: boolean; label: (n: number) => string }> = {
    none:  { bg: 'var(--good-soft)',   fg: 'var(--good-ink)',  bold: false, dot: false, label: () => 'Current' },
    fresh: { bg: 'var(--paper-3)',     fg: 'var(--ink-2)',     bold: false, dot: false, label: (n) => `${n}d early` },
    early: { bg: 'var(--warn-soft)',   fg: 'var(--warn-ink)',  bold: false, dot: false, label: (n) => `${n}d overdue` },
    mid:   { bg: 'var(--warn-soft)',   fg: 'var(--warn-ink)',  bold: true,  dot: true,  label: (n) => `${n}d overdue` },
    late:  { bg: 'var(--danger-soft)', fg: 'var(--danger)',    bold: true,  dot: true,  label: (n) => `${n}d overdue` },
};

export default function OverdueChip({ days }: OverdueChipProps) {
    const band = getBand(days);
    const { bg, fg, bold, dot, label } = BAND_STYLES[band];

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
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                lineHeight: 1,
            }}
        >
            {dot && (
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-block',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'currentColor',
                        flexShrink: 0,
                    }}
                />
            )}
            {label(days)}
        </span>
    );
}
