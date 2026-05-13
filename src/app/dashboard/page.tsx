'use client';

import * as React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Snackbar, Tabs, Tab, Tooltip } from '@mui/material';
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
            <AppBar position="static" sx={{ bgcolor: 'var(--ink)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Toolbar sx={{ gap: 1, minHeight: '52px !important', px: '20px !important' }}>
                    {/* Brand */}
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography
                            sx={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 20,
                                lineHeight: 1,
                                letterSpacing: '-0.01em',
                                color: '#fff',
                            }}
                        >
                            Cobra
                            <Box component="em" sx={{ color: 'oklch(72% 0.13 258)', fontStyle: 'italic' }}>Ya!</Box>
                        </Typography>
                        {currentUsername && (
                            <Typography
                                sx={{
                                    font: '500 10px var(--font-mono)',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,0.35)',
                                    mt: '2px',
                                }}
                            >
                                {currentUsername}
                            </Typography>
                        )}
                    </Box>

                    {/* Actions */}
                    {userRole === 'admin' && (
                        <Button
                            startIcon={<PeopleIcon />}
                            onClick={() => setUsersDialogOpen(true)}
                            sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                        >
                            Users
                        </Button>
                    )}
                    <TokenSettings dark />
                    <Button
                        onClick={handleLogout}
                        sx={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 12,
                            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                    >
                        Sign out
                    </Button>
                </Toolbar>
            </AppBar>
            <LicenseBanner daysLeft={licenseDaysLeft} status={licenseStatus} />
            {(userRole === 'admin' || licenseStatus !== 'none') && (
                <Box sx={{ borderBottom: '1px solid var(--line)', bgcolor: 'var(--paper)', display: 'flex', alignItems: 'center' }}>
                    {userRole === 'admin' ? (
                        <Tabs
                            value={currentTab}
                            onChange={(_, v) => setCurrentTab(v)}
                            sx={{
                                px: '20px',
                                flexGrow: 1,
                                minHeight: 40,
                                '& .MuiTab-root': {
                                    fontSize: 12,
                                    fontWeight: 500,
                                    minHeight: 40,
                                    textTransform: 'none',
                                    color: 'var(--ink-3)',
                                    py: 0,
                                },
                                '& .Mui-selected': { color: 'var(--ink) !important' },
                                '& .MuiTabs-indicator': { backgroundColor: 'var(--accent)', height: 2 },
                            }}
                        >
                            <Tab label="CRM Tasks" value="crm" />
                            <Tab label="Security Monitor" value="security" icon={<SecurityIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
                        </Tabs>
                    ) : (
                        <Box sx={{ flexGrow: 1 }} />
                    )}
                    {licenseStatus !== 'none' && (() => {
                        const expiryLabel = licenseDaysLeft !== null && licenseDaysLeft > 0
                            ? `Expires ${new Date(Date.now() + licenseDaysLeft * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'License has expired';
                        const c = licenseStatus === 'ok' || licenseStatus === 'warning'
                            ? { bg: 'var(--warn-soft)',   border: 'var(--warn)',   text: 'var(--warn-ink)' }
                            : { bg: 'var(--danger-soft)', border: 'var(--danger)', text: 'var(--danger)' };
                        if (licenseStatus === 'ok') {
                            Object.assign(c, { bg: 'var(--good-soft)', border: 'var(--good)', text: 'var(--good-ink)' });
                        }
                        return (
                            <Tooltip title={expiryLabel} arrow>
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    mr: 2, px: '10px', py: '5px',
                                    bgcolor: c.bg,
                                    border: '1px solid', borderColor: c.border,
                                    borderRadius: 'var(--r-sm)',
                                    cursor: 'default',
                                }}>
                                    <CardMembershipIcon sx={{ fontSize: 14, color: c.border }} />
                                    <Box>
                                        <Typography sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: c.text, lineHeight: 1 }}>
                                            License
                                        </Typography>
                                        <Typography sx={{ font: '500 12px var(--font-sans)', color: c.text, lineHeight: 1.3, mt: '2px' }}>
                                            {licenseStatus === 'expired' ? 'Expired' : `${licenseDaysLeft}d remaining`}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Tooltip>
                        );
                    })()}
                </Box>
            )}

            <Box sx={{ mt: 2, px: 2 }}>
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
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: 'var(--warn-soft)', border: '1px solid var(--warn)',
                    borderRadius: 'var(--r-md)', px: '16px', py: '10px',
                    boxShadow: 'var(--shadow-modal)',
                    font: '500 13px var(--font-sans)', color: 'var(--warn-ink)',
                }}>
                    {sessionAlert}
                    <Box component="button" onClick={() => setSessionAlert('')} sx={{
                        ml: 1, border: 0, background: 'none', cursor: 'pointer',
                        font: '500 11px var(--font-mono)', color: 'var(--warn-ink)',
                        opacity: 0.6, '&:hover': { opacity: 1 },
                    }}>✕</Box>
                </Box>
            </Snackbar>
        </Box>
    );
}
