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
    Tooltip,
    Snackbar,
    Alert,
    Divider,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
        name: 'Recordatorio de pago',
        body: 'Hola {{userName}}, nos comunicamos con usted respecto a su saldo pendiente de ${{overdueFee}} por el producto {{productName}}. Su fecha límite de pago es {{repayTime}}. Por favor contáctenos para coordinar el pago. Gracias.',
    },
    {
        name: 'Aviso urgente',
        body: 'URGENTE: {{userName}}, su cuenta lleva {{overdueDay}} días de mora. Monto total a pagar: ${{totalAmount}}. Le solicitamos realizar el pago de inmediato para evitar cargos adicionales.',
    },
    {
        name: 'Plan de pagos',
        body: 'Hola {{userName}}, queremos ofrecerle un plan de pago para su saldo de ${{overdueFee}}. Por favor responda este mensaje para que podamos analizar las opciones disponibles. Cobranzas {{appName}}.',
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
    const [manageMode, setManageMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBody, setNewBody] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
        if (editingIndex !== null) {
            const updated = templates.map((t, i) =>
                i === editingIndex ? { name: newName.trim(), body: newBody.trim() } : t
            );
            persist(updated);
            setEditingIndex(null);
        } else {
            persist([...templates, { name: newName.trim(), body: newBody.trim() }]);
        }
        setNewName('');
        setNewBody('');
    };

    const handleEditTemplate = (index: number) => {
        setEditingIndex(index);
        setNewName(templates[index].name);
        setNewBody(templates[index].body);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setNewName('');
        setNewBody('');
    };

    const handleDeleteTemplate = (index: number) => {
        if (editingIndex === index) handleCancelEdit();
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

    const handleTelegram = async (body: string) => {
        try {
            await navigator.clipboard.writeText(rendered(body));
        } catch { /* ignore */ }
        const cleanPhone = cleanPhoneForWhatsapp(phone);
        window.open(`https://t.me/+${cleanPhone}`, '_blank', 'noopener,noreferrer');
        setSnackbar({ open: true, message: 'Message copied — paste it in the Telegram chat.' });
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                        {manageMode ? 'Manage Templates' : `Message — ${contactLabel}: ${phone}`}
                    </Box>
                    <Button
                        size="small"
                        variant={manageMode ? 'text' : 'outlined'}
                        startIcon={manageMode ? <ArrowBackIcon /> : <SettingsIcon />}
                        onClick={() => { setManageMode(v => !v); handleCancelEdit(); }}
                    >
                        {manageMode ? 'Back' : 'Manage'}
                    </Button>
                </DialogTitle>

                <DialogContent dividers>
                    {manageMode ? (
                        /* ── Manage view ── */
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {templates.map((t, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1, py: 0.5,
                                        bgcolor: editingIndex === i ? 'action.selected' : 'transparent',
                                        borderRadius: 1, px: 0.5,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ flex: 1 }}>{t.name}</Typography>
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditTemplate(i)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(i)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))}
                            {templates.length === 0 && (
                                <Typography variant="body2" color="text.secondary">No templates yet.</Typography>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Button
                                size="small"
                                variant="text"
                                color="warning"
                                onClick={() => { persist(DEFAULT_TEMPLATES); handleCancelEdit(); }}
                            >
                                Reset to defaults
                            </Button>
                            <Divider sx={{ mb: 1 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                {editingIndex !== null ? `Editing: ${templates[editingIndex]?.name}` : 'Add new template'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
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
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    startIcon={editingIndex !== null ? <EditIcon /> : <AddIcon />}
                                    onClick={handleAddTemplate}
                                    disabled={!newName.trim() || !newBody.trim()}
                                >
                                    {editingIndex !== null ? 'Save Changes' : 'Add Template'}
                                </Button>
                                {editingIndex !== null && (
                                    <Button variant="outlined" onClick={handleCancelEdit}>
                                        Cancel
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        /* ── Templates view ── */
                        <>
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
                                            <Tooltip title="Copy message and open Telegram chat">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<SendIcon />}
                                                    onClick={() => handleTelegram(t.body)}
                                                    sx={{ bgcolor: '#2AABEE', '&:hover': { bgcolor: '#1d96d4' } }}
                                                >
                                                    Telegram
                                                </Button>
                                            </Tooltip>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                            {templates.length === 0 && (
                                <Typography color="text.secondary">
                                    No templates yet. Click ⚙ to add one.
                                </Typography>
                            )}
                        </>
                    )}
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
