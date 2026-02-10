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

export default function TokenSettings() {
    const [open, setOpen] = React.useState(false);
    const [tabIndex, setTabIndex] = React.useState(0);
    const [token, setToken] = React.useState('');
    const [apiBaseUrl, setApiBaseUrl] = React.useState('');
    const [emailSender, setEmailSender] = React.useState('');
    const [emailPassword, setEmailPassword] = React.useState('');

    const handleClickOpen = () => {
        // Load existing settings
        setToken(localStorage.getItem('external_api_token') || '');
        setApiBaseUrl(localStorage.getItem('api_base_url') || '');
        setEmailSender(localStorage.getItem('email_sender') || '');
        setEmailPassword(localStorage.getItem('email_app_password') || '');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSave = () => {
        localStorage.setItem('external_api_token', token);
        localStorage.setItem('api_base_url', apiBaseUrl.replace(/\/+$/, '')); // Remove trailing slashes
        localStorage.setItem('email_sender', emailSender);
        localStorage.setItem('email_app_password', emailPassword);
        // Reload page to apply changes immediately
        window.location.reload();
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
                                Configure Gmail SMTP for sending emails. You need a Gmail account with an App Password.
                            </DialogContentText>
                            <TextField
                                margin="dense"
                                label="Sender Email (Gmail)"
                                type="email"
                                fullWidth
                                variant="outlined"
                                value={emailSender}
                                onChange={(e) => setEmailSender(e.target.value)}
                                placeholder="your-email@gmail.com"
                            />
                            <TextField
                                margin="dense"
                                label="App Password"
                                type="password"
                                fullWidth
                                variant="outlined"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="xxxx xxxx xxxx xxxx"
                                helperText="Generate at: myaccount.google.com/apppasswords"
                            />
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
