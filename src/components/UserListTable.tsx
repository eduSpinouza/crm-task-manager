'use client';

import * as React from 'react';
import {
    Box, Button, Paper, Typography, Alert, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TablePagination
} from '@mui/material';
import axios from 'axios';
import FollowUpDialog from './FollowUpDialog';
import Snackbar from '@mui/material/Snackbar';

interface UserData {
    taskId: number;
    orderId: number;
    userName: string;
    phone: string;
    productName: string;
    principal: number;
    repayTime: string;
    stageName: string;
    followResult: number;
    note: string;
    // Fields from task info (populated after secondary fetch)
    email?: string;
    idNoUrl?: string;
    livingNessUrl?: string;
}

export default function UserListTable() {
    const [rows, setRows] = React.useState<UserData[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingEmails, setLoadingEmails] = React.useState(false);
    const [rowCount, setRowCount] = React.useState(0);
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);
    const [selected, setSelected] = React.useState<number[]>([]);
    const [hasToken, setHasToken] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    React.useEffect(() => {
        setHasToken(!!localStorage.getItem('external_api_token'));
    }, []);

    // Fetch task info (email, idNoUrl, livingNessUrl) for a single row
    const fetchTaskInfo = async (taskId: number, orderId: number, token: string): Promise<Partial<UserData>> => {
        try {
            const response = await axios.get(`/api/users/taskinfo?taskId=${taskId}&orderId=${orderId}`, {
                headers: { Authorization: token }
            });

            if (response.data?.success && response.data?.data) {
                const data = response.data.data;
                return {
                    email: data.email || data.userEmail || '',
                    idNoUrl: data.idNoUrl || '',
                    livingNessUrl: data.livingNessUrl || ''
                };
            }
        } catch (error) {
            console.error(`Failed to fetch task info for taskId=${taskId}`, error);
        }
        return { email: '', idNoUrl: '', livingNessUrl: '' };
    };

    // Fetch emails for all rows with rate limiting
    const fetchAllEmails = async (records: UserData[], token: string): Promise<UserData[]> => {
        setLoadingEmails(true);
        const BATCH_SIZE = 5; // Concurrent requests
        const DELAY_MS = 100; // Delay between batches

        const results = [...records];

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map((row, batchIndex) =>
                fetchTaskInfo(row.taskId, row.orderId, token).then(info => {
                    const globalIndex = i + batchIndex;
                    results[globalIndex] = { ...results[globalIndex], ...info };
                })
            );

            await Promise.all(batchPromises);

            // Small delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < records.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        setLoadingEmails(false);
        return results;
    };

    const fetchUsers = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('external_api_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.post('/api/users/list', {
                current: page + 1,
                size: pageSize,
            }, {
                headers: { Authorization: token }
            });

            console.log("Response Data: ", JSON.stringify(response.data));

            if (response.data?.success && response.data?.data) {
                const records: UserData[] = Array.isArray(response.data.data.records)
                    ? response.data.data.records
                    : [];
                setRowCount(Number(response.data.data.total) || 0);

                // Fetch emails for all records before displaying
                const enrichedRecords = await fetchAllEmails(records, token);
                setRows(enrichedRecords);
            } else {
                console.error("Failed to fetch or invalid data", response.data);
                setRows([]);
                setRowCount(0);
            }
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    React.useEffect(() => {
        if (hasToken) {
            fetchUsers();
        }
    }, [fetchUsers, hasToken]);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelected(rows.map(row => row.taskId));
        } else {
            setSelected([]);
        }
    };

    const handleSelectOne = (taskId: number) => {
        const selectedIndex = selected.indexOf(taskId);
        let newSelected: number[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, taskId);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
    };

    const isSelected = (taskId: number) => selected.indexOf(taskId) !== -1;

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPageSize(parseInt(event.target.value, 10));
        setPage(0);
    };

    const isLoading = loading || loadingEmails;

    const handleFollowUpSuccess = () => {
        setSnackbar({ open: true, message: 'Follow up(s) submitted successfully', severity: 'success' });
        setIsDialogOpen(false);
        setSelected([]);
        fetchUsers();
    };

    return (
        <Paper sx={{ width: '100%', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">User List</Typography>
                <Button
                    variant="contained"
                    disabled={selected.length === 0}
                    onClick={() => setIsDialogOpen(true)}
                >
                    Add Follow Up (<span className="notranslate">{selected.length}</span>)
                </Button>
            </Box>

            {!hasToken && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Please configure the <strong>External API Token</strong> in the dashboard settings (top right) to view data.
                </Alert>
            )}

            {hasToken && (
                <>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 2 }}>
                            <CircularProgress />
                            <Typography variant="body2" color="text.secondary">
                                {loadingEmails ? 'Loading user details...' : 'Loading users...'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selected.length > 0 && selected.length < rows.length}
                                                checked={rows.length > 0 && selected.length === rows.length}
                                                onChange={handleSelectAll}
                                            />
                                        </TableCell>
                                        <TableCell>Task ID</TableCell>
                                        <TableCell>User Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Phone</TableCell>
                                        <TableCell>Product</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Repay Time</TableCell>
                                        <TableCell>Stage</TableCell>
                                        <TableCell>Result</TableCell>
                                        <TableCell>Note</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row) => {
                                        const isItemSelected = isSelected(row.taskId);
                                        return (
                                            <TableRow
                                                key={row.taskId}
                                                hover
                                                onClick={() => handleSelectOne(row.taskId)}
                                                role="checkbox"
                                                selected={isItemSelected}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox checked={isItemSelected} />
                                                </TableCell>
                                                <TableCell>{row.taskId}</TableCell>
                                                <TableCell>{row.userName}</TableCell>
                                                <TableCell>{row.email || '-'}</TableCell>
                                                <TableCell>{row.phone}</TableCell>
                                                <TableCell>{row.productName}</TableCell>
                                                <TableCell align="right">{row.principal}</TableCell>
                                                <TableCell>{row.repayTime}</TableCell>
                                                <TableCell>{row.stageName}</TableCell>
                                                <TableCell>{row.followResult}</TableCell>
                                                <TableCell>{row.note}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={11} align="center">
                                                No data available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <TablePagination
                        component="div"
                        count={rowCount}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 20, 50]}
                    />
                </>
            )}

            <FollowUpDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                selectedTaskIds={selected}
                onSuccess={handleFollowUpSuccess}
            />

            <Snackbar
                open={!!snackbar?.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(null)}
            >
                <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity || 'info'}>
                    {snackbar?.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}
