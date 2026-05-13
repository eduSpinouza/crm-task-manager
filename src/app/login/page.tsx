'use client';

import * as React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

// ─── Bar chart heights for the decorative left panel ──────────────────────────
const BARS: { h: string; variant: 'neutral' | 'a' | 'b' | 'c' }[] = [
    { h: '30%', variant: 'neutral' },
    { h: '50%', variant: 'a' },
    { h: '42%', variant: 'neutral' },
    { h: '65%', variant: 'a' },
    { h: '78%', variant: 'b' },
    { h: '55%', variant: 'neutral' },
    { h: '82%', variant: 'b' },
    { h: '96%', variant: 'c' },
    { h: '70%', variant: 'b' },
    { h: '58%', variant: 'a' },
    { h: '46%', variant: 'neutral' },
    { h: '60%', variant: 'a' },
];

const BAR_BG: Record<string, string> = {
    neutral: 'var(--line)',
    a: 'oklch(52% 0.18 270 / 0.4)',
    b: 'oklch(52% 0.18 270 / 0.7)',
    c: 'var(--accent)',
};

// ─── Login form (inside Suspense boundary) ────────────────────────────────────

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'session_ended') {
            setError('Your session was ended because the account was accessed from another location.');
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await axios.post('/api/auth/login', { username, password });
            if (response.data?.success) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                router.push('/dashboard');
            } else {
                setError(response.data?.msg || 'Login failed');
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Invalid username or password');
            } else {
                setError(err.response?.data?.error || 'An error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        /* ── Right panel ── */
        <Box
            component="div"
            sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: '56px',
                bgcolor: 'var(--paper)',
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 340 }}>
                {/* Heading */}
                <Typography
                    sx={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 32,
                        lineHeight: 1,
                        letterSpacing: '-0.01em',
                        color: 'var(--ink)',
                        mb: '6px',
                    }}
                >
                    Welcome back.
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'var(--ink-3)', mb: '28px' }}>
                    Sign in to continue your follow-ups.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleLogin}>
                    {/* Username */}
                    <Box component="label" sx={{ display: 'block', font: '500 11px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', mt: '14px', mb: '4px' }}>
                        Username
                    </Box>
                    <Box
                        component="input"
                        autoComplete="username"
                        value={username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                        sx={{
                            width: '100%',
                            border: 0,
                            borderBottom: '1px solid var(--line)',
                            background: 'transparent',
                            p: '10px 0',
                            fontSize: 15,
                            color: 'var(--ink)',
                            outline: 0,
                            fontFamily: 'var(--font-sans)',
                            '&:focus': { borderColor: 'var(--accent)' },
                        }}
                    />

                    {/* Password */}
                    <Box component="label" sx={{ display: 'block', font: '500 11px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', mt: '14px', mb: '4px' }}>
                        Password
                    </Box>
                    <Box
                        component="input"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        sx={{
                            width: '100%',
                            border: 0,
                            borderBottom: '1px solid var(--line)',
                            background: 'transparent',
                            p: '10px 0',
                            fontSize: 15,
                            color: 'var(--ink)',
                            outline: 0,
                            fontFamily: 'var(--font-sans)',
                            '&:focus': { borderColor: 'var(--accent)' },
                        }}
                    />

                    {/* Submit */}
                    <Box
                        component="button"
                        type="submit"
                        disabled={loading}
                        sx={{
                            mt: '28px',
                            width: '100%',
                            background: 'var(--ink)',
                            color: 'var(--paper)',
                            border: 0,
                            p: '13px',
                            borderRadius: '3px',
                            fontSize: 13,
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            fontFamily: 'var(--font-sans)',
                            transition: 'opacity 0.15s',
                            '&:hover:not(:disabled)': { opacity: 0.85 },
                        }}
                    >
                        {loading ? 'Signing in…' : 'Sign in →'}
                    </Box>
                </form>

                {/* Caption */}
                <Box
                    component="span"
                    sx={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        mt: '20px',
                        lineHeight: 1.5,
                        pl: '12px',
                        borderLeft: '2px solid var(--line)',
                    }}
                >
                    <Box component="strong" sx={{ color: 'var(--ink-2)', fontWeight: 500 }}>
                        Single-session access.
                    </Box>{' '}
                    Signing in from another device will end your current session.
                </Box>
            </Box>
        </Box>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                minHeight: '100vh',
            }}
        >
            {/* ── Left panel — branding ── */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: '56px',
                    bgcolor: 'var(--paper-2)',
                    borderRight: '1px solid var(--line)',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Top: tag + brand */}
                <Box>
                    <Typography
                        sx={{
                            font: '500 10px var(--font-mono)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-3)',
                            mb: '18px',
                        }}
                    >
                        CobraYa! · collections CRM
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 44,
                            lineHeight: 1,
                            letterSpacing: '-0.015em',
                            color: 'var(--ink)',
                        }}
                    >
                        Cobra
                        <Box component="em" sx={{ color: 'var(--accent)', fontStyle: 'italic' }}>Ya!</Box>
                    </Typography>
                </Box>

                {/* Middle: pitch + bar chart */}
                <Box>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 28,
                            lineHeight: 1.2,
                            letterSpacing: '-0.01em',
                            maxWidth: '22ch',
                            mt: '40px',
                            color: 'var(--ink)',
                        }}
                    >
                        A quiet tool for the loud work of{' '}
                        <Box component="em" sx={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                            getting paid.
                        </Box>
                    </Typography>

                    {/* Decorative bar chart */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            gap: '3px',
                            mt: '32px',
                            alignItems: 'end',
                            height: 120,
                        }}
                    >
                        {BARS.map((bar, i) => (
                            <Box
                                key={i}
                                sx={{
                                    height: bar.h,
                                    background: BAR_BG[bar.variant],
                                    borderRadius: '1px',
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        font: '500 10px var(--font-mono)',
                        letterSpacing: '0.06em',
                        color: 'var(--ink-3)',
                        textTransform: 'uppercase',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <span>v0.1 · May 2026</span>
                    <span>Mexico · Peru · Colombia · Chile</span>
                </Box>
            </Box>

            {/* ── Right panel — form (needs Suspense for useSearchParams) ── */}
            <React.Suspense
                fallback={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, p: '56px' }}>
                        <Typography sx={{ color: 'var(--ink-3)' }}>Loading…</Typography>
                    </Box>
                }
            >
                <LoginForm />
            </React.Suspense>
        </Box>
    );
}
