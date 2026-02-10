'use client';

import * as React from 'react';
import { Box, Button, TextField, Paper, Typography, Container, Alert } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Check if redirected due to session being kicked
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
                // JWT is set as httpOnly cookie by the server
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
        <Paper sx={{ p: 4, width: '100%' }}>
            <Typography variant="h5" gutterBottom align="center">CRM Login</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleLogin}>
                <TextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{ mt: 3 }}
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </form>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                This account is licensed for single-user access. Logging in from another device will end your current session.
            </Typography>
        </Paper>
    );
}

export default function LoginPage() {
    return (
        <Container maxWidth="sm">
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <React.Suspense fallback={
                    <Paper sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                        <Typography>Loading...</Typography>
                    </Paper>
                }>
                    <LoginForm />
                </React.Suspense>
            </Box>
        </Container>
    );
}
