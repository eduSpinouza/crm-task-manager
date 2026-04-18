'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    LinearProgress,
    Tabs,
    Tab,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    ListItemSecondaryAction,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import TableChartIcon from '@mui/icons-material/TableChart';
import axios from 'axios';

interface UserData {
    email?: string;
    userName: string;
    phone: string;
    appName?: string;
    productName: string;
    principal?: number;
    totalAmount?: number;
    repayAmount?: number;
    overdueFee?: number;
    overdueDay?: number;
    repayTime: string;
    stageName: string;
    idNoUrl?: string;
    livingNessUrl?: string;
    totalExtensionAmount?: number;
    [key: string]: any;
}

interface EmailTemplate {
    name: string;
    subject: string;
    body: string;
}

interface EmailAccount {
    id: string;
    label: string;
    email: string;
    isDefault: boolean;
}

interface EmailDialogProps {
    open: boolean;
    onClose: () => void;
    selectedUsers: UserData[];
    onSuccess: () => void;
}

const LAST_ACCOUNT_KEY = 'email_last_used_account_id';

export default function EmailDialog({ open, onClose, selectedUsers, onSuccess }: EmailDialogProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');

    // Sender accounts
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Google Sheets connection
    const [sheetsConnected, setSheetsConnected] = useState(false);
    const [sheetsEmail, setSheetsEmail] = useState<string | null>(null);
    const [sheetsLoading, setSheetsLoading] = useState(false);

    // Load templates from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('email_templates');
        if (saved) {
            try { setTemplates(JSON.parse(saved)); } catch { }
        }
    }, []);

    // Load accounts + Sheets status when dialog opens
    useEffect(() => {
        if (!open) return;
        axios.get('/api/email/accounts').then(res => {
            const accts: EmailAccount[] = res.data.accounts ?? [];
            setAccounts(accts);

            // Prefer last-used account, then the one marked default, then the first
            const lastUsed = localStorage.getItem(LAST_ACCOUNT_KEY);
            const preferred =
                accts.find(a => a.id === lastUsed) ??
                accts.find(a => a.isDefault) ??
                accts[0];
            setSelectedAccountId(preferred?.id ?? '');
        }).catch(() => {
            setAccounts([]);
        });

        axios.get('/api/auth/sheets').then(res => {
            setSheetsConnected(res.data.connected ?? false);
            setSheetsEmail(res.data.email ?? null);
        }).catch(() => {
            setSheetsConnected(false);
            setSheetsEmail(null);
        });
    }, [open]);

    const handleConnectSheets = () => {
        const popup = window.open('/api/auth/sheets/start', 'sheets-oauth', 'width=520,height=620');
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== 'sheets-oauth') return;
            window.removeEventListener('message', onMessage);
            popup?.close();
            if (event.data.status === 'success') {
                setSheetsConnected(true);
                setSheetsEmail(event.data.detail);
            }
        };
        window.addEventListener('message', onMessage);
    };

    const handleDisconnectSheets = async () => {
        setSheetsLoading(true);
        try {
            await axios.delete('/api/auth/sheets');
            setSheetsConnected(false);
            setSheetsEmail(null);
        } finally {
            setSheetsLoading(false);
        }
    };

    // Save templates to localStorage
    const saveTemplates = (newTemplates: EmailTemplate[]) => {
        setTemplates(newTemplates);
        localStorage.setItem('email_templates', JSON.stringify(newTemplates));
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim() || !subject.trim() || !body.trim()) {
            setError('Template name, subject, and body are required');
            return;
        }
        const existing = templates.filter(t => t.name !== templateName);
        saveTemplates([...existing, { name: templateName, subject, body }]);
        setTemplateName('');
        setError(null);
    };

    const handleLoadTemplate = (template: EmailTemplate) => {
        setSubject(template.subject);
        setBody(template.body);
        setTabIndex(0);
    };

    const handleDeleteTemplate = (name: string) => {
        saveTemplates(templates.filter(t => t.name !== name));
    };

    const handleSend = async () => {
        setError(null);
        setSending(true);
        setProgress(0);

        if (!selectedAccountId) {
            setError('Please connect a Gmail account in Settings before sending emails.');
            setSending(false);
            return;
        }

        const usersWithEmail = selectedUsers.filter(u => u.email);
        if (usersWithEmail.length === 0) {
            setError('No selected users have email addresses');
            setSending(false);
            return;
        }

        try {
            localStorage.setItem(LAST_ACCOUNT_KEY, selectedAccountId);

            const response = await axios.post('/api/email/send', {
                users: usersWithEmail,
                subject,
                bodyTemplate: body,
                accountId: selectedAccountId,
            });

            setProgress(100);
            if (response.data.failed > 0) {
                setError(`Sent ${response.data.sent}, failed ${response.data.failed}`);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to send emails');
        } finally {
            setSending(false);
        }
    };

    // Preview: replace placeholders with first user's data
    const getPreview = () => {
        if (selectedUsers.length === 0) return body;
        const user = selectedUsers[0];
        let preview = body;
        preview = preview.replace(/\{\{userName\}\}/g, user.userName || '');
        preview = preview.replace(/\{\{email\}\}/g, user.email || '');
        preview = preview.replace(/\{\{phone\}\}/g, user.phone || '');
        preview = preview.replace(/\{\{appName\}\}/g, (user as any).appName || '');
        preview = preview.replace(/\{\{productName\}\}/g, user.productName || '');
        preview = preview.replace(/\{\{principal\}\}/g, String(user.principal || ''));
        preview = preview.replace(/\{\{contractAmount\}\}/g, String((user as any).totalAmount || ''));
        preview = preview.replace(/\{\{totalAmount\}\}/g, String((user as any).repayAmount || ''));
        preview = preview.replace(/\{\{overdueFee\}\}/g, String((user as any).overdueFee || ''));
        preview = preview.replace(/\{\{extensionAmount\}\}/g, String(user.totalExtensionAmount ?? ''));
        preview = preview.replace(/\{\{repayTime\}\}/g, user.repayTime || '');
        preview = preview.replace(/\{\{stageName\}\}/g, user.stageName || '');
        preview = preview.replace(/\{\{idNoUrl\}\}/g, user.idNoUrl ? `<img src="${user.idNoUrl}" width="200" />` : '');
        preview = preview.replace(/\{\{livingNessUrl\}\}/g, user.livingNessUrl ? `<img src="${user.livingNessUrl}" width="200" />` : '');
        return preview;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Send Email to {selectedUsers.length} Users</DialogTitle>
            <DialogContent>
                {/* Sender account picker */}
                <FormControl fullWidth size="small" sx={{ mb: 2, mt: 1 }}>
                    <InputLabel>Send from</InputLabel>
                    <Select
                        value={selectedAccountId}
                        label="Send from"
                        onChange={e => setSelectedAccountId(e.target.value)}
                        displayEmpty
                    >
                        {accounts.length === 0 ? (
                            <MenuItem value="" disabled>
                                No Gmail accounts — connect one in Settings
                            </MenuItem>
                        ) : (
                            accounts.map(a => (
                                <MenuItem key={a.id} value={a.id}>
                                    {a.email}{a.isDefault ? ' (default)' : ''}
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>

                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
                    <Tab label="Compose" />
                    <Tab label="Templates" />
                    <Tab label="Preview" />
                </Tabs>

                {tabIndex === 0 && (
                    <Box>
                        <TextField
                            fullWidth
                            label="Subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            margin="normal"
                            placeholder="e.g., Payment Reminder for {{productName}}"
                        />
                        <TextField
                            fullWidth
                            label="Body"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            margin="normal"
                            multiline
                            rows={8}
                            placeholder="Dear {{userName}}, your payment of {{principal}} is due on {{repayTime}}..."
                        />
                        <Typography variant="caption" color="textSecondary" component="div">
                            <strong>Text:</strong> {"{{userName}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{appName}}"}, {"{{productName}}"}, {"{{repayTime}}"}, {"{{stageName}}"}
                            <br />
                            <strong>Amounts:</strong> {"{{contractAmount}}"}, {"{{totalAmount}}"}, {"{{overdueFee}}"}, {"{{extensionAmount}}"}
                            <br />
                            <strong>Images:</strong> {"{{idNoUrl}}"} - automatically embeds user ID photo
                        </Typography>
                    </Box>
                )}

                {tabIndex === 1 && (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                size="small"
                                label="Template Name"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                            />
                            <Button variant="outlined" onClick={handleSaveTemplate}>
                                Save Current
                            </Button>
                        </Box>
                        <List>
                            {templates.map(t => (
                                <ListItemButton key={t.name} onClick={() => handleLoadTemplate(t)}>
                                    <ListItemText primary={t.name} secondary={t.subject} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleDeleteTemplate(t.name)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItemButton>
                            ))}
                            {templates.length === 0 && (
                                <Typography color="textSecondary">No saved templates</Typography>
                            )}
                        </List>
                    </Box>
                )}

                {tabIndex === 2 && (
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Preview (first user: {selectedUsers[0]?.userName || 'N/A'})
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Subject: {subject.replace(/\{\{userName\}\}/g, selectedUsers[0]?.userName || '')}
                        </Typography>
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {getPreview()}
                        </Box>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                {sending && <LinearProgress sx={{ mt: 2 }} />}

                {/* Google Sheets for Export */}
                <Divider sx={{ mt: 3, mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TableChartIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Google Sheets for Export</Typography>
                </Box>
                {sheetsConnected && sheetsEmail ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={sheetsEmail} size="small" color="success" variant="outlined" />
                        <Button
                            size="small"
                            color="error"
                            disabled={sheetsLoading}
                            onClick={handleDisconnectSheets}
                        >
                            Disconnect
                        </Button>
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Connect a Google account to enable the &ldquo;Export to Google Sheets&rdquo; feature on the user list.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<TableChartIcon />}
                            onClick={handleConnectSheets}
                        >
                            Connect Google Sheets
                        </Button>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={sending}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={sending || !subject.trim() || !body.trim() || !selectedAccountId}
                >
                    {sending ? 'Sending...' : `Send to ${selectedUsers.filter(u => u.email).length} Users`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
