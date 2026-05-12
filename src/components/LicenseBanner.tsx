'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { type LicenseStatus } from '@/lib/licenseUtils';

interface Props {
    daysLeft: number | null;
    status: LicenseStatus;
}

export default function LicenseBanner({ daysLeft, status }: Props) {
    if (status === 'none' || status === 'ok') return null;

    const severity = status === 'expired' || status === 'critical' ? 'error' : 'warning';

    let message: string;
    if (status === 'expired') {
        message = 'Your license has expired. Please contact your administrator to renew.';
    } else if (status === 'critical') {
        message = `Your license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Your account will be blocked after that.`;
    } else {
        message = `Your license expires in ${daysLeft} days.`;
    }

    return (
        <Box>
            <Alert severity={severity} sx={{ borderRadius: 0 }}>
                {message}
            </Alert>
        </Box>
    );
}
