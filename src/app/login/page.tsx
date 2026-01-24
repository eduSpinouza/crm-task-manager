'use client';

import * as React from 'react';
import { Box, Button, TextField, Paper, Typography, Container, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.get('/api/auth/login', {
                params: { username, password }
            });

            if (response.data?.success) {
                // Save token
                const token = response.data.token;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                router.push('/dashboard');
            } else {
                setError(response.data?.msg || 'Login failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.details || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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
                </Paper>
            </Box>
        </Container>
    );
}
