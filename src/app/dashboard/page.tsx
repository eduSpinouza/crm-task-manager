'use client';

import * as React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { useRouter } from 'next/navigation';
import TokenSettings from '@/components/TokenSettings';
import UserListTable from '@/components/UserListTable';

export default function DashboardPage() {
    const router = useRouter();

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        CRM Dashboard
                    </Typography>
                    <TokenSettings />
                    <Button color="inherit" onClick={handleLogout}>Logout</Button>
                </Toolbar>
            </AppBar>
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <UserListTable />
            </Container>
        </Box>
    );
}
