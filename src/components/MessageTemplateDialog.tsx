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
    Card,
    CardContent,
    IconButton,
    Collapse,
    Tooltip,
    Snackbar,
    Alert,
    Divider,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { replacePlaceholders, TemplateUser } from '@/lib/templateUtils';

interface MessageTemplate {
    name: string;
    body: string;
}

interface MessageTemplateDialogProps {
    open: boolean;
    onClose: () => void;
    /** Phone number of the contact being messaged (primary or emergency contact) */
    phone: string;
    /** The debtor's full data for placeholder replacement */
    user: TemplateUser;
    /** Label shown in the dialog title, e.g. "Primary" or "Contact 1" */
    contactLabel?: string;
}

const STORAGE_KEY = 'whatsapp_templates';

const DEFAULT_TEMPLATES: MessageTemplate[] = [
    {
        name: 'Payment Reminder',
        body: 'Hello {{userName}}, we are contacting you regarding your outstanding balance of ${{overdueFee}} for {{productName}}. Your repayment deadline is {{repayTime}}. Please contact us to arrange payment. Thank you.',
    },
    {
        name: 'Urgent Notice',
        body: 'URGENT: {{userName}}, your account has been overdue for {{overdueDay}} days. Total amount due: ${{totalAmount}}. Please make payment immediately to avoid further fees.',
    },
    {
        name: 'Payment Plan',
        body: 'Hello {{userName}}, we would like to offer you a payment arrangement for your balance of ${{overdueFee}}. Please reply to this message so we can discuss options. {{appName}} Collections.',
    },
];

/** Strip all non-digit characters from a phone number for the wa.me URL */
function cleanPhoneForWhatsapp(phone: string): string {
    return phone.replace(/\D/g, '');
}

export default function MessageTemplateDialog({
    open,
    onClose,
    phone,
    user,
    contactLabel = 'Contact',
}: MessageTemplateDialogProps) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [manageOpen, setManageOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBody, setNewBody] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setTemplates(JSON.parse(saved));
            } catch {
                setTemplates(DEFAULT_TEMPLATES);
            }
        } else {
            setTemplates(DEFAULT_TEMPLATES);
        }
    }, []);

    const persist = (updated: MessageTemplate[]) => {
        setTemplates(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleAddTemplate = () => {
        if (!newName.trim() || !newBody.trim()) return;
        persist([...templates, { name: newName.trim(), body: newBody.trim() }]);
        setNewName('');
        setNewBody('');
    };

    const handleDeleteTemplate = (index: number) => {
        persist(templates.filter((_, i) => i !== index));
    };

    const rendered = (body: string) =>
        replacePlaceholders(body, { ...user, phone }, 'text');

    const handleCopy = async (body: string) => {
        try {
            await navigator.clipboard.writeText(rendered(body));
            setSnackbar({ open: true, message: 'Copied to clipboard!' });
        } catch {
            setSnackbar({ open: true, message: 'Copy failed — please select and copy manually.' });
        }
    };

    const handleWhatsApp = (body: string) => {
        const cleanPhone = cleanPhoneForWhatsapp(phone);
        const message = encodeURIComponent(rendered(body));
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Message — {contactLabel}: {phone}
                </DialogTitle>

                <DialogContent dividers>
                    {/* Template cards */}
                    {templates.map((t, i) => (
                        <Card key={i} variant="outlined" sx={{ mb: 2 }}>
                            <CardContent sx={{ pb: '8px !important' }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    {t.name}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        whiteSpace: 'pre-wrap',
                                        bgcolor: 'grey.50',
                                        p: 1.5,
                                        borderRadius: 1,
                                        mb: 1.5,
                                        fontFamily: 'monospace',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {rendered(t.body)}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Tooltip title="Copy to clipboard (Telegram, SMS, etc.)">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<ContentCopyIcon />}
                                            onClick={() => handleCopy(t.body)}
                                        >
                                            Copy
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Open WhatsApp with this message pre-filled">
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            startIcon={<WhatsAppIcon />}
                                            onClick={() => handleWhatsApp(t.body)}
                                        >
                                            WhatsApp
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                    {templates.length === 0 && (
                        <Typography color="textSecondary" sx={{ mb: 2 }}>
                            No templates yet. Add one below.
                        </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Manage templates (collapsible) */}
                    <Box
                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1 }}
                        onClick={() => setManageOpen(v => !v)}
                    >
                        <Typography variant="body2" fontWeight="bold" sx={{ flex: 1 }}>
                            Manage Templates
                        </Typography>
                        {manageOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>

                    <Collapse in={manageOpen}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                            {templates.map((t, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        {t.name}
                                    </Typography>
                                    <IconButton size="small" onClick={() => handleDeleteTemplate(i)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                            <Typography variant="caption" color="textSecondary">
                                Placeholders: {'{{userName}}'}, {'{{phone}}'}, {'{{overdueFee}}'}, {'{{overdueDay}}'}, {'{{totalAmount}}'}, {'{{repayTime}}'}, {'{{productName}}'}, {'{{appName}}'}, {'{{extensionAmount}}'}
                            </Typography>
                            <TextField
                                size="small"
                                label="Template name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <TextField
                                size="small"
                                label="Message body"
                                value={newBody}
                                onChange={e => setNewBody(e.target.value)}
                                multiline
                                rows={4}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleAddTemplate}
                                disabled={!newName.trim() || !newBody.trim()}
                            >
                                Add Template
                            </Button>
                        </Box>
                    </Collapse>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
