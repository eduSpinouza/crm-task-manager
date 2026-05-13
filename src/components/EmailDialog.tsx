'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Tabs,
    Tab,
    IconButton,
    LinearProgress,
    Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { mergeTemplates, hideDefault, type EmailTemplate as DefaultEmailTemplate } from '@/lib/defaultTemplates';

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

type EmailTemplate = DefaultEmailTemplate;

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

const overlineSx = {
    font: '500 10px var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-3)',
    mb: 1,
};

const fieldSx = {
    width: '100%',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-md)',
    background: 'var(--paper-2)',
    p: '10px 12px',
    fontSize: 14,
    color: 'var(--ink)',
    fontFamily: 'var(--font-sans)',
    outline: 0,
    display: 'block',
    transition: 'border-color 120ms',
    '&::placeholder': { color: 'var(--ink-3)' },
    '&:hover': { borderColor: 'var(--ink-3)' },
    '&:focus': { borderColor: 'var(--accent)', borderWidth: '2px', background: 'var(--paper)' },
};

const PLACEHOLDER_GROUPS = [
    { group: 'Contact',  tokens: ['{{userName}}', '{{email}}', '{{phone}}', '{{appName}}', '{{productName}}'] },
    { group: 'Schedule', tokens: ['{{repayTime}}', '{{stageName}}'] },
    { group: 'Amounts',  tokens: ['{{contractAmount}}', '{{totalAmount}}', '{{overdueFee}}', '{{extensionAmount}}'] },
    { group: 'Images',   tokens: ['{{idNoUrl}}', '{{livingNessUrl}}'] },
];

export default function EmailDialog({ open, onClose, selectedUsers, onSuccess }: EmailDialogProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    useEffect(() => {
        let userTemplates: EmailTemplate[] = [];
        try { userTemplates = JSON.parse(localStorage.getItem('email_templates') || '[]'); } catch { }
        setTemplates(mergeTemplates(userTemplates));
    }, []);

    useEffect(() => {
        if (!open) return;
        axios.get('/api/email/accounts').then(res => {
            const accts: EmailAccount[] = res.data.accounts ?? [];
            setAccounts(accts);
            const lastUsed = localStorage.getItem(LAST_ACCOUNT_KEY);
            const preferred =
                accts.find(a => a.id === lastUsed) ??
                accts.find(a => a.isDefault) ??
                accts[0];
            setSelectedAccountId(preferred?.id ?? '');
        }).catch(() => setAccounts([]));
    }, [open]);

    const saveTemplates = (next: EmailTemplate[]) => {
        setTemplates(next);
        localStorage.setItem('email_templates', JSON.stringify(next.filter(t => !t.isDefault)));
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim() || !subject.trim() || !body.trim()) {
            setError('Template name, subject, and body are required');
            return;
        }
        saveTemplates([...templates.filter(t => t.name !== templateName), { name: templateName, subject, body }]);
        setTemplateName('');
        setError(null);
    };

    const handleLoadTemplate = (template: EmailTemplate) => {
        setSubject(template.subject);
        setBody(template.body);
        setTabIndex(0);
    };

    const handleDeleteTemplate = (name: string) => {
        const target = templates.find(t => t.name === name);
        if (target?.isDefault) hideDefault(name);
        saveTemplates(templates.filter(t => t.name !== name));
    };

    const handleSend = async () => {
        setError(null);
        setSending(true);
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

    const getPreview = () => {
        if (selectedUsers.length === 0) return body;
        const u = selectedUsers[0];
        return body
            .replace(/\{\{userName\}\}/g, u.userName || '')
            .replace(/\{\{email\}\}/g, u.email || '')
            .replace(/\{\{phone\}\}/g, u.phone || '')
            .replace(/\{\{appName\}\}/g, u.appName || '')
            .replace(/\{\{productName\}\}/g, u.productName || '')
            .replace(/\{\{principal\}\}/g, String(u.principal || ''))
            .replace(/\{\{contractAmount\}\}/g, String(u.totalAmount || ''))
            .replace(/\{\{totalAmount\}\}/g, String(u.repayAmount || ''))
            .replace(/\{\{overdueFee\}\}/g, String(u.overdueFee || ''))
            .replace(/\{\{extensionAmount\}\}/g, String(u.totalExtensionAmount ?? ''))
            .replace(/\{\{repayTime\}\}/g, u.repayTime || '')
            .replace(/\{\{stageName\}\}/g, u.stageName || '')
            .replace(/\{\{idNoUrl\}\}/g, u.idNoUrl ? `<img src="${u.idNoUrl}" width="200" />` : '')
            .replace(/\{\{livingNessUrl\}\}/g, u.livingNessUrl ? `<img src="${u.livingNessUrl}" width="200" />` : '');
    };

    const recipientCount = selectedUsers.filter(u => u.email).length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            {/* Title */}
            <Box sx={{ px: 3, pt: 3, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                    <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>
                        Send email
                    </Typography>
                    <Box sx={{
                        font: '500 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: 'var(--ink-3)', bgcolor: 'var(--paper-2)', border: '1px solid var(--line)',
                        borderRadius: '3px', px: '6px', py: '2px',
                    }}>
                        {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                    </Box>
                </Box>
            </Box>

            {/* Account picker */}
            <Box sx={{ px: 3, pt: 2.5 }}>
                <Typography sx={overlineSx}>From</Typography>
                {accounts.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>
                        No Gmail accounts connected — add one in Settings.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {accounts.map(a => (
                            <Box
                                key={a.id}
                                onClick={() => setSelectedAccountId(a.id)}
                                sx={{
                                    px: '10px', py: '5px',
                                    border: '1px solid',
                                    borderColor: selectedAccountId === a.id ? 'var(--accent)' : 'var(--line)',
                                    borderRadius: '3px',
                                    bgcolor: selectedAccountId === a.id ? 'var(--accent-soft)' : 'transparent',
                                    color: selectedAccountId === a.id ? 'var(--accent)' : 'var(--ink-2)',
                                    font: '500 12px var(--font-sans)',
                                    cursor: 'pointer',
                                    transition: 'all 100ms',
                                    userSelect: 'none',
                                    '&:hover': {
                                        borderColor: selectedAccountId === a.id ? 'var(--accent)' : 'var(--ink-3)',
                                        color: selectedAccountId === a.id ? 'var(--accent)' : 'var(--ink)',
                                    },
                                }}
                            >
                                {a.email}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Tabs */}
            <Box sx={{ px: 3, mt: 2.5 }}>
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
                    <Tab label="Compose" />
                    <Tab label="Templates" />
                    <Tab label="Preview" />
                </Tabs>
            </Box>

            <DialogContent sx={{ pt: 2.5 }}>
                {/* Compose */}
                {tabIndex === 0 && (
                    <Box>
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={overlineSx}>Subject</Typography>
                            <Box
                                component="input"
                                type="text"
                                value={subject}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                                placeholder="e.g., Payment Reminder for {{productName}}"
                                sx={fieldSx}
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography sx={overlineSx}>Body</Typography>
                            <Box
                                component="textarea"
                                value={body}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                                placeholder="Dear {{userName}}, your payment of {{principal}} is due on {{repayTime}}…"
                                rows={8}
                                sx={{ ...fieldSx, resize: 'none' }}
                            />
                        </Box>

                        <Box sx={{ p: '10px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', bgcolor: 'var(--paper-2)' }}>
                            <Typography sx={{ ...overlineSx, mb: 0.75 }}>Available placeholders</Typography>
                            {PLACEHOLDER_GROUPS.map(({ group, tokens }) => (
                                <Box key={group} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                                    <Typography sx={{ font: '500 10px var(--font-mono)', color: 'var(--ink-3)', width: 60, mt: '2px', flexShrink: 0 }}>
                                        {group}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {tokens.map(t => (
                                            <Box key={t} sx={{
                                                font: '400 11px var(--font-mono)', color: 'var(--ink-2)',
                                                bgcolor: 'var(--paper-3)', border: '1px solid var(--line-2)',
                                                borderRadius: '3px', px: '5px', py: '1px',
                                            }}>
                                                {t}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Templates */}
                {tabIndex === 1 && (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, alignItems: 'center' }}>
                            <Box
                                component="input"
                                type="text"
                                value={templateName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)}
                                placeholder="Template name…"
                                sx={{ ...fieldSx, flex: 1 }}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleSaveTemplate}
                                sx={{
                                    fontFamily: 'var(--font-sans)', fontSize: 12, height: 38, flexShrink: 0,
                                    borderColor: 'var(--line)', color: 'var(--ink-2)', textTransform: 'none',
                                    '&:hover': { borderColor: 'var(--ink-3)', color: 'var(--ink)', bgcolor: 'transparent' },
                                }}
                            >
                                Save current
                            </Button>
                        </Box>

                        {templates.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>No saved templates.</Typography>
                        ) : (
                            <Box sx={{ border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                                {templates.map((t, i) => (
                                    <Box
                                        key={t.name}
                                        onClick={() => handleLoadTemplate(t)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                            px: 1.5, py: 1.25, cursor: 'pointer',
                                            borderBottom: i < templates.length - 1 ? '1px solid var(--line-2)' : 'none',
                                            '&:hover': { bgcolor: 'var(--paper-2)' },
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>
                                                    {t.name}
                                                </Typography>
                                                {t.isDefault && (
                                                    <Box sx={{ font: '500 9px var(--font-mono)', letterSpacing: '0.05em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                                                        default
                                                    </Box>
                                                )}
                                            </Box>
                                            <Typography sx={{ fontSize: 12, color: 'var(--ink-3)', mt: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.subject}
                                            </Typography>
                                        </Box>
                                        <Tooltip title="Delete template">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.name); }}
                                                sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--danger)' } }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Preview */}
                {tabIndex === 2 && (
                    <Box>
                        <Typography sx={{ ...overlineSx, mb: 1.5 }}>
                            Preview — {selectedUsers[0]?.userName || 'no user selected'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                            <Typography component="span" sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.04em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                                Subject
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                {subject.replace(/\{\{userName\}\}/g, selectedUsers[0]?.userName || '')}
                            </Typography>
                        </Box>
                        <Box sx={{
                            p: '12px 14px', bgcolor: 'var(--paper-2)', border: '1px solid var(--line)',
                            borderRadius: 'var(--r-md)', whiteSpace: 'pre-wrap',
                            fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-sans)', lineHeight: 1.6,
                        }}>
                            {getPreview()}
                        </Box>
                    </Box>
                )}

                {error && (
                    <Typography sx={{ fontSize: 12, color: 'var(--danger)', mt: 2 }}>
                        {error}
                    </Typography>
                )}

                {sending && (
                    <LinearProgress sx={{
                        mt: 2, bgcolor: 'var(--line)',
                        '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent)' },
                    }} />
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} disabled={sending} sx={{ color: 'var(--ink-3)' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={sending || !subject.trim() || !body.trim() || !selectedAccountId}
                    sx={{ minWidth: 140 }}
                >
                    {sending ? 'Sending…' : `Send to ${recipientCount}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
