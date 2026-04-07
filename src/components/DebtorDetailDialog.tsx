'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    Divider,
    IconButton,
    TextField,
    Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MessageIcon from '@mui/icons-material/Message';
import MessageTemplateDialog from './MessageTemplateDialog';

interface UserData {
    taskId: number;
    orderId: number;
    userName: string;
    phone: string;
    productName: string;
    appName: string;
    totalAmount: number;
    repayAmount: number;
    overdueFee: number;
    overdueDay: number;
    repayTime: string;
    stageName: string;
    followResult: number;
    note: string;
    email?: string;
    idNoUrl?: string;
    livingNessUrl?: string;
    phonePrefix?: string;
    contact1Phone?: string;
    contact2Phone?: string;
    contact3Phone?: string;
    totalExtensionAmount?: number;
    [key: string]: any;
}

interface DebtorDetailDialogProps {
    open: boolean;
    onClose: () => void;
    user: UserData;
}

interface EditableValues {
    overdueFee: string;
    repayAmount: string;
    totalAmount: string;
    totalExtensionAmount: string;
    repayTime: string;
}

function toEditable(user: UserData): EditableValues {
    return {
        overdueFee: String(user.overdueFee ?? ''),
        repayAmount: String(user.repayAmount ?? ''),
        totalAmount: String(user.totalAmount ?? ''),
        totalExtensionAmount: String(user.totalExtensionAmount ?? ''),
        repayTime: user.repayTime ?? '',
    };
}

// ─── module-level helpers (NOT inside the component — prevents remount on each render) ──

function InfoRow({
    label,
    value,
    highlight = false,
    onDoubleClick,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
    onDoubleClick?: () => void;
}) {
    return (
        <Box
            sx={{ mb: 1, cursor: onDoubleClick ? 'cell' : 'default' }}
            onDoubleClick={onDoubleClick}
            title={onDoubleClick ? 'Double-click to edit' : undefined}
        >
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography
                variant="body2"
                fontWeight="medium"
                color={highlight ? 'error.main' : 'text.primary'}
            >
                {value ?? '—'}
            </Typography>
        </Box>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 1, mt: 0.5 }}>
            {children}
        </Typography>
    );
}

function PhotoBox({ src, alt }: { src?: string; alt: string }) {
    if (!src) return (
        <Box sx={{
            width: 140, height: 140, bgcolor: 'grey.200', borderRadius: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1,
        }}>
            <Typography variant="caption" color="text.secondary">{alt}</Typography>
        </Box>
    );
    return (
        <Box
            component="img"
            src={src}
            alt={alt}
            sx={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 1, mb: 1, display: 'block' }}
        />
    );
}

interface EditableFieldProps {
    label: string;
    field: keyof EditableValues;
    /** Current value (already resolved: edited values in edit mode, original otherwise) */
    value: string;
    editMode: boolean;
    screenshotMode: boolean;
    numeric?: boolean;
    highlight?: boolean;
    onChange: (field: keyof EditableValues, value: string) => void;
    onActivateEdit: () => void;
}

/**
 * Extracted at module level so React never unmounts it between renders.
 * If defined inside the parent component, every keystroke causes a remount → focus lost.
 *
 * Uses local state + debounce so keystrokes only re-render this field,
 * not the entire content card. onBlur commits immediately.
 */
function EditableField({
    label,
    field,
    value,
    editMode,
    screenshotMode,
    numeric = false,
    highlight = false,
    onChange,
    onActivateEdit,
}: EditableFieldProps) {
    const [localValue, setLocalValue] = useState(value);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync local value when the parent resets or opens a different user
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (newVal: string) => {
        setLocalValue(newVal);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onChange(field, newVal), 300);
    };

    // Commit immediately when the user leaves the field
    const handleBlur = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onChange(field, localValue);
    };

    // Show input only when editing AND not in clean screenshot view
    if (editMode && !screenshotMode) {
        return (
            <TextField
                size="small"
                label={label}
                value={localValue}
                onChange={e => handleChange(e.target.value)}
                onBlur={handleBlur}
                type={numeric ? 'number' : 'text'}
                sx={{ mb: 1, width: '100%' }}
                inputProps={numeric ? { min: 0 } : undefined}
            />
        );
    }
    // Read-only display — double-click activates edit mode
    const display = numeric ? (Number(value) || 0).toLocaleString() : value || '—';
    return (
        <InfoRow
            label={label}
            value={display}
            highlight={highlight && Number(value) > 0}
            onDoubleClick={screenshotMode ? undefined : onActivateEdit}
        />
    );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function DebtorDetailDialog({ open, onClose, user }: DebtorDetailDialogProps) {
    const [editMode, setEditMode] = useState(false);
    const [screenshotMode, setScreenshotMode] = useState(false);
    const [edited, setEdited] = useState<EditableValues>(toEditable(user));
    const [msgDialog, setMsgDialog] = useState<{ phone: string; label: string } | null>(null);
    const [copied, setCopied] = useState(false);

    React.useEffect(() => {
        if (open) {
            setEdited(toEditable(user));
            setEditMode(false);
            setScreenshotMode(false);
        }
    }, [open, user]);

    const handleReset = () => { setEdited(toEditable(user)); };

    const handleChange = (field: keyof EditableValues, value: string) =>
        setEdited(prev => ({ ...prev, [field]: value }));

    const handleCopyAppName = async () => {
        try {
            await navigator.clipboard.writeText(user.appName || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    };

    const enterEdit = () => setEditMode(true);

    // Always display the edited values (they start equal to the original and
    // only diverge when the user modifies something). This way exiting edit
    // mode keeps the modified values visible as plain text.
    const val = edited;

    // True whenever the user has changed at least one field from the original
    const original = toEditable(user);
    const hasEdits = (Object.keys(original) as (keyof EditableValues)[])
        .some(k => original[k] !== edited[k]);

    const overdueFeeNum   = Number(val.overdueFee);
    const repayAmountNum  = Number(val.repayAmount);
    const totalAmountNum  = Number(val.totalAmount);
    const extAmountNum    = Number(val.totalExtensionAmount);

    const contacts: { label: string; phone: string }[] = [
        { label: 'Primary',   phone: user.phone },
        { label: 'Contact 1', phone: user.contact1Phone || '' },
        { label: 'Contact 2', phone: user.contact2Phone || '' },
        { label: 'Contact 3', phone: user.contact3Phone || '' },
    ].filter(c => !!c.phone);

    // Shared props passed down to every EditableField
    const fieldProps = {
        editMode,
        screenshotMode,
        onChange: handleChange,
        onActivateEdit: enterEdit,
    };

    // ── content card — shared between dialog and screenshot view ──────────────
    const contentCard = (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

            {/* Col 1: Photos */}
            <Box sx={{ minWidth: 150, flex: '0 0 auto' }}>
                <SectionTitle>Photos</SectionTitle>
                <PhotoBox src={user.idNoUrl}       alt="ID Photo" />
                <PhotoBox src={user.livingNessUrl} alt="Face Photo" />
            </Box>

            {/* Col 2: Personal info */}
            <Box sx={{ flex: '1 1 180px' }}>
                <SectionTitle>Personal Info</SectionTitle>
                <InfoRow label="User Name" value={user.userName} />
                <InfoRow label="Email"     value={user.email} />
                <InfoRow label="Phone"     value={user.phone} />
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">App Name</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium">{user.appName || '—'}</Typography>
                        {user.appName && !screenshotMode && (
                            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                                <IconButton size="small" onClick={handleCopyAppName}>
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
                <InfoRow label="Product" value={user.productName} />
                <InfoRow label="Stage"   value={user.stageName} />
                {user.note && <InfoRow label="Note" value={user.note} />}
            </Box>

            {/* Col 3: Financial info (editable) */}
            <Box sx={{ flex: '1 1 180px' }}>
                <SectionTitle>Financial Info</SectionTitle>
                <EditableField label="Contract Amount"  field="totalAmount"         value={val.totalAmount}         numeric {...fieldProps} />
                <EditableField label="Total Amount Due" field="repayAmount"          value={val.repayAmount}         numeric highlight {...fieldProps} />
                <EditableField label="Overdue Fee"      field="overdueFee"           value={val.overdueFee}          numeric highlight {...fieldProps} />
                <InfoRow
                    label="Overdue Days"
                    value={user.overdueDay}
                    highlight={user.overdueDay > 0}
                />
                <EditableField label="Extension Amount" field="totalExtensionAmount" value={val.totalExtensionAmount} numeric {...fieldProps} />
                <EditableField label="Repay Time"       field="repayTime"            value={val.repayTime}           {...fieldProps} />
            </Box>

            {/* Col 4: Contacts */}
            <Box sx={{ flex: '1 1 180px' }}>
                <SectionTitle>Contacts</SectionTitle>
                {contacts.map(c => (
                    <Box key={c.label} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                        <Typography variant="body2" fontWeight="medium">{c.phone}</Typography>
                        {!screenshotMode && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<MessageIcon />}
                                sx={{ mt: 0.5 }}
                                onClick={() => setMsgDialog({ phone: c.phone, label: c.label })}
                            >
                                Message
                            </Button>
                        )}
                    </Box>
                ))}
                {contacts.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No contacts</Typography>
                )}

                <Divider sx={{ my: 1 }} />
                <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Full repayment total
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="error.main">
                        ${(repayAmountNum + overdueFeeNum).toLocaleString()}
                    </Typography>
                    {extAmountNum > 0 && (
                        <>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                Rollover (extension) amount
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="error.main">
                                ${extAmountNum.toLocaleString()}
                            </Typography>
                        </>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Contract amount
                    </Typography>
                    <Typography variant="body2">${totalAmountNum.toLocaleString()}</Typography>
                </Box>
            </Box>
        </Box>
    );

    // ── screenshot mode — fullscreen clean view ───────────────────────────────
    if (screenshotMode) {
        return (
            <>
                <Dialog open={open} fullScreen>
                    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>{user.userName}</Typography>
                        {contentCard}
                        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => setScreenshotMode(false)}
                            >
                                Exit Screenshot Mode
                            </Button>
                        </Box>
                    </Box>
                </Dialog>

                {msgDialog && (
                    <MessageTemplateDialog
                        open={!!msgDialog}
                        onClose={() => setMsgDialog(null)}
                        phone={msgDialog.phone}
                        user={user}
                        contactLabel={msgDialog.label}
                    />
                )}
            </>
        );
    }

    // ── normal dialog view ────────────────────────────────────────────────────
    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        Debtor Detail — {user.userName}
                        {editMode && (
                            <Chip label="Edit mode" color="warning" size="small" />
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {contentCard}
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {/* Reset — visible whenever there are active edits */}
                        {hasEdits && (
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<UndoIcon />}
                                onClick={handleReset}
                                size="small"
                            >
                                Reset
                            </Button>
                        )}

                        {/* Toggle edit mode */}
                        {!editMode ? (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={enterEdit}
                                size="small"
                            >
                                Edit for screenshot
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<CloseIcon />}
                                    onClick={() => setEditMode(false)}
                                    size="small"
                                >
                                    Exit edit
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<CameraAltIcon />}
                                    onClick={() => setScreenshotMode(true)}
                                    size="small"
                                >
                                    Screenshot view
                                </Button>
                            </>
                        )}
                    </Box>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {msgDialog && (
                <MessageTemplateDialog
                    open={!!msgDialog}
                    onClose={() => setMsgDialog(null)}
                    phone={msgDialog.phone}
                    user={user}
                    contactLabel={msgDialog.label}
                />
            )}
        </>
    );
}
