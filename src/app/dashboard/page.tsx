'use client';

import * as React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Alert, Snackbar, Tabs, Tab, Chip, Tooltip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TokenSettings from '@/components/TokenSettings';
import UserListTable from '@/components/UserListTable';
import UserManagementDialog from '@/components/UserManagementDialog';
import SecurityPanel from '@/components/SecurityPanel';
import LicenseBanner from '@/components/LicenseBanner';
import { type LicenseStatus } from '@/lib/licenseUtils';

export default function DashboardPage() {
    const router = useRouter();
    const [sessionAlert, setSessionAlert] = React.useState('');
    const [userRole, setUserRole] = React.useState<string>('user');
    const [currentUsername, setCurrentUsername] = React.useState<string>('');
    const [usersDialogOpen, setUsersDialogOpen] = React.useState(false);
    const [currentTab, setCurrentTab] = React.useState<'crm' | 'security'>('crm');
    const [licenseDaysLeft, setLicenseDaysLeft] = React.useState<number | null>(null);
    const [licenseStatus, setLicenseStatus] = React.useState<LicenseStatus>('none');

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
                setLicenseDaysLeft(response.data.license?.daysLeft ?? null);
                setLicenseStatus(response.data.license?.status ?? 'none');
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                const reason = err.response?.data?.reason;
                if (reason === 'license_expired') {
                    localStorage.removeItem('user');
                    router.push('/login?reason=license_expired');
                } else if (reason === 'session_ended') {
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
            <LicenseBanner daysLeft={licenseDaysLeft} status={licenseStatus} />
            {(userRole === 'admin' || licenseStatus !== 'none') && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center' }}>
                    {userRole === 'admin' ? (
                        <Tabs
                            value={currentTab}
                            onChange={(_, v) => setCurrentTab(v)}
                            sx={{ px: 3, flexGrow: 1 }}
                        >
                            <Tab label="CRM Tasks" value="crm" />
                            <Tab label="Security Monitor" value="security" icon={<SecurityIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>
                    ) : (
                        <Box sx={{ flexGrow: 1 }} />
                    )}
                    {licenseStatus !== 'none' && (() => {
                        const expiryLabel = licenseDaysLeft !== null && licenseDaysLeft > 0
                            ? `Expires ${new Date(Date.now() + licenseDaysLeft * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'License has expired';
                        const colors = licenseStatus === 'ok'
                            ? { bg: 'rgba(46,125,50,0.08)', border: '#2e7d32', text: '#1b5e20' }
                            : licenseStatus === 'warning'
                            ? { bg: 'rgba(237,108,2,0.08)', border: '#ed6c02', text: '#e65100' }
                            : { bg: 'rgba(211,47,47,0.08)', border: '#d32f2f', text: '#c62828' };
                        return (
                            <Tooltip title={expiryLabel} arrow>
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    mr: 2, px: 1.5, py: 0.75,
                                    borderRadius: '10px',
                                    bgcolor: colors.bg,
                                    border: `1.5px solid ${colors.border}`,
                                    cursor: 'default',
                                }}>
                                    <CardMembershipIcon sx={{ fontSize: 22, color: colors.border }} />
                                    <Box>
                                        <Typography sx={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.text, lineHeight: 1.2 }}>
                                            License
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>
                                            {licenseStatus === 'expired' ? 'Expired' : `${licenseDaysLeft} days remaining`}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Tooltip>
                        );
                    })()}
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
