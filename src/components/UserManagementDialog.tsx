'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import PeopleIcon from '@mui/icons-material/People';
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

export default function UserManagementDialog({ open, onClose }: Props) {
    const [users, setUsers] = React.useState<ManagedUser[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    // New user form
    const [showForm, setShowForm] = React.useState(false);
    const [newUsername, setNewUsername] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [newRole, setNewRole] = React.useState<'admin' | 'user'>('user');
    const [creating, setCreating] = React.useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

    // Rename
    const [renameTarget, setRenameTarget] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState('');
    const [renaming, setRenaming] = React.useState(false);

    // License management
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
            setSuccess(`User "${newUsername}" created successfully`);
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
            setSuccess(`User "${username}" deleted`);
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
        return new Date(ts).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatLicense = (license?: LicenseConfig | null): React.ReactNode => {
        const status = getLicenseStatus(license);
        const days = getLicenseDaysLeft(license);
        if (status === 'none') return <Typography variant="body2" color="text.secondary">—</Typography>;
        if (status === 'expired') return <Chip label="Expired" size="small" color="error" />;
        const color = status === 'critical' ? 'error' : status === 'warning' ? 'warning' : 'success';
        return <Chip label={`${days} days left`} size="small" color={color} />;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon />
                User Management
            </DialogTitle>
            <DialogContent>
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
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Username</strong></TableCell>
                                        <TableCell><strong>Role</strong></TableCell>
                                        <TableCell><strong>Created</strong></TableCell>
                                        <TableCell><strong>License</strong></TableCell>
                                        <TableCell align="right"><strong>Actions</strong></TableCell>
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
                                                    user.username
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={user.role}
                                                    size="small"
                                                    color={user.role === 'admin' ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                                            <TableCell>{formatLicense(user.license)}</TableCell>
                                            <TableCell align="right">
                                                {deleteTarget === user.username ? (
                                                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            variant="contained"
                                                            onClick={() => handleDelete(user.username)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            onClick={() => setDeleteTarget(null)}
                                                        >
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
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => {
                                                                setLicenseTarget(user.username);
                                                                setSelectedDays(30);
                                                                setLicenseStartDate(todayISO);
                                                                setShowForm(false);
                                                                setRenameTarget(null);
                                                            }}
                                                            title="Set license"
                                                        >
                                                            <CardMembershipIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => setDeleteTarget(user.username)}
                                                            title="Delete user"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                                    No users found. Seed from env vars or create a new user.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {licenseTarget && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Set license for <strong>{licenseTarget}</strong>
                                </Typography>
                                <TextField
                                    size="small"
                                    label="Start Date"
                                    type="date"
                                    fullWidth
                                    value={licenseStartDate}
                                    onChange={(e) => setLicenseStartDate(e.target.value)}
                                    inputProps={{ max: todayISO }}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    size="small"
                                    label="Duration"
                                    select
                                    fullWidth
                                    value={selectedDays}
                                    onChange={(e) => setSelectedDays(Number(e.target.value))}
                                    sx={{ mb: 2 }}
                                >
                                    {LICENSE_PRESET_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.days} value={opt.days}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleSetLicense}
                                        disabled={settingLicense}
                                    >
                                        {settingLicense ? 'Setting...' : 'Set License'}
                                    </Button>
                                    <Button onClick={() => setLicenseTarget(null)}>Cancel</Button>
                                </Box>
                            </Paper>
                        )}

                        {showForm ? (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    New User
                                </Typography>
                                <TextField
                                    size="small"
                                    label="Username"
                                    fullWidth
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    size="small"
                                    label="Password"
                                    type="password"
                                    fullWidth
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
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
                                    <Button
                                        variant="contained"
                                        onClick={handleCreate}
                                        disabled={creating || !newUsername || !newPassword}
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </Button>
                                    <Button onClick={() => setShowForm(false)}>
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
                            >
                                Add User
                            </Button>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
