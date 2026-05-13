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
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
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
    const last24h = history.filter(e => e.success && Date.now() - e.timestamp < DAY_MS);
    const uniqueIPs = new Set(last24h.map(e => e.ip));
    if (uniqueIPs.size >= 2) return true;
    if (kicksLast7Days(kickHistory) >= 3) return true;
    return false;
}

function formatTs(ts: number): string {
    return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const overlineSx = {
    font: '500 10px var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-3)',
    mb: 1,
};

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
    return (
        <Box component="span" sx={{
            font: '500 10px var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
            bgcolor: bg, color, borderRadius: '3px', px: '6px', py: '2px', display: 'inline-block',
        }}>
            {label}
        </Box>
    );
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
        ? 'var(--danger-soft)'
        : suspicious
            ? 'var(--warn-soft)'
            : undefined;

    return (
        <>
            <TableRow sx={{ bgcolor: rowBg, '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 40, p: 0.5 }}>
                    <IconButton size="small" onClick={() => setOpen(o => !o)}
                        sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--ink)' } }}>
                        {open
                            ? <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                            : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                </TableCell>

                {/* Username */}
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                            {user.username}
                        </Typography>
                        {isSelf && (
                            <Box sx={{ font: '500 9px var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                                you
                            </Box>
                        )}
                    </Box>
                </TableCell>

                {/* Role */}
                <TableCell>
                    {user.role === 'admin'
                        ? <Badge label="admin" bg="var(--accent-soft)" color="var(--accent)" />
                        : <Badge label="user"  bg="var(--paper-3)"    color="var(--ink-3)" />}
                </TableCell>

                {/* Status */}
                <TableCell>
                    {user.blocked
                        ? <Badge label="Blocked" bg="var(--danger-soft)" color="var(--danger)" />
                        : user.currentSession
                            ? <Badge label="Online"  bg="var(--good-soft)"   color="var(--good-ink)" />
                            : <Badge label="Offline" bg="var(--paper-2)"     color="var(--ink-3)" />}
                </TableCell>

                {/* Current session */}
                <TableCell>
                    {user.currentSession ? (
                        <Box>
                            <Typography sx={{ font: '400 12px var(--font-mono)', color: 'var(--ink-2)' }}>
                                {user.currentSession.ip}
                            </Typography>
                            <Typography sx={{ font: '400 11px var(--font-mono)', color: 'var(--ink-3)', mt: '1px' }}>
                                {formatTs(user.currentSession.createdAt)}
                            </Typography>
                        </Box>
                    ) : <Typography sx={{ fontSize: 13, color: 'var(--ink-3)' }}>—</Typography>}
                </TableCell>

                {/* Kicks 7d */}
                <TableCell align="center">
                    <Typography sx={{
                        font: '500 12px var(--font-mono)',
                        color: kicks7d >= 3 ? 'var(--danger)' : 'var(--ink-3)',
                    }}>
                        {kicks7d}
                    </Typography>
                </TableCell>

                {/* Suspicious flag */}
                <TableCell align="center">
                    {suspicious && (
                        <Tooltip title={
                            kicks7d >= 3
                                ? '3+ session kicks in 7 days — possible credential sharing'
                                : '2+ distinct IPs with successful logins in 24h'
                        }>
                            <WarningAmberIcon sx={{ fontSize: 16, color: 'var(--warn)' }} />
                        </Tooltip>
                    )}
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                    {actionError && (
                        <Typography sx={{ fontSize: 11, color: 'var(--danger)', mr: 1 }}>{actionError}</Typography>
                    )}
                    {deleteConfirm ? (
                        <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 12, color: 'var(--ink-3)' }}>Delete?</Typography>
                            <Button size="small" variant="contained" color="error" onClick={handleDelete} disabled={actionLoading}
                                sx={{ fontSize: 11, py: '3px', px: '10px' }}>
                                Yes
                            </Button>
                            <Button size="small" onClick={() => setDeleteConfirm(false)} disabled={actionLoading}
                                sx={{ fontSize: 11, color: 'var(--ink-3)', py: '3px' }}>
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
                                                <IconButton size="small" onClick={() => handleBlock(false)} disabled={actionLoading}
                                                    sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--good)' } }}>
                                                    <LockOpenIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Block user">
                                            <span>
                                                <IconButton size="small" onClick={() => handleBlock(true)} disabled={actionLoading}
                                                    sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--warn-ink)' } }}>
                                                    <BlockIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Delete user">
                                        <span>
                                            <IconButton size="small" onClick={() => setDeleteConfirm(true)} disabled={actionLoading}
                                                sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--danger)' } }}>
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                        </Box>
                    )}
                </TableCell>
            </TableRow>

            {/* Expanded detail */}
            <TableRow>
                <TableCell colSpan={8} sx={{ py: 0, bgcolor: 'var(--paper-2)' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2.5, px: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>

                            {/* Login History */}
                            <Box sx={{ minWidth: 340, flex: 1 }}>
                                <Typography sx={overlineSx}>
                                    Login History ({user.loginHistory.length})
                                </Typography>
                                {user.loginHistory.length === 0 ? (
                                    <Typography sx={{ fontSize: 12, color: 'var(--ink-3)' }}>No login events recorded.</Typography>
                                ) : (
                                    <Box sx={{ border: '1px solid var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                                        {user.loginHistory.map((ev, i) => (
                                            <Box key={i} sx={{
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                px: 1.5, py: '6px',
                                                borderBottom: i < user.loginHistory.length - 1 ? '1px solid var(--line-2)' : 'none',
                                                bgcolor: ev.success ? undefined : 'var(--danger-soft)',
                                            }}>
                                                {ev.success
                                                    ? <CheckCircleOutlineIcon sx={{ fontSize: 13, color: 'var(--good)', flexShrink: 0 }} />
                                                    : <CancelIcon sx={{ fontSize: 13, color: 'var(--danger)', flexShrink: 0 }} />}
                                                <Typography sx={{ font: '400 11px var(--font-mono)', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                                                    {formatTs(ev.timestamp)}
                                                </Typography>
                                                <Typography sx={{ font: '500 11px var(--font-mono)', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                                                    {ev.ip}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: 11, color: 'var(--ink-3)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                                }}>
                                                    {ev.userAgent}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>

                            {/* Kick History */}
                            <Box sx={{ minWidth: 200 }}>
                                <Typography sx={overlineSx}>
                                    Session Kicks ({user.kickHistory.length})
                                </Typography>
                                {user.kickHistory.length === 0 ? (
                                    <Typography sx={{ fontSize: 12, color: 'var(--ink-3)' }}>No kicks recorded.</Typography>
                                ) : (
                                    <Box sx={{ border: '1px solid var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                                        {user.kickHistory.map((ts, i) => (
                                            <Box key={i} sx={{
                                                px: 1.5, py: '5px',
                                                borderBottom: i < user.kickHistory.length - 1 ? '1px solid var(--line-2)' : 'none',
                                            }}>
                                                <Typography sx={{ font: '400 11px var(--font-mono)', color: 'var(--ink-3)' }}>
                                                    {formatTs(ts)}
                                                </Typography>
                                            </Box>
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
            if (res.data?.success) setUsers(res.data.users);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load security data');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const suspiciousCount = users.filter(u => isSuspicious(u.loginHistory, u.kickHistory)).length;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}>
                    Security Monitor
                </Typography>
                {suspiciousCount > 0 && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        font: '500 11px var(--font-mono)', letterSpacing: '0.04em',
                        bgcolor: 'var(--warn-soft)', color: 'var(--warn-ink)',
                        border: '1px solid var(--warn)', borderRadius: '3px',
                        px: '8px', py: '3px',
                    }}>
                        <WarningAmberIcon sx={{ fontSize: 13 }} />
                        {suspiciousCount} suspicious
                    </Box>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                    startIcon={loading ? <CircularProgress size={13} /> : <RefreshIcon sx={{ fontSize: '14px !important' }} />}
                    variant="outlined"
                    size="small"
                    onClick={fetchUsers}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Typography sx={{ fontSize: 12, color: 'var(--danger)', mb: 2 }}>{error}</Typography>
            )}

            {loading && users.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={24} thickness={5} />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell>User</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Current Session</TableCell>
                                <TableCell align="center">Kicks (7d)</TableCell>
                                <TableCell align="center">Suspicious</TableCell>
                                <TableCell align="right">Actions</TableCell>
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
                                        <Typography sx={{ fontSize: 13, color: 'var(--ink-3)', py: 2 }}>
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
