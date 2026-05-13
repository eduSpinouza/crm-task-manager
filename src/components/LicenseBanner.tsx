'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { type LicenseStatus } from '@/lib/licenseUtils';

interface Props {
    daysLeft: number | null;
    status: LicenseStatus;
}

const statusConfig = {
    warning:  { bg: 'var(--warn-soft)',   border: 'var(--warn)',   text: 'var(--warn-ink)' },
    critical: { bg: 'var(--danger-soft)', border: 'var(--danger)', text: 'var(--danger)' },
    expired:  { bg: 'var(--danger-soft)', border: 'var(--danger)', text: 'var(--danger)' },
};

export default function LicenseBanner({ daysLeft, status }: Props) {
    if (status === 'none' || status === 'ok') return null;

    const { bg, border, text } = statusConfig[status as keyof typeof statusConfig];

    let message: string;
    if (status === 'expired') {
        message = 'Your license has expired. Please contact your administrator to renew.';
    } else if (status === 'critical') {
        message = `Your license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Your account will be blocked after that.`;
    } else {
        message = `License expires in ${daysLeft} days.`;
    }

    return (
        <Box sx={{
            borderBottom: '1px solid',
            borderColor: border,
            bgcolor: bg,
            px: 3,
            py: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
        }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: border, flexShrink: 0 }} />
            <Typography sx={{ font: '500 12px var(--font-sans)', color: text, lineHeight: 1.4 }}>
                {message}
            </Typography>
        </Box>
    );
}
