'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
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

export default function TokenSettings() {
    const [open, setOpen] = React.useState(false);
    const [tabIndex, setTabIndex] = React.useState(0);
    const [token, setToken] = React.useState('');
    const [apiBaseUrl, setApiBaseUrl] = React.useState('');

    // Email accounts state
    const [accounts, setAccounts] = React.useState<EmailAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = React.useState(false);
    const [accountsError, setAccountsError] = React.useState('');
    const [connectingGmail, setConnectingGmail] = React.useState(false);

    const handleClickOpen = () => {
        setToken(localStorage.getItem('external_api_token') || '');
        setApiBaseUrl(localStorage.getItem('api_base_url') || '');
        setOpen(true);
        fetchAccounts();
    };

    const handleClose = () => setOpen(false);

    const handleSave = () => {
        localStorage.setItem('external_api_token', token);
        localStorage.setItem('api_base_url', apiBaseUrl.replace(/\/+$/, ''));
        window.location.reload();
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

        // Fallback: if popup closes without sending message
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
                // If deleted account was default, mark first as default in local state
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
            <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handleClickOpen}
                color="inherit"
                sx={{ ml: 2 }}
            >
                Settings
            </Button>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Configuration</DialogTitle>
                <DialogContent>
                    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
                        <Tab label="API" />
                        <Tab label="Email" />
                    </Tabs>

                    {tabIndex === 0 && (
                        <Box>
                            <DialogContentText sx={{ mb: 2 }}>
                                Configure the external CRM connection. Both fields are required to fetch data.
                            </DialogContentText>
                            <TextField
                                margin="dense"
                                label="API Base URL"
                                type="url"
                                fullWidth
                                variant="outlined"
                                value={apiBaseUrl}
                                onChange={(e) => setApiBaseUrl(e.target.value)}
                                placeholder="https://crm.example.com"
                                helperText="The base domain of the CRM API (without trailing slash)"
                            />
                            <TextField
                                margin="dense"
                                label="Bearer Token"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                multiline
                                rows={4}
                            />
                        </Box>
                    )}

                    {tabIndex === 1 && (
                        <Box>
                            <DialogContentText sx={{ mb: 2 }}>
                                Connect Gmail accounts to send emails. Each account uses secure Google OAuth — no app passwords needed.
                            </DialogContentText>

                            {accountsError && (
                                <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                                    {accountsError}
                                </Typography>
                            )}

                            {accountsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : accounts.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    No Gmail accounts connected yet.
                                </Typography>
                            ) : (
                                <Box sx={{ mb: 2 }}>
                                    {accounts.map(account => (
                                        <Box
                                            key={account.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                py: 0.75,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <Tooltip title="Set as default sender">
                                                <Radio
                                                    checked={account.isDefault}
                                                    onChange={() => handleSetDefault(account.id)}
                                                    size="small"
                                                />
                                            </Tooltip>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2">{account.email}</Typography>
                                                {account.isDefault && (
                                                    <Chip label="Default" size="small" color="primary" sx={{ mt: 0.25 }} />
                                                )}
                                            </Box>
                                            <Tooltip title="Remove account">
                                                <IconButton size="small" onClick={() => handleDelete(account.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={connectingGmail ? <CircularProgress size={16} /> : <AddIcon />}
                                onClick={handleConnectGmail}
                                disabled={connectingGmail}
                            >
                                {connectingGmail ? 'Connecting…' : 'Connect Gmail'}
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
