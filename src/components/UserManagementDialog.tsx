'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import {
    type LicenseConfig,
    getLicenseDaysLeft,
    getLicenseStatus,
    LICENSE_PRESET_OPTIONS,
} from '@/lib/licenseUtils';

interface ManagedUser {
    username: string;
    role: 'admin' | 'user';
    createdAt?: number;
    createdBy?: string;
    license?: LicenseConfig | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const overlineSx = {
    font: '500 10px var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-3)',
    mb: 1,
};

export default function UserManagementDialog({ open, onClose }: Props) {
    const [users, setUsers] = React.useState<ManagedUser[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const [showForm, setShowForm] = React.useState(false);
    const [newUsername, setNewUsername] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [newRole, setNewRole] = React.useState<'admin' | 'user'>('user');
    const [creating, setCreating] = React.useState(false);

    const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

    const [renameTarget, setRenameTarget] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState('');
    const [renaming, setRenaming] = React.useState(false);

    const [licenseTarget, setLicenseTarget] = React.useState<string | null>(null);
    const [selectedDays, setSelectedDays] = React.useState<number>(30);
    const [licenseStartDate, setLicenseStartDate] = React.useState<string>('');
    const [settingLicense, setSettingLicense] = React.useState(false);

    const todayISO = new Date().toISOString().split('T')[0];

    const fetchUsers = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('/api/admin/users');
            if (response.data?.success) {
                setUsers(response.data.users);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (open) {
            fetchUsers();
            setShowForm(false);
            setLicenseTarget(null);
            setSuccess('');
            setError('');
        }
    }, [open, fetchUsers]);

    const handleCreate = async () => {
        setCreating(true);
        setError('');
        try {
            await axios.post('/api/admin/users', {
                username: newUsername,
                password: newPassword,
                role: newRole,
            });
            setSuccess(`User "${newUsername}" created`);
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            setShowForm(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const handleRename = async () => {
        if (!renameTarget || !renameValue.trim()) return;
        setRenaming(true);
        setError('');
        try {
            await axios.patch('/api/admin/users', {
                username: renameTarget,
                action: 'rename',
                newUsername: renameValue.trim(),
            });
            setSuccess(`User renamed to "${renameValue.trim()}"`);
            setRenameTarget(null);
            setRenameValue('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to rename user');
        } finally {
            setRenaming(false);
        }
    };

    const handleDelete = async (username: string) => {
        setError('');
        try {
            await axios.delete('/api/admin/users', { data: { username } });
            setSuccess(`"${username}" deleted`);
            setDeleteTarget(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete user');
            setDeleteTarget(null);
        }
    };

    const handleSetLicense = async () => {
        if (!licenseTarget) return;
        setSettingLicense(true);
        setError('');
        try {
            const startTimestamp = licenseStartDate
                ? new Date(licenseStartDate).getTime()
                : undefined;
            await axios.patch('/api/admin/users', {
                username: licenseTarget,
                action: 'setLicense',
                durationDays: selectedDays,
                ...(startTimestamp !== undefined && { startDate: startTimestamp }),
            });
            const preset = LICENSE_PRESET_OPTIONS.find(o => o.days === selectedDays);
            setSuccess(`License set for "${licenseTarget}": ${preset?.label ?? `${selectedDays} days`}`);
            setLicenseTarget(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to set license');
        } finally {
            setSettingLicense(false);
        }
    };

    const formatDate = (ts?: number) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatLicense = (license?: LicenseConfig | null): React.ReactNode => {
        const status = getLicenseStatus(license);
        const days = getLicenseDaysLeft(license);
        if (status === 'none') return <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>—</Typography>;
        if (status === 'expired') return <Chip label="Expired" size="small" color="error" />;
        const color = status === 'critical' ? 'error' : status === 'warning' ? 'warning' : 'success';
        return <Chip label={`${days}d left`} size="small" color={color} />;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            {/* Title */}
            <Box sx={{ px: 3, pt: 3, pb: 0 }}>
                <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1, mb: 2.5 }}>
                    User Management
                </Typography>
            </Box>

            <DialogContent sx={{ pt: 0, overflow: 'visible' }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <>
                        {/* Users table */}
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 440, overflow: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'var(--paper-2)' }}>
                                        <TableCell sx={{ bgcolor: 'var(--paper-2)' }}>Username</TableCell>
                                        <TableCell sx={{ bgcolor: 'var(--paper-2)' }}>Role</TableCell>
                                        <TableCell sx={{ bgcolor: 'var(--paper-2)' }}>Created</TableCell>
                                        <TableCell sx={{ bgcolor: 'var(--paper-2)' }}>License</TableCell>
                                        <TableCell align="right" sx={{ bgcolor: 'var(--paper-2)' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.username}>
                                            <TableCell>
                                                {renameTarget === user.username ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <TextField
                                                            size="small"
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleRename();
                                                                if (e.key === 'Escape') { setRenameTarget(null); setRenameValue(''); }
                                                            }}
                                                            autoFocus
                                                            inputProps={{ style: { padding: '4px 8px' } }}
                                                            sx={{ width: 140 }}
                                                        />
                                                        <IconButton size="small" color="primary" onClick={handleRename} disabled={renaming || !renameValue.trim()}>
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => { setRenameTarget(null); setRenameValue(''); }}>
                                                            <CloseIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                                        {user.username}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={user.role}
                                                    size="small"
                                                    color={user.role === 'admin' ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                                                    {formatDate(user.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatLicense(user.license)}</TableCell>
                                            <TableCell align="right">
                                                {deleteTarget === user.username ? (
                                                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                                                        <Button size="small" color="error" variant="contained" onClick={() => handleDelete(user.username)}>
                                                            Confirm
                                                        </Button>
                                                        <Button size="small" sx={{ color: 'var(--ink-3)' }} onClick={() => setDeleteTarget(null)}>
                                                            Cancel
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setRenameTarget(user.username);
                                                                setRenameValue(user.username);
                                                                setLicenseTarget(null);
                                                                setShowForm(false);
                                                            }}
                                                            title="Rename user"
                                                            sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--ink)' } }}
                                                        >
                                                            <EditIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setLicenseTarget(user.username);
                                                                setSelectedDays(30);
                                                                setLicenseStartDate(todayISO);
                                                                setShowForm(false);
                                                                setRenameTarget(null);
                                                            }}
                                                            title="Set license"
                                                            sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--accent)' } }}
                                                        >
                                                            <CardMembershipIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setDeleteTarget(user.username)}
                                                            title="Delete user"
                                                            sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--danger)' } }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography sx={{ fontSize: 13, color: 'var(--ink-3)', py: 2 }}>
                                                    No users found.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* License panel */}
                        {licenseTarget && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography sx={overlineSx}>
                                    License — {licenseTarget}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                                    <TextField
                                        size="small"
                                        label="Start Date"
                                        type="date"
                                        fullWidth
                                        value={licenseStartDate}
                                        onChange={(e) => setLicenseStartDate(e.target.value)}
                                        inputProps={{ max: todayISO }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        size="small"
                                        label="Duration"
                                        select
                                        fullWidth
                                        value={selectedDays}
                                        onChange={(e) => setSelectedDays(Number(e.target.value))}
                                    >
                                        {LICENSE_PRESET_OPTIONS.map((opt) => (
                                            <MenuItem key={opt.days} value={opt.days}>{opt.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" size="small" onClick={handleSetLicense} disabled={settingLicense}>
                                        {settingLicense ? 'Saving…' : 'Set License'}
                                    </Button>
                                    <Button size="small" sx={{ color: 'var(--ink-3)' }} onClick={() => setLicenseTarget(null)}>
                                        Cancel
                                    </Button>
                                </Box>
                            </Paper>
                        )}

                        {/* New user form */}
                        {showForm ? (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography sx={overlineSx}>New User</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                                    <TextField
                                        size="small"
                                        label="Username"
                                        fullWidth
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                    />
                                    <TextField
                                        size="small"
                                        label="Password"
                                        type="password"
                                        fullWidth
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </Box>
                                <TextField
                                    size="small"
                                    label="Role"
                                    select
                                    fullWidth
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                                    sx={{ mb: 2 }}
                                >
                                    <MenuItem value="user">User</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                </TextField>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" size="small" onClick={handleCreate} disabled={creating || !newUsername || !newPassword}>
                                        {creating ? 'Creating…' : 'Create User'}
                                    </Button>
                                    <Button size="small" sx={{ color: 'var(--ink-3)' }} onClick={() => setShowForm(false)}>
                                        Cancel
                                    </Button>
                                </Box>
                            </Paper>
                        ) : (
                            <Button
                                startIcon={<PersonAddIcon />}
                                variant="outlined"
                                onClick={() => { setShowForm(true); setLicenseTarget(null); }}
                                fullWidth
                                size="small"
                            >
                                Add User
                            </Button>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--ink-3)' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
