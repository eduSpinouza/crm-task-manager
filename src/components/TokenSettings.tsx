'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function TokenSettings() {
    const [open, setOpen] = React.useState(false);
    const [token, setToken] = React.useState('');

    const handleClickOpen = () => {
        // Load existing token
        const savedToken = localStorage.getItem('external_api_token') || '';
        setToken(savedToken);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSave = () => {
        localStorage.setItem('external_api_token', token);
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
                API Token
            </Button>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>External API Configuration</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please paste the Bearer Token from the external CRM. This is required to fetch data.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="token"
                        label="Bearer Token"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        multiline
                        rows={4}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save Token
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
