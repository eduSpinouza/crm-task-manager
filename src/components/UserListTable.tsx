'use client';

import * as React from 'react';
import {
    Box, Button, Paper, Typography, Alert, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TablePagination, FormControl, InputLabel, Select, MenuItem,
    Chip, Tooltip,
} from '@mui/material';
import axios from 'axios';
import FollowUpDialog from './FollowUpDialog';
import EmailDialog from './EmailDialog';
import DebtorDetailDialog from './DebtorDetailDialog';
import Snackbar from '@mui/material/Snackbar';
import VisibilityIcon from '@mui/icons-material/Visibility';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { groupByUserId } from '@/lib/duplicateUtils';

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
    // Fields from task info (populated after secondary fetch)
    email?: string;
    idNoUrl?: string;
    livingNessUrl?: string;
    phonePrefix?: string;
    contact1Phone?: string;
    contact2Phone?: string;
    contact3Phone?: string;
    totalExtensionAmount?: number;
    userId?: number;
}

const COL_COUNT = 16;

interface DataRowProps {
    row: UserData;
    isSelected: boolean;
    onSelect: (taskId: number) => void;
    onViewDetail: (user: UserData) => void;
    duplicates?: UserData[];   // sibling rows with same phone (excluding self)
    isDuplicateGroup?: boolean; // true for the "header" row of a group
}

const DataRow = React.memo(function DataRow({ row, isSelected, onSelect, onViewDetail, duplicates = [], isDuplicateGroup = false }: DataRowProps) {
    const [open, setOpen] = React.useState(false);

    const rowCells = (r: UserData) => (
        <>
            <TableCell>{r.userName}</TableCell>
            <TableCell>{r.email || '-'}</TableCell>
            <TableCell>{r.phone}</TableCell>
            <TableCell>{r.appName || '-'}</TableCell>
            <TableCell>{r.productName}</TableCell>
            <TableCell align="right">{r.totalAmount}</TableCell>
            <TableCell align="right">{r.repayAmount}</TableCell>
            <TableCell align="right">{r.overdueFee}</TableCell>
            <TableCell align="right">{r.totalExtensionAmount ?? '-'}</TableCell>
            <TableCell align="right">{r.overdueDay}</TableCell>
            <TableCell>{r.repayTime}</TableCell>
            <TableCell>{r.stageName}</TableCell>
            <TableCell>{r.followResult}</TableCell>
            <TableCell>{r.note}</TableCell>
        </>
    );

    return (
        <>
            <TableRow
                hover
                onClick={() => onSelect(row.taskId)}
                role="checkbox"
                selected={isSelected}
                sx={{
                    cursor: 'pointer',
                    '& > *': isDuplicateGroup ? { borderBottom: 'unset' } : {},
                    bgcolor: isDuplicateGroup ? 'rgba(255,160,0,0.07)' : undefined,
                }}
            >
                <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} />
                </TableCell>
                <TableCell padding="checkbox" sx={{ whiteSpace: 'nowrap' }}>
                    {isDuplicateGroup ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={`${duplicates.length + 1} repayment plans share this user ID — click to expand`}>
                                <Chip
                                    icon={<WarningAmberIcon />}
                                    label={`${duplicates.length + 1} dup`}
                                    size="small"
                                    color="warning"
                                    onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                                    onDelete={e => { e.stopPropagation(); setOpen(o => !o); }}
                                    deleteIcon={open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                />
                            </Tooltip>
                        </Box>
                    ) : null}
                </TableCell>
                <TableCell padding="checkbox">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); onViewDetail(row); }}>
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                </TableCell>
                {rowCells(row)}
            </TableRow>

            {/* Collapsed sibling rows */}
            {isDuplicateGroup && duplicates.map(dup => (
                <TableRow key={dup.taskId} sx={{ display: open ? undefined : 'none', bgcolor: 'rgba(255,160,0,0.04)' }}>
                    <TableCell padding="checkbox" />
                    <TableCell padding="checkbox" />
                    <TableCell padding="checkbox" />
                    {rowCells(dup)}
                </TableRow>
            ))}
        </>
    );
});

export default function UserListTable() {
    const [rows, setRows] = React.useState<UserData[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingEmails, setLoadingEmails] = React.useState(false);
    const [rowCount, setRowCount] = React.useState(0);
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(50);
    const [selected, setSelected] = React.useState<number[]>([]);
    const [hasToken, setHasToken] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
    const [detailUser, setDetailUser] = React.useState<UserData | null>(null);
    const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);
    // Filters
    const [filterAppName, setFilterAppName] = React.useState<string>('');
    const [filterOverdueDay, setFilterOverdueDay] = React.useState<string>('');
    // Mirrored top scrollbar
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [tableScrollWidth, setTableScrollWidth] = React.useState(0);

    const tableContainerCallbackRef = React.useCallback((node: HTMLDivElement | null) => {
        tableContainerRef.current = node;
        if (node) {
            setTableScrollWidth(node.scrollWidth);
            const observer = new ResizeObserver(() => setTableScrollWidth(node.scrollWidth));
            observer.observe(node);
        }
    }, []);

    const handleTopScroll = () => {
        if (tableContainerRef.current && topScrollRef.current) {
            tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
    };
    const handleTableScroll = () => {
        if (tableContainerRef.current && topScrollRef.current) {
            topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
        }
    };

    React.useEffect(() => {
        setHasToken(!!localStorage.getItem('external_api_token') && !!localStorage.getItem('api_base_url'));
    }, []);

    // Fetch task info (email, idNoUrl, livingNessUrl) for a single row
    const fetchTaskInfo = async (taskId: number, orderId: number, token: string): Promise<Partial<UserData>> => {
        try {
            const baseUrl = localStorage.getItem('api_base_url') || '';
            const response = await axios.get(`/api/users/taskinfo?taskId=${taskId}&orderId=${orderId}`, {
                headers: { Authorization: token, 'X-API-Base-URL': baseUrl }
            });

            if (response.data?.success && response.data?.data) {
                const data = response.data.data;
                return {
                    email: data.email || data.userEmail || '',
                    idNoUrl: data.idNoUrl || '',
                    livingNessUrl: data.livingNessUrl || '',
                    phonePrefix: data.phonePrefix || data.phone || '',
                    contact1Phone: data.contacts?.[0]?.phoneNumber || '',
                    contact2Phone: data.contacts?.[1]?.phoneNumber || '',
                    contact3Phone: data.contacts?.[2]?.phoneNumber || '',
                    totalExtensionAmount: data.totalExtensionAmount ?? undefined,
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
            const baseUrl = localStorage.getItem('api_base_url') || '';

            const response = await axios.post('/api/users/list', {
                current: page + 1,
                size: pageSize,
            }, {
                headers: { Authorization: token, 'X-API-Base-URL': baseUrl }
            });


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

    const handleSelectOne = React.useCallback((taskId: number) => {
        setSelected(prev => {
            const idx = prev.indexOf(taskId);
            if (idx === -1) return [...prev, taskId];
            return prev.filter(id => id !== taskId);
        });
    }, []);

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

    // Apply filters
    const filteredRows = React.useMemo(() => {
        return rows.filter(row => {
            if (filterAppName && row.appName !== filterAppName) return false;
            if (filterOverdueDay && String(row.overdueDay) !== filterOverdueDay) return false;
            return true;
        });
    }, [rows, filterAppName, filterOverdueDay]);

    // Group by userId: duplicates float to the top
    const { duplicateGroups, singleRows } = React.useMemo(
        () => groupByUserId(filteredRows),
        [filteredRows]
    );

    React.useEffect(() => {
        if (tableContainerRef.current) {
            setTableScrollWidth(tableContainerRef.current.scrollWidth);
        }
    }, [filteredRows]);

    return (
        <Paper sx={{ width: '100%', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">User List</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        disabled={selected.length === 0}
                        onClick={() => setIsEmailDialogOpen(true)}
                    >
                        Send Email (<span className="notranslate">{selected.length}</span>)
                    </Button>
                    <Button
                        variant="contained"
                        disabled={selected.length === 0}
                        onClick={() => setIsDialogOpen(true)}
                    >
                        Add Follow Up (<span className="notranslate">{selected.length}</span>)
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>App Name</InputLabel>
                    <Select
                        value={filterAppName}
                        label="App Name"
                        onChange={(e) => setFilterAppName(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {[...new Set(rows.map(r => r.appName).filter(Boolean))].map(app => (
                            <MenuItem key={app} value={app}>{app}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Overdue Days</InputLabel>
                    <Select
                        value={filterOverdueDay}
                        label="Overdue Days"
                        onChange={(e) => setFilterOverdueDay(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {[...new Set(rows.map(r => r.overdueDay).filter(d => d !== undefined))].sort((a, b) => a - b).map(day => (
                            <MenuItem key={day} value={String(day)}>{day} days</MenuItem>
                        ))}
                    </Select>
                </FormControl>
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
                        <>
                        <TablePagination
                            component="div"
                            count={rowCount}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[50, 100, 250]}
                        />
                        <Box
                            ref={topScrollRef}
                            onScroll={handleTopScroll}
                            sx={{ overflowX: 'auto', overflowY: 'hidden', height: 20 }}
                        >
                            <Box sx={{ width: tableScrollWidth, height: 1 }} />
                        </Box>
                        <TableContainer ref={tableContainerCallbackRef} onScroll={handleTableScroll}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selected.length > 0 && selected.length < filteredRows.length}
                                                checked={filteredRows.length > 0 && selected.length === filteredRows.length}
                                                onChange={handleSelectAll}
                                            />
                                        </TableCell>
                                        <TableCell padding="checkbox" />
                                        <TableCell padding="checkbox" />
                                        <TableCell>User Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Phone</TableCell>
                                        <TableCell>App Name</TableCell>
                                        <TableCell>Product</TableCell>
                                        <TableCell align="right">Contract Amount</TableCell>
                                        <TableCell align="right">Total Amount</TableCell>
                                        <TableCell align="right">Overdue Fee</TableCell>
                                        <TableCell align="right">Extension Amount</TableCell>
                                        <TableCell align="right">Overdue Days</TableCell>
                                        <TableCell>Repay Time</TableCell>
                                        <TableCell>Stage</TableCell>
                                        <TableCell>Result</TableCell>
                                        <TableCell>Note</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* Duplicate groups first */}
                                    {duplicateGroups.map(group => (
                                        <DataRow
                                            key={group[0].taskId}
                                            row={group[0]}
                                            isSelected={isSelected(group[0].taskId)}
                                            onSelect={handleSelectOne}
                                            onViewDetail={setDetailUser}
                                            duplicates={group.slice(1)}
                                            isDuplicateGroup
                                        />
                                    ))}
                                    {/* Single rows */}
                                    {singleRows.map(row => (
                                        <DataRow
                                            key={row.taskId}
                                            row={row}
                                            isSelected={isSelected(row.taskId)}
                                            onSelect={handleSelectOne}
                                            onViewDetail={setDetailUser}
                                        />
                                    ))}
                                    {filteredRows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={COL_COUNT} align="center">
                                                No data available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={rowCount}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[50, 100, 250]}
                        />
                        </>
                    )}
                </>
            )}

            <FollowUpDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                selectedTasks={rows.filter(r => selected.includes(r.taskId)).map(r => ({
                    taskId: r.taskId,
                    orderId: r.orderId,
                    phone: r.phone,
                    phonePrefix: r.phonePrefix,
                    contact1Phone: r.contact1Phone,
                    contact2Phone: r.contact2Phone,
                    contact3Phone: r.contact3Phone
                }))}
                onSuccess={handleFollowUpSuccess}
            />

            {detailUser && (
                <DebtorDetailDialog
                    open={!!detailUser}
                    onClose={() => setDetailUser(null)}
                    user={detailUser}
                />
            )}

            <EmailDialog
                open={isEmailDialogOpen}
                onClose={() => setIsEmailDialogOpen(false)}
                selectedUsers={rows.filter(r => selected.includes(r.taskId))}
                onSuccess={() => {
                    setSnackbar({ open: true, message: 'Emails sent successfully', severity: 'success' });
                    setIsEmailDialogOpen(false);
                }}
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
