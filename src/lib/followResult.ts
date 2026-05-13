export interface FollowResultMeta {
    label: string;
    bg: string;
    fg: string;
    bold: boolean;
}

const neutral: Pick<FollowResultMeta, 'bg' | 'fg' | 'bold'> = {
    bg: 'var(--paper-3)',
    fg: 'var(--ink-3)',
    bold: false,
};
const warn: Pick<FollowResultMeta, 'bg' | 'fg' | 'bold'> = {
    bg: 'var(--warn-soft)',
    fg: 'var(--warn-ink)',
    bold: false,
};
const danger: Pick<FollowResultMeta, 'bg' | 'fg' | 'bold'> = {
    bg: 'var(--danger-soft)',
    fg: 'var(--danger)',
    bold: false,
};
const accent: Pick<FollowResultMeta, 'bg' | 'fg' | 'bold'> = {
    bg: 'var(--accent-soft)',
    fg: 'var(--accent)',
    bold: false,
};
const good: Pick<FollowResultMeta, 'bg' | 'fg' | 'bold'> = {
    bg: 'var(--good-soft)',
    fg: 'var(--good-ink)',
    bold: false,
};

const MAP: Record<string, FollowResultMeta> = {
    NONE:         { label: 'Not contacted', ...neutral },
    NC:           { label: 'No contact',    ...neutral },
    BUSY:         { label: 'Busy signal',   ...neutral },
    WN:           { label: 'Wrong number',  ...warn },
    RTP:          { label: 'Refused to pay',...danger },
    REFUSED:      { label: 'Refused to pay',...danger },
    PTP:          { label: 'Promise to pay',...accent },
    BP:           { label: 'Broken promise',...danger },
    BROKEN_PTP:   { label: 'Broken promise',...danger },
    PAID_PART:    { label: 'Partial payment', ...good },
    PAID_FULL:    { label: 'Paid in full',  bg: 'var(--good-soft)', fg: 'var(--good-ink)', bold: true },
    DISPUTED:     { label: 'Disputed',      ...warn },
    UNREACHABLE:  { label: 'Unreachable',   ...danger },
};

export function resolveFollowResult(value: string | number | null | undefined): FollowResultMeta {
    if (value === null || value === undefined || value === '' || value === 'NONE' || value === 0) {
        return { label: 'Not contacted', ...neutral };
    }
    const key = String(value).trim().toUpperCase();
    return MAP[key] ?? { label: String(value), ...neutral };
}
