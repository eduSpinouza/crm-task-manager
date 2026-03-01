'use client';

import * as React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Select, InputLabel, FormControl, CircularProgress
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

// Follow-Up Result options based on target
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

export default function FollowUpDialog({ open, onClose, selectedTasks, onSuccess }: FollowUpDialogProps) {
    const [note, setNote] = React.useState('');
    const [followTarget, setFollowTarget] = React.useState<number>(0);
    const [followResult, setFollowResult] = React.useState<number>(3); // Default: Missed
    const [loading, setLoading] = React.useState(false);

    // Get result options based on selected target
    const resultOptions = followTarget === 0 ? SELF_RESULTS : CONTACT_RESULTS;

    // Reset followResult when target changes - default to Missed (3) which exists in all option sets
    React.useEffect(() => {
        setFollowResult(3); // Missed
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
                phone: "0000000000" // Placeholder - backend handles per-task
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
            <DialogTitle>Add Follow Up ({selectedTasks.length} selected)</DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="dense">
                    <InputLabel>Follow-up Target</InputLabel>
                    <Select
                        value={followTarget}
                        label="Follow-up Target"
                        onChange={(e) => setFollowTarget(e.target.value as number)}
                    >
                        <MenuItem value={0}>Self</MenuItem>
                        <MenuItem value={1}>Emergency Contact 1</MenuItem>
                        <MenuItem value={2}>Emergency Contact 2</MenuItem>
                        <MenuItem value={3}>Contacts</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth margin="dense">
                    <InputLabel>Follow-up Result</InputLabel>
                    <Select
                        value={followResult}
                        label="Follow-up Result"
                        onChange={(e) => setFollowResult(e.target.value as number)}
                    >
                        {resultOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    autoFocus
                    margin="dense"
                    label="Note"
                    fullWidth
                    multiline
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Submit'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
