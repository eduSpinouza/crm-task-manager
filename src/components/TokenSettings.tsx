'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

interface EmailAccount {
    id: string;
    label: string;
    email: string;
    isDefault: boolean;
    createdAt: number;
}

const overlineSx = {
    font: '500 10px var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-3)',
};

export default function TokenSettings() {
    const [open, setOpen] = React.useState(false);
    const [tabIndex, setTabIndex] = React.useState(0);
    const [token, setToken] = React.useState('');
    const [apiBaseUrl, setApiBaseUrl] = React.useState('');
    const savedToken = React.useRef('');
    const savedApiBaseUrl = React.useRef('');

    const [accounts, setAccounts] = React.useState<EmailAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = React.useState(false);
    const [accountsError, setAccountsError] = React.useState('');
    const [connectingGmail, setConnectingGmail] = React.useState(false);

    const [sheetsEmail, setSheetsEmail] = React.useState<string | null>(null);
    const [sheetsDisconnecting, setSheetsDisconnecting] = React.useState(false);

    const handleClickOpen = () => {
        const t = localStorage.getItem('external_api_token') || '';
        const u = localStorage.getItem('api_base_url') || '';
        setToken(t);
        setApiBaseUrl(u);
        savedToken.current = t;
        savedApiBaseUrl.current = u;
        setOpen(true);
        fetchAccounts();
        fetchSheetsAccount();
    };

    const handleClose = () => setOpen(false);

    const handleSave = () => {
        const cleanUrl = apiBaseUrl.replace(/\/+$/, '');
        localStorage.setItem('external_api_token', token);
        localStorage.setItem('api_base_url', cleanUrl);
        const apiChanged = token !== savedToken.current || cleanUrl !== savedApiBaseUrl.current;
        if (apiChanged) {
            window.location.reload();
        } else {
            setOpen(false);
        }
    };

    const fetchSheetsAccount = async () => {
        try {
            const res = await axios.get('/api/auth/sheets');
            setSheetsEmail(res.data.connected ? (res.data.email ?? null) : null);
        } catch {
            setSheetsEmail(null);
        }
    };

    const handleDisconnectSheets = async () => {
        setSheetsDisconnecting(true);
        try {
            await axios.delete('/api/auth/sheets');
            setSheetsEmail(null);
        } catch {
            setAccountsError('Failed to disconnect Google Sheets account.');
        } finally {
            setSheetsDisconnecting(false);
        }
    };

    const fetchAccounts = async () => {
        setAccountsLoading(true);
        setAccountsError('');
        try {
            const res = await axios.get('/api/email/accounts');
            setAccounts(res.data.accounts ?? []);
        } catch {
            setAccountsError('Failed to load email accounts.');
        } finally {
            setAccountsLoading(false);
        }
    };

    const handleConnectGmail = () => {
        setConnectingGmail(true);
        const popup = window.open(
            '/api/auth/gmail/start',
            'gmail-oauth',
            'width=520,height=620,left=200,top=100'
        );

        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== 'gmail-oauth') return;
            window.removeEventListener('message', onMessage);
            setConnectingGmail(false);
            if (event.data.status === 'success') {
                fetchAccounts();
            } else {
                setAccountsError(event.data.detail || 'Failed to connect Gmail account.');
            }
        };
        window.addEventListener('message', onMessage);

        const timer = setInterval(() => {
            if (popup?.closed) {
                clearInterval(timer);
                window.removeEventListener('message', onMessage);
                setConnectingGmail(false);
                fetchAccounts();
            }
        }, 500);
    };

    const handleSetDefault = async (id: string) => {
        try {
            await axios.patch('/api/email/accounts', { id, isDefault: true });
            setAccounts(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
        } catch {
            setAccountsError('Failed to update default account.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`/api/email/accounts?id=${id}`);
            setAccounts(prev => {
                const filtered = prev.filter(a => a.id !== id);
                if (prev.find(a => a.id === id)?.isDefault && filtered.length > 0) {
                    filtered[0] = { ...filtered[0], isDefault: true };
                }
                return filtered;
            });
        } catch {
            setAccountsError('Failed to delete account.');
        }
    };

    return (
        <React.Fragment>
            <Tooltip title="Settings">
                <IconButton
                    onClick={handleClickOpen}
                    size="small"
                    sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--ink)' } }}
                >
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>
                    <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>
                        Configuration
                    </Typography>
                </DialogTitle>

                <Box sx={{ px: 3 }}>
                    <Tabs
                        value={tabIndex}
                        onChange={(_, v) => setTabIndex(v)}
                        sx={{
                            borderBottom: '1px solid var(--line)',
                            '& .MuiTab-root': { fontSize: 12, fontWeight: 500, minHeight: 40, textTransform: 'none', color: 'var(--ink-3)' },
                            '& .Mui-selected': { color: 'var(--ink) !important' },
                            '& .MuiTabs-indicator': { backgroundColor: 'var(--accent)' },
                        }}
                    >
                        <Tab label="API" />
                        <Tab label="Email" />
                    </Tabs>
                </Box>

                <DialogContent>
                    {tabIndex === 0 && (
                        <Box>
                            <Typography sx={{ ...overlineSx, mb: 1.5 }}>CRM Connection</Typography>
                            <TextField
                                margin="dense"
                                label="API Base URL"
                                type="url"
                                fullWidth
                                value={apiBaseUrl}
                                onChange={(e) => setApiBaseUrl(e.target.value)}
                                placeholder="https://crm.example.com"
                                helperText="Base domain without trailing slash"
                            />
                            <TextField
                                margin="dense"
                                label="Bearer Token"
                                type="text"
                                fullWidth
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                multiline
                                rows={4}
                                sx={{ mt: 1 }}
                            />
                        </Box>
                    )}

                    {tabIndex === 1 && (
                        <Box>
                            {/* Gmail accounts */}
                            <Typography sx={{ ...overlineSx, mb: 1.5 }}>Gmail Accounts</Typography>
                            <Typography sx={{ fontSize: 13, color: 'var(--ink-3)', mb: 2 }}>
                                Connect Gmail via OAuth — no app passwords needed.
                            </Typography>

                            {accountsError && (
                                <Typography sx={{ fontSize: 12, color: 'var(--danger)', mb: 1 }}>
                                    {accountsError}
                                </Typography>
                            )}

                            {accountsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            ) : accounts.length === 0 ? (
                                <Typography sx={{ fontSize: 13, color: 'var(--ink-3)', mb: 2 }}>
                                    No Gmail accounts connected yet.
                                </Typography>
                            ) : (
                                <Box sx={{ mb: 2, border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                                    {accounts.map((account, i) => (
                                        <Box
                                            key={account.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1.5,
                                                py: 1,
                                                borderBottom: i < accounts.length - 1 ? '1px solid var(--line-2)' : 'none',
                                                '&:hover': { bgcolor: 'var(--paper-2)' },
                                            }}
                                        >
                                            <Tooltip title="Set as default sender">
                                                <Radio
                                                    checked={account.isDefault}
                                                    onChange={() => handleSetDefault(account.id)}
                                                    size="small"
                                                    sx={{ p: 0.5, color: 'var(--ink-3)' }}
                                                />
                                            </Tooltip>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {account.email}
                                                </Typography>
                                                {account.isDefault && (
                                                    <Box sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.04em', color: 'var(--accent)', textTransform: 'uppercase', mt: '2px' }}>
                                                        Default
                                                    </Box>
                                                )}
                                            </Box>
                                            <Tooltip title="Remove">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(account.id)}
                                                    sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--danger)' } }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={connectingGmail ? <CircularProgress size={14} /> : <AddIcon />}
                                onClick={handleConnectGmail}
                                disabled={connectingGmail}
                                size="small"
                            >
                                {connectingGmail ? 'Connecting…' : 'Connect Gmail'}
                            </Button>

                            {/* Google Sheets */}
                            <Box sx={{ mt: 3.5, pt: 2.5, borderTop: '1px solid var(--line)' }}>
                                <Typography sx={{ ...overlineSx, mb: 1.5 }}>Google Sheets Export</Typography>
                                {sheetsEmail ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>
                                            {sheetsEmail}
                                        </Typography>
                                        <Chip label="Connected" size="small" color="success" />
                                        <Tooltip title="Disconnect and revoke access">
                                            <IconButton
                                                size="small"
                                                onClick={handleDisconnectSheets}
                                                disabled={sheetsDisconnecting}
                                                sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--danger)' } }}
                                            >
                                                {sheetsDisconnecting
                                                    ? <CircularProgress size={14} />
                                                    : <DeleteIcon sx={{ fontSize: 16 }} />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                ) : (
                                    <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>
                                        No Google account connected. Use the export button on the user list to connect one.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={handleClose} sx={{ color: 'var(--ink-3)' }}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
