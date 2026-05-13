'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog,
    Button,
    Box,
    Typography,
    Chip,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MessageIcon from '@mui/icons-material/Message';
import MessageTemplateDialog from './MessageTemplateDialog';
import OverdueChip from './OverdueChip';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// draft holds per-field string overrides; keys match UserData field names
type Draft = Partial<Record<string, string>>;

function initialDraft(): Draft { return {}; }

// ─── Primitive display helpers ────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography component="div" sx={{
            fontSize: 11, lineHeight: 1.3, fontWeight: 400,
            color: 'var(--ink-3)', mb: '2px',
        }}>
            {children}
        </Typography>
    );
}

function FieldValue({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
    return (
        <Typography component="div" sx={{
            fontSize: 15, lineHeight: 1.4, fontWeight: 500, mb: '12px',
            color: danger ? 'var(--danger)' : 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
        }}>
            {children ?? '—'}
        </Typography>
    );
}

function ColTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography component="div" sx={{
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            letterSpacing: '0.02em', mb: '14px',
        }}>
            {children}
        </Typography>
    );
}

// ─── Below-fold helpers ───────────────────────────────────────────────────────

function BelowTitle({ children, sx }: { children: React.ReactNode; sx?: object }) {
    return (
        <Typography component="div" sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            mb: '12px',
            ...sx,
        }}>
            {children}
        </Typography>
    );
}

function LedgerRow({ label, value }: { label: string; value: number }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: '3px' }}>
            <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>
                {value.toLocaleString()}
            </Typography>
        </Box>
    );
}

// ─── Inline editable field (used inside the capture region) ──────────────────
// Defined at module level so React never unmounts it between renders.

interface CaptureFieldProps {
    label: string;
    fieldKey: string;
    rawValue: string | number | undefined;
    // Only the value for this specific field — avoids re-rendering all fields
    // when a sibling's draft changes.
    draftValue: string | undefined;
    editing: boolean;
    editable?: boolean;
    danger?: boolean;
    // True only for the field that triggered edit-mode activation (auto-focus on mount).
    autoFocus?: boolean;
    onDraft: (key: string, val: string) => void;
    onActivateEdit: (key: string) => void;
}

// React.memo: only re-renders when its own props change.
// During typing, only the active field's draftValue changes → only that field re-renders.
const CaptureField = React.memo(function CaptureField({
    label, fieldKey, rawValue, draftValue, editing, editable = true,
    danger = false, autoFocus = false, onDraft, onActivateEdit,
}: CaptureFieldProps) {
    const displayValue = draftValue !== undefined ? draftValue : String(rawValue ?? '');
    const [localVal, setLocalVal] = useState(displayValue);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Only reset localVal when the field is explicitly cleared (draftValue → undefined),
    // i.e. the user hit Reset. Do NOT sync from draftValue while the user is typing —
    // localVal is already ahead of the debounced draftValue, and overwriting it causes
    // the cursor to jump / characters to disappear.
    useEffect(() => {
        if (draftValue === undefined) {
            setLocalVal(String(rawValue ?? ''));
        }
    }, [draftValue, rawValue]);

    const commit = (v: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onDraft(fieldKey, v);
    };

    if (editing && editable) {
        return (
            <Box sx={{ mb: '12px' }}>
                <FieldLabel>{label}</FieldLabel>
                <Box
                    component="input"
                    autoFocus={autoFocus}
                    value={localVal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        setLocalVal(v);
                        if (timerRef.current) clearTimeout(timerRef.current);
                        timerRef.current = setTimeout(() => onDraft(fieldKey, v), 300);
                    }}
                    onBlur={() => commit(localVal)}
                    sx={{
                        display: 'block',
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 15,
                        fontWeight: 500,
                        color: danger ? 'var(--danger)' : 'var(--ink)',
                        fontVariantNumeric: 'tabular-nums',
                        borderRadius: 'var(--r-sm)',
                        px: '4px',
                        py: '2px',
                        // Hex equivalents of oklch(88% 0.08 70) and oklch(99% 0.02 70)
                        // — html2canvas can't parse oklch() so avoid it on rendered elements.
                        boxShadow: 'inset 0 0 0 1px #e2cd94',
                        cursor: 'text',
                        '&:focus': {
                            boxShadow: 'inset 0 0 0 2px var(--warn-ink)',
                            background: '#fefdf7',
                        },
                    }}
                />
            </Box>
        );
    }

    return (
        <Box
            sx={{ mb: '12px', cursor: editable ? 'text' : 'default' }}
            onDoubleClick={editable ? () => onActivateEdit(fieldKey) : undefined}
            title={editable && !editing ? 'Double-click to edit' : undefined}
        >
            <FieldLabel>{label}</FieldLabel>
            <FieldValue danger={danger}>{displayValue || '—'}</FieldValue>
        </Box>
    );
});

// ─── Photo placeholder ────────────────────────────────────────────────────────

function PhotoBox({ src, alt }: { src?: string; alt: string }) {
    if (!src) {
        return (
            <Box sx={{
                width: 140, height: 140, borderRadius: 'var(--r-md)',
                background: 'repeating-linear-gradient(45deg, var(--paper-3) 0px, var(--paper-3) 6px, var(--paper-2) 6px, var(--paper-2) 12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: '12px', border: '1px solid var(--line)',
            }}>
                <Typography sx={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', px: 1 }}>{alt}</Typography>
            </Box>
        );
    }
    return (
        <Box component="img" src={src} alt={alt} sx={{
            width: 140, height: 140, objectFit: 'cover',
            borderRadius: 'var(--r-md)', mb: '12px', display: 'block',
            border: '1px solid var(--line)',
        }} />
    );
}

// ─── Pulsing dot for edit banner ──────────────────────────────────────────────

function PulsingDot() {
    return (
        <Box component="span" sx={{
            display: 'inline-block',
            width: 7, height: 7,
            borderRadius: '50%',
            bgcolor: 'var(--warn-ink)',
            flexShrink: 0,
            animation: 'pulseOpacity 1.4s ease-in-out infinite',
            '@keyframes pulseOpacity': {
                '0%, 100%': { opacity: 1 },
                '50%':       { opacity: 0.35 },
            },
        }} />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DebtorDetailDialog({ open, onClose, user }: DebtorDetailDialogProps) {
    const [editing, setEditing]   = useState(false);
    const [draft, setDraft]       = useState<Draft>(initialDraft);
    const [focusKey, setFocusKey] = useState<string | null>(null);
    const [copied, setCopied]     = useState(false);
    const [msgDialog, setMsgDialog] = useState<{ phone: string; label: string } | null>(null);
    const captureRef = useRef<HTMLDivElement>(null);

    // Reset when dialog opens with a (possibly different) user
    useEffect(() => {
        if (open) {
            setEditing(false);
            setDraft(initialDraft());
            setFocusKey(null);
        }
    }, [open, user]);

    // Exit edit mode but preserve draft values so the capture region
    // keeps showing the edited numbers even in view mode.
    const exitEdit = useCallback(() => {
        setEditing(false);
        setFocusKey(null);
    }, []);

    // Reset clears all edits back to the original user values.
    const resetDraft = () => setDraft(initialDraft());

    // Double-click on an editable field activates edit mode and focuses that field.
    const activateEditFor = useCallback((key: string) => {
        setEditing(true);
        setFocusKey(key);
    }, []);

    const onDraft = useCallback((key: string, val: string) => {
        setDraft(d => ({ ...d, [key]: val }));
    }, []);

    // Keyboard: Escape → exit edit mode
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && editing) { e.preventDefault(); exitEdit(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, editing, exitEdit]);

    const handleCopyAppName = async () => {
        try {
            await navigator.clipboard.writeText(user.appName || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    };

    // Resolved values: draft overrides user original
    const get = (key: string, fallback: string | number | undefined = '') =>
        key in draft ? (draft[key] ?? '') : String(fallback ?? '');

    const contacts: { label: string; phone: string }[] = [
        { label: 'Primary',   phone: user.phone },
        { label: 'Contact 1', phone: user.contact1Phone || '' },
        { label: 'Contact 2', phone: user.contact2Phone || '' },
        { label: 'Contact 3', phone: user.contact3Phone || '' },
    ].filter(c => !!c.phone);

    const repayNum  = Number(get('repayAmount',           user.repayAmount));
    const feeNum    = Number(get('overdueFee',            user.overdueFee));
    const totalNum  = Number(get('totalAmount',           user.totalAmount));
    const extNum    = Number(get('totalExtensionAmount',  user.totalExtensionAmount));
    const hasDraft  = Object.keys(draft).length > 0;

    // Shared stable callbacks — these never change identity so React.memo works.
    const sharedFieldProps = { editing, onDraft, onActivateEdit: activateEditFor };

    return (
        <>
            <Dialog
                open={open}
                onClose={editing ? undefined : onClose}
                maxWidth="lg"
                fullWidth
                scroll="body"
            >
                <Box className="sheet" sx={{
                    position: 'relative',
                    outline: editing ? '2px solid var(--warn)' : 'none',
                    borderRadius: 'var(--r-lg)',
                    transition: 'outline 120ms var(--ease)',
                }}>

                    {/* ── Zone 1 · Edit banner ───────────────────────────────── */}
                    {editing && (
                        <Box
                            className="edit-banner"
                            role="status"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                px: '20px',
                                py: '10px',
                                bgcolor: 'oklch(95% 0.08 70)',
                                color: 'var(--warn-ink)',
                                borderBottom: '1px solid oklch(85% 0.10 70)',
                                borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
                                flexWrap: 'wrap',
                            }}
                        >
                            <PulsingDot />
                            <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--warn-ink)' }}>
                                Edit mode
                                <Box component="span" sx={{ fontWeight: 400, color: 'var(--warn-ink)', opacity: 0.7 }}>
                                    {' '}· double-click any field to adjust before capturing.
                                </Box>
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Button
                                size="small"
                                startIcon={<UndoIcon />}
                                onClick={resetDraft}
                                disabled={!hasDraft}
                                sx={{ color: 'var(--warn-ink)', borderColor: 'var(--warn-ink)', '&:hover': { bgcolor: 'oklch(90% 0.1 70)' } }}
                            >
                                Reset
                            </Button>
                            <Typography sx={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10,
                                color: 'var(--warn-ink)',
                                opacity: 0.7,
                                letterSpacing: '0.04em',
                                whiteSpace: 'nowrap',
                            }}>
                                Use OS screenshot to capture the outlined area
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={exitEdit}
                                sx={{ color: 'var(--warn-ink)', border: '1px solid oklch(75% 0.12 70)', '&:hover': { bgcolor: 'oklch(90% 0.1 70)' } }}
                            >
                                Exit
                            </Button>
                        </Box>
                    )}

                    {/* ── Zone 1 · Page header ──────────────────────────────── */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        px: '24px',
                        py: '16px',
                        borderBottom: '1px solid var(--line)',
                    }}>
                        <Typography sx={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 26,
                            lineHeight: 1.1,
                            fontWeight: 400,
                            color: 'var(--ink)',
                            letterSpacing: '-0.01em',
                            flex: 1,
                        }}>
                            {user.userName}
                        </Typography>
                        <Box className="action-chips" sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <OverdueChip days={user.overdueDay} />
                            {user.stageName && (
                                <Chip
                                    label={user.stageName}
                                    size="small"
                                    sx={{ height: 20, fontSize: 11, fontWeight: 500, bgcolor: 'var(--paper-3)', color: 'var(--ink-2)' }}
                                />
                            )}
                        </Box>
                        <IconButton size="small" onClick={onClose} disabled={editing} sx={{ color: 'var(--ink-3)' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* ── Zone 1 · Action bar ───────────────────────────────── */}
                    <Box
                        className="action-bar"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            px: '24px',
                            py: '10px',
                            borderBottom: '1px solid var(--line-2)',
                            bgcolor: 'var(--paper-2)',
                        }}
                    >
                        {contacts.length > 0 && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<MessageIcon />}
                                onClick={() => setMsgDialog({ phone: contacts[0].phone, label: contacts[0].label })}
                                sx={{ fontSize: 12 }}
                            >
                                WhatsApp
                            </Button>
                        )}
                        <Box sx={{ flex: 1 }} />
                        {!editing && hasDraft && (
                            <Button
                                size="small"
                                startIcon={<UndoIcon />}
                                onClick={resetDraft}
                                sx={{ fontSize: 12, color: 'var(--warn-ink)' }}
                            >
                                Reset changes
                            </Button>
                        )}
                        {!editing && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => setEditing(true)}
                                sx={{ fontSize: 12 }}
                            >
                                Edit for screenshot
                            </Button>
                        )}
                    </Box>

                    {/* ── Zone 2 · Capture region ───────────────────────────── */}
                    <Box
                        ref={captureRef}
                        className={`capture-region${editing ? ' editing' : ''}`}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '180px 1.1fr 1fr',
                            gap: '28px',
                            p: '24px',
                            bgcolor: '#fff',
                            // Dashed outline to mark screenshot area in edit mode
                            ...(editing && {
                                outline: '2px dashed var(--warn)',
                                outlineOffset: '-2px',
                                position: 'relative',
                                '&::after': {
                                    content: '"Screenshot area"',
                                    position: 'absolute',
                                    top: -11,
                                    left: 12,
                                    fontSize: 10,
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 500,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'var(--warn-ink)',
                                    bgcolor: 'oklch(95% 0.08 70)',
                                    px: '6px',
                                    lineHeight: '22px',
                                },
                            }),
                        }}
                    >
                        {/* Col 1 · Photos */}
                        <Box>
                            <ColTitle>Photos</ColTitle>
                            <PhotoBox src={user.idNoUrl}       alt="ID Photo" />
                            <PhotoBox src={user.livingNessUrl} alt="Face Photo" />
                        </Box>

                        {/* Col 2 · Personal Info */}
                        <Box>
                            <ColTitle>Personal Info</ColTitle>
                            <CaptureField label="User Name"  fieldKey="userName"    rawValue={user.userName}    draftValue={undefined} editable={false} {...sharedFieldProps} />
                            <CaptureField label="Email"      fieldKey="email"       rawValue={user.email}       draftValue={undefined} editable={false} {...sharedFieldProps} />
                            <CaptureField label="Phone"      fieldKey="phone"       rawValue={user.phone}       draftValue={undefined} editable={false} {...sharedFieldProps} />
                            <CaptureField label="App Name"   fieldKey="appName"     rawValue={user.appName}     draftValue={undefined} editable={false} {...sharedFieldProps} />
                            <CaptureField label="Product"    fieldKey="productName" rawValue={user.productName} draftValue={undefined} editable={false} {...sharedFieldProps} />
                            <CaptureField label="Stage"      fieldKey="stageName"   rawValue={user.stageName}   draftValue={undefined} editable={false} {...sharedFieldProps} />
                        </Box>

                        {/* Col 3 · Financial Info */}
                        <Box>
                            <ColTitle>Financial Info</ColTitle>
                            <CaptureField label="Contract Amount"  fieldKey="totalAmount"         rawValue={user.totalAmount}         draftValue={draft['totalAmount']}         autoFocus={focusKey === 'totalAmount'}         {...sharedFieldProps} />
                            <CaptureField label="Total Amount Due" fieldKey="repayAmount"          rawValue={user.repayAmount}         draftValue={draft['repayAmount']}         autoFocus={focusKey === 'repayAmount'}         danger {...sharedFieldProps} />
                            <CaptureField label="Overdue Fee"      fieldKey="overdueFee"           rawValue={user.overdueFee}          draftValue={draft['overdueFee']}          autoFocus={focusKey === 'overdueFee'}          danger {...sharedFieldProps} />
                            <CaptureField label="Overdue Days"     fieldKey="overdueDay"           rawValue={user.overdueDay}          draftValue={draft['overdueDay']}          autoFocus={focusKey === 'overdueDay'}          danger {...sharedFieldProps} />
                            <CaptureField label="Extension Amount" fieldKey="totalExtensionAmount" rawValue={user.totalExtensionAmount} draftValue={draft['totalExtensionAmount']} autoFocus={focusKey === 'totalExtensionAmount'} {...sharedFieldProps} />
                            <CaptureField label="Repay Time"       fieldKey="repayTime"            rawValue={user.repayTime}           draftValue={draft['repayTime']}           autoFocus={focusKey === 'repayTime'}           {...sharedFieldProps} />
                        </Box>
                    </Box>

                    {/* ── Zone 3 · Below fold (collector-only) ──────────────── */}
                    <Box
                        className="below-fold"
                        sx={{
                            opacity: editing ? 0.45 : 1,
                            transition: 'opacity var(--dur-fast) var(--ease)',
                            bgcolor: 'var(--paper-2)',
                            borderTop: '1px solid var(--line)',
                            px: '28px',
                            py: '20px',
                            // Prevent interaction while dimmed in edit mode
                            pointerEvents: editing ? 'none' : 'auto',
                        }}
                    >
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>

                            {/* ── Left: Ledger + activity ──── */}
                            <Box>
                                <BelowTitle>Ledger · collector view only</BelowTitle>

                                {/* Ledger card */}
                                <Box sx={{
                                    border: '1px solid var(--line)',
                                    borderRadius: 'var(--r-md)',
                                    p: '12px 14px',
                                    bgcolor: 'var(--paper)',
                                }}>
                                    <LedgerRow label="Contract amount" value={totalNum} />
                                    <LedgerRow label="+ Overdue fee"   value={feeNum} />
                                    {extNum > 0 && <LedgerRow label="+ Extension" value={extNum} />}
                                    <LedgerRow label="+ Total due"     value={repayNum} />
                                    {/* Total row — Instrument Serif, danger */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        borderTop: '1px solid var(--line)',
                                        mt: '4px',
                                        pt: '8px',
                                    }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                                            Collect today
                                        </Typography>
                                        <Typography sx={{
                                            fontFamily: 'var(--font-display)',
                                            fontSize: 17,
                                            fontWeight: 400,
                                            color: 'var(--danger)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {(repayNum + feeNum + (extNum > 0 ? 0 : 0)).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>

                                {user.note && (
                                    <Box sx={{ mt: '14px' }}>
                                        <Typography sx={{ fontSize: 11, color: 'var(--ink-3)', mb: '4px' }}>Note</Typography>
                                        <Typography sx={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{user.note}</Typography>
                                    </Box>
                                )}

                                <BelowTitle sx={{ mt: '18px' }}>Last actions</BelowTitle>
                                <Typography sx={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                                    No recent actions recorded.
                                </Typography>
                            </Box>

                            {/* ── Right: Contacts + how edit mode works ── */}
                            <Box>
                                <BelowTitle>Contacts · collector view only</BelowTitle>

                                {contacts.length === 0 && (
                                    <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>No contacts</Typography>
                                )}
                                {contacts.map((c, i) => (
                                    <Box key={c.label} sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: '8px',
                                        borderBottom: i < contacts.length - 1 ? '1px solid var(--line-2)' : 'none',
                                    }}>
                                        <Box>
                                            <Typography sx={{ fontSize: 11, color: 'var(--ink-3)', mb: '1px' }}>{c.label}</Typography>
                                            <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                                                {c.phone}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {user.appName && c.label === 'Primary' && (
                                                <Tooltip title={copied ? 'Copied!' : 'Copy app name'}>
                                                    <IconButton size="small" onClick={handleCopyAppName} sx={{ color: 'var(--ink-3)' }}>
                                                        <ContentCopyIcon sx={{ fontSize: 13 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Button
                                                size="small"
                                                onClick={() => setMsgDialog({ phone: c.phone, label: c.label })}
                                                sx={{
                                                    fontSize: 11, px: '7px', py: '3px',
                                                    minWidth: 0, borderRadius: 'var(--r-sm)',
                                                    border: '1px solid var(--line)',
                                                    bgcolor: 'var(--paper)', color: 'var(--ink-2)',
                                                    '&:hover': { bgcolor: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' },
                                                }}
                                            >
                                                WhatsApp
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}

                                <BelowTitle sx={{ mt: '18px' }}>How edit mode works</BelowTitle>
                                <Box
                                    component="ol"
                                    sx={{
                                        fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7,
                                        pl: '18px', m: 0,
                                        '& li': { mb: '2px' },
                                        '& em': { fontStyle: 'normal', color: 'var(--ink)', fontWeight: 500 },
                                    }}
                                >
                                    <li>Click <em>Edit for screenshot</em>. The capture area gets a dashed outline.</li>
                                    <li>Double-click any financial field to overwrite before sending.</li>
                                    <li>Hit <em>Capture screenshot</em> — outline hides, only the outlined region is saved.</li>
                                    <li>Exit edit mode to keep or discard changes. Nothing syncs to the CRM.</li>
                                </Box>
                            </Box>
                        </Box>
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
