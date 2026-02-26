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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PeopleIcon from '@mui/icons-material/People';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';

interface ManagedUser {
    username: string;
    role: 'admin' | 'user';
    createdAt?: number;
    createdBy?: string;
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

    const formatDate = (ts?: number) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                                        <TableCell align="right"><strong>Actions</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.username}>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={user.role}
                                                    size="small"
                                                    color={user.role === 'admin' ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>{formatDate(user.createdAt)}</TableCell>
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
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => setDeleteTarget(user.username)}
                                                        title="Delete user"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                                    No users found. Seed from env vars or create a new user.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

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
                                onClick={() => setShowForm(true)}
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
