'use client';

import * as React from 'react';
import {
    Dialog, DialogContent, DialogActions,
    Button, CircularProgress, Box, Typography,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import axios from 'axios';

export interface SelectedTask {
    taskId: number;
    orderId: number;
    phone?: string;
    phonePrefix?: string;
    contact1Phone?: string;
    contact2Phone?: string;
    contact3Phone?: string;
}

interface FollowUpDialogProps {
    open: boolean;
    onClose: () => void;
    selectedTasks: SelectedTask[];
    onSuccess: () => void;
}

const SELF_RESULTS = [
    { value: 1, label: 'PTP' },
    { value: 2, label: 'Financial difficult' },
    { value: 3, label: 'Missed' },
    { value: 4, label: 'Powered off' },
    { value: 5, label: 'Invalid number' },
    { value: 6, label: 'Bad attitude' },
];

const CONTACT_RESULTS = [
    { value: 1, label: 'Willing to assist' },
    { value: 3, label: 'Missed' },
    { value: 5, label: 'Invalid number' },
    { value: 6, label: 'Bad attitude' },
];

const TARGETS = [
    { value: 0, label: 'Self' },
    { value: 1, label: 'Emergency 1' },
    { value: 2, label: 'Emergency 2' },
    { value: 3, label: 'Contacts' },
];

const toggleSx = {
    flexWrap: 'wrap',
    gap: 0.5,
    '& .MuiToggleButtonGroup-grouped': {
        border: '1px solid var(--line) !important',
        borderRadius: '3px !important',
        mx: 0,
    },
} as const;

const toggleBtnSx = {
    font: '500 11px var(--font-sans)',
    px: 1.5,
    py: 0.5,
    color: 'var(--ink-2)',
    textTransform: 'none',
    '&.Mui-selected': {
        bgcolor: 'var(--accent)',
        color: '#fff',
        borderColor: 'var(--accent) !important',
        '&:hover': { bgcolor: 'var(--accent)' },
    },
} as const;

const sectionLabelSx = {
    font: '500 10px var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    mb: 1,
} as const;

export default function FollowUpDialog({ open, onClose, selectedTasks, onSuccess }: FollowUpDialogProps) {
    const [note, setNote] = React.useState('');
    const [followTarget, setFollowTarget] = React.useState<number>(0);
    const [followResult, setFollowResult] = React.useState<number>(3);
    const [loading, setLoading] = React.useState(false);

    const resultOptions = followTarget === 0 ? SELF_RESULTS : CONTACT_RESULTS;

    React.useEffect(() => {
        setFollowResult(3);
    }, [followTarget]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('external_api_token');
            const baseUrl = localStorage.getItem('api_base_url') || '';
            await axios.post('/api/users/followup', {
                tasks: selectedTasks,
                note,
                followResult: Number(followResult),
                followTarget: String(followTarget),
            }, {
                headers: { Authorization: token, 'X-API-Base-URL': baseUrl }
            });
            onSuccess();
            setNote('');
        } catch (error) {
            console.error('Follow up failed', error);
            alert('Failed to submit follow ups');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            {/* Title */}
            <Box sx={{ px: 3, pt: 3, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2.5 }}>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 22,
                            lineHeight: 1,
                            color: 'var(--ink)',
                        }}
                    >
                        Follow up
                    </Typography>
                    <Box
                        sx={{
                            font: '500 10px var(--font-mono)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-3)',
                            bgcolor: 'var(--paper-2)',
                            border: '1px solid var(--line)',
                            borderRadius: '3px',
                            px: '6px',
                            py: '2px',
                        }}
                    >
                        {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ pt: 0 }}>
                {/* Target */}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={sectionLabelSx}>Target</Typography>
                    <ToggleButtonGroup
                        value={followTarget}
                        exclusive
                        onChange={(_, v) => { if (v !== null) setFollowTarget(v); }}
                        size="small"
                        sx={toggleSx}
                    >
                        {TARGETS.map(({ value, label }) => (
                            <ToggleButton key={value} value={value} sx={toggleBtnSx}>
                                {label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>

                {/* Result */}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={sectionLabelSx}>Result</Typography>
                    <ToggleButtonGroup
                        value={followResult}
                        exclusive
                        onChange={(_, v) => { if (v !== null) setFollowResult(v); }}
                        size="small"
                        sx={toggleSx}
                    >
                        {resultOptions.map(({ value, label }) => (
                            <ToggleButton key={value} value={value} sx={toggleBtnSx}>
                                {label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>

                {/* Note */}
                <Box>
                    <Typography sx={sectionLabelSx}>Note</Typography>
                    <Box
                        component="textarea"
                        value={note}
                        placeholder="Optional note…"
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                        rows={3}
                        sx={{
                            width: '100%',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-md)',
                            background: 'var(--paper-2)',
                            resize: 'none',
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
                        }}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} disabled={loading} sx={{ color: 'var(--ink-3)' }}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ minWidth: 100 }}>
                    {loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Submit →'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
