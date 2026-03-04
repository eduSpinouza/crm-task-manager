'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';

interface LoginEvent {
    timestamp: number;
    ip: string;
    userAgent: string;
    success: boolean;
}

interface SessionInfo {
    sessionId: string;
    userId: string;
    ip: string;
    userAgent: string;
    createdAt: number;
}

interface SecurityUser {
    username: string;
    role: 'admin' | 'user';
    createdAt?: number;
    createdBy?: string;
    blocked: boolean;
    currentSession: SessionInfo | null;
    loginHistory: LoginEvent[];
    kickHistory: number[];
}

interface Props {
    currentUser: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function kicksLast7Days(kickHistory: number[]): number {
    return kickHistory.filter(t => Date.now() - t < WEEK_MS).length;
}

function isSuspicious(history: LoginEvent[], kickHistory: number[]): boolean {
    // Rule 1: 2+ distinct IPs with successful logins in last 24h
    const last24h = history.filter(e => e.success && Date.now() - e.timestamp < DAY_MS);
    const uniqueIPs = new Set(last24h.map(e => e.ip));
    if (uniqueIPs.size >= 2) return true;

    // Rule 2: 3+ session kicks in last 7 days
    if (kicksLast7Days(kickHistory) >= 3) return true;

    return false;
}

function formatTs(ts: number): string {
    return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function UserRow({ user, currentUser, onRefresh }: {
    user: SecurityUser;
    currentUser: string;
    onRefresh: () => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(false);
    const [actionError, setActionError] = React.useState('');

    const isSelf = user.username === currentUser;
    const suspicious = isSuspicious(user.loginHistory, user.kickHistory);
    const kicks7d = kicksLast7Days(user.kickHistory);

    const handleBlock = async (blocked: boolean) => {
        setActionLoading(true);
        setActionError('');
        try {
            await axios.patch('/api/admin/users', { username: user.username, blocked });
            onRefresh();
        } catch (err: any) {
            setActionError(err.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        setActionError('');
        try {
            await axios.delete('/api/admin/users', { data: { username: user.username } });
            onRefresh();
        } catch (err: any) {
            setActionError(err.response?.data?.error || 'Delete failed');
            setDeleteConfirm(false);
        } finally {
            setActionLoading(false);
        }
    };

    const rowBg = user.blocked
        ? 'rgba(211,47,47,0.05)'
        : suspicious
            ? 'rgba(255,160,0,0.08)'
            : undefined;

    return (
        <>
            <TableRow sx={{ backgroundColor: rowBg, '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 40, p: 0.5 }}>
                    <IconButton size="small" onClick={() => setOpen(o => !o)}>
                        {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <strong>{user.username}</strong>
                        {isSelf && <Chip label="you" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                    </Box>
                </TableCell>
                <TableCell>
                    <Chip
                        label={user.role}
                        size="small"
                        color={user.role === 'admin' ? 'primary' : 'default'}
                    />
                </TableCell>
                <TableCell>
                    {user.blocked ? (
                        <Chip label="Blocked" size="small" color="error" icon={<BlockIcon />} />
                    ) : user.currentSession ? (
                        <Chip label="Online" size="small" color="success" />
                    ) : (
                        <Chip label="Offline" size="small" variant="outlined" />
                    )}
                </TableCell>
                <TableCell>
                    {user.currentSession ? (
                        <Box>
                            <Typography variant="caption" display="block">{user.currentSession.ip}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatTs(user.currentSession.createdAt)}
                            </Typography>
                        </Box>
                    ) : '—'}
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" color={kicks7d >= 3 ? 'error' : 'text.primary'}>
                        {kicks7d}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    {suspicious && (
                        <Tooltip title={
                            kicksLast7Days(user.kickHistory) >= 3
                                ? '3+ session kicks in 7 days — possible credential sharing'
                                : '2+ distinct IPs with successful logins in 24h'
                        }>
                            <WarningAmberIcon color="warning" fontSize="small" />
                        </Tooltip>
                    )}
                </TableCell>
                <TableCell align="right">
                    {actionError && (
                        <Typography variant="caption" color="error" sx={{ mr: 1 }}>{actionError}</Typography>
                    )}
                    {deleteConfirm ? (
                        <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ mr: 0.5 }}>Delete?</Typography>
                            <Button size="small" color="error" variant="contained" onClick={handleDelete} disabled={actionLoading}>
                                Yes
                            </Button>
                            <Button size="small" onClick={() => setDeleteConfirm(false)} disabled={actionLoading}>
                                No
                            </Button>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                            {!isSelf && (
                                <>
                                    {user.blocked ? (
                                        <Tooltip title="Unblock user">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleBlock(false)}
                                                    disabled={actionLoading}
                                                >
                                                    <LockOpenIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Block user">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleBlock(true)}
                                                    disabled={actionLoading}
                                                >
                                                    <BlockIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Delete user">
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => setDeleteConfirm(true)}
                                                disabled={actionLoading}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                        </Box>
                    )}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={8} sx={{ py: 0, backgroundColor: 'action.hover' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, px: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {/* Login History */}
                            <Box sx={{ minWidth: 340, flex: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Login History (last {user.loginHistory.length})
                                </Typography>
                                {user.loginHistory.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">No login events recorded.</Typography>
                                ) : (
                                    <Table size="small" padding="none">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ py: 0.5 }}></TableCell>
                                                <TableCell sx={{ py: 0.5 }}>Time</TableCell>
                                                <TableCell sx={{ py: 0.5 }}>IP</TableCell>
                                                <TableCell sx={{ py: 0.5 }}>User Agent</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {user.loginHistory.map((ev, i) => (
                                                <TableRow key={i}>
                                                    <TableCell sx={{ pr: 1, py: 0.25 }}>
                                                        {ev.success
                                                            ? <CheckCircleOutlineIcon color="success" sx={{ fontSize: 14 }} />
                                                            : <CancelIcon color="error" sx={{ fontSize: 14 }} />
                                                        }
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.25, whiteSpace: 'nowrap' }}>
                                                        <Typography variant="caption">{formatTs(ev.timestamp)}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.25, pr: 2 }}>
                                                        <Typography variant="caption">{ev.ip}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.25 }}>
                                                        <Typography variant="caption" sx={{
                                                            maxWidth: 220, display: 'block',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {ev.userAgent}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>

                            {/* Kick History */}
                            <Box sx={{ minWidth: 220 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Session Kicks (last {user.kickHistory.length})
                                </Typography>
                                {user.kickHistory.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">No kicks recorded.</Typography>
                                ) : (
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                        {user.kickHistory.map((ts, i) => (
                                            <li key={i}>
                                                <Typography variant="caption">{formatTs(ts)}</Typography>
                                            </li>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function SecurityPanel({ currentUser }: Props) {
    const [users, setUsers] = React.useState<SecurityUser[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const fetchUsers = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/admin/users');
            if (res.data?.success) {
                setUsers(res.data.users);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load security data');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const suspiciousCount = users.filter(u => isSuspicious(u.loginHistory, u.kickHistory)).length;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6">Security Monitor</Typography>
                {suspiciousCount > 0 && (
                    <Chip
                        icon={<WarningAmberIcon />}
                        label={`${suspiciousCount} suspicious`}
                        color="warning"
                        size="small"
                    />
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                    startIcon={<RefreshIcon />}
                    variant="outlined"
                    size="small"
                    onClick={fetchUsers}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell><strong>User</strong></TableCell>
                                <TableCell><strong>Role</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Current Session</strong></TableCell>
                                <TableCell align="center"><strong>Kicks (7d)</strong></TableCell>
                                <TableCell align="center"><strong>Suspicious</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map(user => (
                                <UserRow
                                    key={user.username}
                                    user={user}
                                    currentUser={currentUser}
                                    onRefresh={fetchUsers}
                                />
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography color="text.secondary" sx={{ py: 2 }}>
                                            No users found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
