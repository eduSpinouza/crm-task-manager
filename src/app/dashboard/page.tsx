'use client';

import * as React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TokenSettings from '@/components/TokenSettings';
import UserListTable from '@/components/UserListTable';
import UserManagementDialog from '@/components/UserManagementDialog';
import SecurityPanel from '@/components/SecurityPanel';

export default function DashboardPage() {
    const router = useRouter();
    const [sessionAlert, setSessionAlert] = React.useState('');
    const [userRole, setUserRole] = React.useState<string>('user');
    const [currentUsername, setCurrentUsername] = React.useState<string>('');
    const [usersDialogOpen, setUsersDialogOpen] = React.useState(false);
    const [currentTab, setCurrentTab] = React.useState<'crm' | 'security'>('crm');

    // Verify session on mount
    React.useEffect(() => {
        checkSession();
    }, []);

    // Poll session every 30 seconds
    React.useEffect(() => {
        const interval = setInterval(checkSession, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkSession = async () => {
        try {
            const response = await axios.get('/api/auth/session');
            if (!response.data?.valid) {
                handleSessionExpired(response.data?.message);
            } else {
                // Store role and username from session check
                setUserRole(response.data.user?.role || 'user');
                setCurrentUsername(response.data.user?.name || '');
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                const reason = err.response?.data?.reason;
                if (reason === 'session_ended') {
                    handleSessionExpired('Your session was ended because the account was accessed from another location.');
                } else {
                    handleSessionExpired('Session expired. Please log in again.');
                }
            }
        }
    };

    const handleSessionExpired = (message?: string) => {
        localStorage.removeItem('user');
        const reason = message?.includes('another location') ? 'session_ended' : 'expired';
        router.push(`/login?reason=${reason}`);
    };

    const handleLogout = async () => {
        try {
            await axios.delete('/api/auth/session');
        } catch {
            // Continue with logout even if API call fails
        }
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
                    {userRole === 'admin' && (
                        <Button
                            color="inherit"
                            startIcon={<PeopleIcon />}
                            onClick={() => setUsersDialogOpen(true)}
                            sx={{ mr: 1 }}
                        >
                            Manage Users
                        </Button>
                    )}
                    <TokenSettings />
                    <Button color="inherit" onClick={handleLogout}>Logout</Button>
                </Toolbar>
            </AppBar>
            {userRole === 'admin' && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Tabs
                        value={currentTab}
                        onChange={(_, v) => setCurrentTab(v)}
                        sx={{ px: 3 }}
                    >
                        <Tab label="CRM Tasks" value="crm" />
                        <Tab label="Security Monitor" value="security" icon={<SecurityIcon fontSize="small" />} iconPosition="start" />
                    </Tabs>
                </Box>
            )}

            <Box sx={{ mt: 4, px: 4, width: '100%' }}>
                {currentTab === 'crm' || userRole !== 'admin' ? (
                    <UserListTable />
                ) : (
                    <SecurityPanel currentUser={currentUsername} />
                )}
            </Box>

            <UserManagementDialog
                open={usersDialogOpen}
                onClose={() => setUsersDialogOpen(false)}
            />

            <Snackbar
                open={!!sessionAlert}
                autoHideDuration={6000}
                onClose={() => setSessionAlert('')}
            >
                <Alert severity="warning" onClose={() => setSessionAlert('')}>
                    {sessionAlert}
                </Alert>
            </Snackbar>
        </Box>
    );
}
