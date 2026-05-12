'use client';

import * as React from 'react';
import {
    Box, Button, Paper, Typography, Alert, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TablePagination, Select, MenuItem, IconButton,
    Menu,
} from '@mui/material';
import axios from 'axios';
import FollowUpDialog from './FollowUpDialog';
import EmailDialog from './EmailDialog';
import DebtorDetailDialog from './DebtorDetailDialog';
import Snackbar from '@mui/material/Snackbar';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { groupByUserId } from '@/lib/duplicateUtils';
import { buildWorkbook, downloadXlsx, defaultFilename } from '@/lib/export/excelExport';
import type { ExportUserData } from '@/lib/export/columns';
import OverdueChip from './OverdueChip';
import FollowResultChip from './FollowResultChip';

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

const fmt = (n: number | null | undefined) =>
    n != null ? n.toLocaleString('en-US') : '—';

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
            <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box component="span" sx={{ fontWeight: 500, color: 'var(--ink)' }}>{r.userName}</Box>
                    {isDuplicateGroup && r === row && (
                        <Box
                            component="span"
                            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                            sx={{
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                font: '500 10px var(--font-mono)',
                                letterSpacing: '0.06em',
                                color: 'var(--warn-ink)',
                                bgcolor: 'var(--warn-soft)',
                                px: '5px', py: '1px',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                flexShrink: 0,
                            }}
                        >
                            {duplicates.length + 1} loans
                            {open ? <KeyboardArrowUpIcon sx={{ fontSize: 11 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 11 }} />}
                        </Box>
                    )}
                </Box>
            </TableCell>
            <TableCell>
                <Box sx={{ lineHeight: 1.5 }}>
                    <Box sx={{ fontSize: 13 }}>{r.email || 'no email'}</Box>
                    <Box sx={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{r.phone}</Box>
                </Box>
            </TableCell>
            <TableCell>{r.appName || '-'}</TableCell>
            <TableCell>{r.productName}</TableCell>
            <TableCell align="right" className="tnum">{fmt(r.totalAmount)}</TableCell>
            <TableCell align="right" className="tnum" sx={{ color: r.overdueDay > 0 ? 'var(--danger)' : undefined, fontWeight: r.overdueDay > 0 ? 600 : undefined }}>
                {fmt(r.repayAmount)}
            </TableCell>
            <TableCell align="right" className="tnum">{fmt(r.overdueFee)}</TableCell>
            <TableCell align="right" className="tnum">{r.totalExtensionAmount != null ? fmt(r.totalExtensionAmount) : '—'}</TableCell>
            <TableCell><OverdueChip days={r.overdueDay} /></TableCell>
            <TableCell>{r.repayTime}</TableCell>
            <TableCell>{r.stageName}</TableCell>
            <TableCell><FollowResultChip value={r.followResult} /></TableCell>
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
                }}
            >
                <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} />
                </TableCell>
                <TableCell
                    sx={{
                        width: 80,
                        pr: '12px',
                        '.view-label': {
                            maxWidth: 0,
                            overflow: 'hidden',
                            opacity: 0,
                            transition: 'max-width 150ms ease, opacity 150ms ease',
                            whiteSpace: 'nowrap',
                        },
                        'tr:hover & .view-label': { maxWidth: 40, opacity: 1 },
                    }}
                >
                    <Button
                        size="small"
                        startIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={e => { e.stopPropagation(); onViewDetail(row); }}
                        sx={{
                            minWidth: 0,
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--ink-3)',
                            px: '8px',
                            py: '4px',
                            borderRadius: '4px',
                            '&:hover': { color: 'var(--accent)', bgcolor: 'var(--accent-soft)' },
                        }}
                    >
                        <span className="view-label">View</span>
                    </Button>
                </TableCell>
                {rowCells(row)}
            </TableRow>

            {/* Collapsed sibling rows */}
            {isDuplicateGroup && duplicates.map(dup => (
                <TableRow key={dup.taskId} sx={{ display: open ? undefined : 'none' }}>
                    <TableCell padding="checkbox" />
                    <TableCell
                        sx={{
                            width: 80,
                            pr: '12px',
                            '.view-label': {
                                maxWidth: 0,
                                overflow: 'hidden',
                                opacity: 0,
                                transition: 'max-width 150ms ease, opacity 150ms ease',
                                whiteSpace: 'nowrap',
                            },
                            'tr:hover & .view-label': { maxWidth: 40, opacity: 1 },
                        }}
                    >
                        <Button
                            size="small"
                            startIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                            onClick={e => { e.stopPropagation(); onViewDetail(dup); }}
                            sx={{
                                minWidth: 0,
                                fontSize: 11,
                                fontWeight: 500,
                                color: 'var(--ink-3)',
                                px: '8px',
                                py: '4px',
                                borderRadius: '4px',
                                '&:hover': { color: 'var(--accent)', bgcolor: 'var(--accent-soft)' },
                            }}
                        >
                            <span className="view-label">View</span>
                        </Button>
                    </TableCell>
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
    const [loadProgress, setLoadProgress] = React.useState<{ phase: string; loaded: number; total: number }>({ phase: '', loaded: 0, total: 0 });
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(50);
    const [selected, setSelected] = React.useState<number[]>([]);
    const [hasToken, setHasToken] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
    const [detailUser, setDetailUser] = React.useState<UserData | null>(null);
    const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error', action?: React.ReactNode } | null>(null);
    // Filters
    const [filterAppName, setFilterAppName] = React.useState<string>('');
    const [filterOverdueDay, setFilterOverdueDay] = React.useState<string>('');
    // Export state
    const [exportMenuAnchor, setExportMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [exporting, setExporting] = React.useState(false);
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

    // Fetch emails for all rows with rate limiting.
    // onProgress is optional — used by the export flow to drive a progress counter.
    const fetchAllEmails = async (
        records: UserData[],
        token: string,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<UserData[]> => {
        setLoadingEmails(true);
        const BATCH_SIZE = 15; // Concurrent requests
        const DELAY_MS = 0;   // No delay — dial back to 50–100ms if external API returns 429s

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

            if (onProgress) {
                onProgress(Math.min(i + BATCH_SIZE, records.length), records.length);
            }

            // Small delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < records.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        setLoadingEmails(false);
        return results;
    };

    // Fetch ALL pages from /api/users/list (for export). Does not affect the
    // displayed table state. Uses size=200 to reduce round-trips.
    const fetchAllPages = async (
        token: string,
        baseUrl: string,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<UserData[]> => {
        const PAGE_SIZE = 200;
        let current = 1;
        let totalCount = 0;
        const allRecords: UserData[] = [];

        do {
            const response = await axios.post('/api/users/list', {
                current,
                size: PAGE_SIZE,
            }, {
                headers: { Authorization: token, 'X-API-Base-URL': baseUrl },
            });

            if (!response.data?.success || !response.data?.data) break;

            const records: UserData[] = Array.isArray(response.data.data.records)
                ? response.data.data.records
                : [];
            totalCount = Number(response.data.data.total) || 0;

            allRecords.push(...records);
            if (onProgress) onProgress(allRecords.length, totalCount);

            if (records.length < PAGE_SIZE) break;
            current++;
        } while (allRecords.length < totalCount);

        return allRecords;
    };

    // Load all records once on mount (and on manual refresh).
    // All pagination and filtering run client-side against this in-memory set.
    const loadAllData = React.useCallback(async () => {
        const token = localStorage.getItem('external_api_token');
        if (!token) return;
        const baseUrl = localStorage.getItem('api_base_url') || '';

        setLoading(true);
        setPage(0);
        setLoadProgress({ phase: 'Fetching', loaded: 0, total: 0 });

        let allRecords: UserData[] = [];
        try {
            allRecords = await fetchAllPages(token, baseUrl, (loaded, total) => {
                setLoadProgress({ phase: 'Fetching', loaded, total });
            });
        } catch (err) {
            console.error('Error fetching users', err);
            setLoading(false);
            return;
        }

        setLoading(false);
        setLoadProgress({ phase: 'Enriching', loaded: 0, total: allRecords.length });

        try {
            const enriched = await fetchAllEmails(allRecords, token, (loaded, total) => {
                setLoadProgress({ phase: 'Enriching', loaded, total });
            });
            setRows(enriched);
        } catch (err) {
            console.error('Error enriching users', err);
            setRows(allRecords); // show un-enriched rows rather than nothing
        }
    }, []);

    React.useEffect(() => {
        if (hasToken) {
            loadAllData();
        }
    }, [loadAllData, hasToken]);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelected(filteredRows.map(row => row.taskId));
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

    const selectedSet = React.useMemo(() => new Set(selected), [selected]);
    const isSelected = (taskId: number) => selectedSet.has(taskId);

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
        loadAllData();
    };

    const handleExportClick = (sink: 'excel' | 'sheets') => (e: React.MouseEvent) => {
        e.stopPropagation();
        setExportMenuAnchor(null);
        runExport(sink);
    };

    // Export uses the already-loaded, already-enriched filteredRows — no re-fetching needed.
    const runExport = async (sink: 'excel' | 'sheets') => {
        if (sink === 'excel') {
            const wb = buildWorkbook(filteredRows as ExportUserData[]);
            downloadXlsx(wb, defaultFilename());
            setSnackbar({ open: true, message: `Exported ${filteredRows.length} rows to Excel`, severity: 'success' });
            return;
        }

        // Google Sheets: POST already-enriched rows to the server-side route
        setExporting(true);
        try {
            const res = await axios.post('/api/users/export-sheets', { rows: filteredRows });
            const { url } = res.data;
            setSnackbar({
                open: true,
                message: 'Exported to Google Sheets',
                severity: 'success',
                action: (
                    <Button size="small" color="inherit" href={url} target="_blank" rel="noopener noreferrer">
                        Open
                    </Button>
                ),
            });
        } catch (err: any) {
            if (err.response?.data?.error === 'sheets_not_connected') {
                const popup = window.open('/api/auth/sheets/start', 'sheets-oauth', 'width=520,height=620');
                const onMessage = (event: MessageEvent) => {
                    if (event.origin !== window.location.origin) return;
                    if (event.data?.type !== 'sheets-oauth') return;
                    window.removeEventListener('message', onMessage);
                    popup?.close();
                    if (event.data.status === 'success') {
                        runExport('sheets');
                    } else {
                        setSnackbar({ open: true, message: `Google Sheets connection failed: ${event.data.detail}`, severity: 'error' });
                    }
                };
                window.addEventListener('message', onMessage);
                setSnackbar({ open: true, message: 'Connect your Google account to export to Sheets', severity: 'error' });
            } else {
                setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to export to Google Sheets', severity: 'error' });
            }
        } finally {
            setExporting(false);
        }
    };

    // Apply filters
    const filteredRows = React.useMemo(() => {
        return rows.filter(row => {
            if (filterAppName && row.appName !== filterAppName) return false;
            if (filterOverdueDay && String(row.overdueDay) !== filterOverdueDay) return false;
            return true;
        });
    }, [rows, filterAppName, filterOverdueDay]);

    // Current page slice — pagination runs client-side against filteredRows
    const displayRows = React.useMemo(
        () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
        [filteredRows, page, pageSize]
    );

    // Group by userId: duplicates float to the top of each page
    const { duplicateGroups, singleRows } = React.useMemo(
        () => groupByUserId(displayRows),
        [displayRows]
    );

    React.useEffect(() => {
        if (tableContainerRef.current) {
            setTableScrollWidth(tableContainerRef.current.scrollWidth);
        }
    }, [filteredRows]);

    const selectedRows = React.useMemo(
        () => rows.filter(r => selectedSet.has(r.taskId)),
        [rows, selectedSet]
    );
    const selectionTotalDue = React.useMemo(
        () => selectedRows.reduce((sum, r) => sum + (r.repayAmount || 0), 0),
        [selectedRows]
    );
    const selectionMissingEmail = React.useMemo(
        () => selectedRows.filter(r => !r.email).length,
        [selectedRows]
    );

    const handleExportSelected = () => {
        const wb = buildWorkbook(selectedRows as ExportUserData[]);
        downloadXlsx(wb, defaultFilename());
        setSnackbar({ open: true, message: `Exported ${selectedRows.length} rows to Excel`, severity: 'success' });
    };

    return (
        <Paper sx={{ width: '100%', p: 0 }}>
            {/* ── Section header ── */}
            <Box sx={{ bgcolor: 'var(--paper-2)', px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid var(--line)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '12px', borderLeft: '3px solid var(--accent)', pl: 1.5 }}>
                        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                            Debtors
                        </Typography>
                        {rows.length > 0 && (
                            <Typography sx={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                                {filteredRows.length !== rows.length
                                    ? `${filteredRows.length} / ${rows.length}`
                                    : rows.length} total
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
                            disabled={loading || loadingEmails || exporting || rows.length === 0}
                            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                        >
                            {exporting ? 'Exporting…' : 'Export'}
                        </Button>
                        <Menu
                            anchorEl={exportMenuAnchor}
                            open={Boolean(exportMenuAnchor)}
                            onClose={() => setExportMenuAnchor(null)}
                        >
                            <MenuItem onClick={handleExportClick('excel')}>
                                Download Excel (.xlsx)
                            </MenuItem>
                            <MenuItem onClick={handleExportClick('sheets')}>
                                Export to Google Sheets
                            </MenuItem>
                        </Menu>
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

                {/* Filters + page nav */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Box>
                    <Typography sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', mb: 0.5 }}>
                        App Name
                    </Typography>
                    <Select
                        size="small"
                        value={filterAppName}
                        onChange={(e) => setFilterAppName(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {[...new Set(rows.map(r => r.appName).filter(Boolean))].map(app => (
                            <MenuItem key={app} value={app}>{app}</MenuItem>
                        ))}
                    </Select>
                </Box>
                <Box>
                    <Typography sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', mb: 0.5 }}>
                        Overdue Days
                    </Typography>
                    <Select
                        size="small"
                        value={filterOverdueDay}
                        onChange={(e) => setFilterOverdueDay(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {[...new Set(rows.map(r => r.overdueDay).filter(d => d !== undefined))].sort((a, b) => a - b).map(day => (
                            <MenuItem key={day} value={String(day)}>{day} days</MenuItem>
                        ))}
                    </Select>
                </Box>
                </Box> {/* end filters */}

                {/* Compact page nav + rows per page */}
                {filteredRows.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Rows per page */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ font: '500 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                                Rows
                            </Typography>
                            <Select
                                size="small"
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                                sx={{ font: '500 11px var(--font-mono)', minWidth: 64, '& .MuiSelect-select': { py: '4px' } }}
                            >
                                {[50, 100, 250, 500].map(n => (
                                    <MenuItem key={n} value={n} sx={{ font: '500 11px var(--font-mono)' }}>{n}</MenuItem>
                                ))}
                            </Select>
                        </Box>

                        <Box sx={{ width: '1px', height: 20, bgcolor: 'var(--line)' }} />

                        {/* Prev / next */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--ink)' }, '&.Mui-disabled': { color: 'var(--line)' } }}
                            >
                                <ChevronLeftIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <Typography sx={{ font: '500 11px var(--font-mono)', color: 'var(--ink-3)', whiteSpace: 'nowrap', minWidth: 80, textAlign: 'center' }}>
                                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * pageSize >= filteredRows.length}
                                sx={{ color: 'var(--ink-3)', '&:hover': { color: 'var(--ink)' }, '&.Mui-disabled': { color: 'var(--line)' } }}
                            >
                                <ChevronRightIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    </Box>
                )}
                </Box> {/* end filters+nav row */}
            </Box> {/* end section header */}

            {/* ── Content area ── */}
            <Box sx={{ px: 2, pt: 1.5 }}>
            {!hasToken && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Please configure the <strong>External API Token</strong> in the dashboard settings (top right) to view data.
                </Alert>
            )}

            {hasToken && (
                <>
                    {isLoading ? (
                        <Box sx={{ px: 0 }}>
                            {/* Progress bar */}
                            <Box sx={{ height: 2, bgcolor: 'var(--line-2)', overflow: 'hidden' }}>
                                <Box sx={{
                                    height: '100%',
                                    bgcolor: 'var(--accent)',
                                    width: loadProgress.total > 0
                                        ? `${Math.round((loadProgress.loaded / loadProgress.total) * 100)}%`
                                        : '35%',
                                    transition: 'width 400ms ease',
                                }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, p: '20px 24px' }}>
                                <CircularProgress size={16} thickness={5} />
                                <Typography sx={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                                    {loadProgress.total > 0
                                        ? `${loadProgress.phase} · ${loadProgress.loaded} / ${loadProgress.total} rows`
                                        : `${loadProgress.phase || 'Loading'}…`}
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                        <Box
                            ref={topScrollRef}
                            onScroll={handleTopScroll}
                            sx={{ overflowX: 'auto', overflowY: 'hidden', height: 20 }}
                        >
                            <Box sx={{ width: tableScrollWidth, height: 1 }} />
                        </Box>
                        <Box sx={{ border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                        <TableContainer ref={tableContainerCallbackRef} onScroll={handleTableScroll}>
                            <Table size="small">
                                <TableHead>
                                    {/* ── Group row ── */}
                                    <TableRow sx={{ bgcolor: 'var(--paper-2)' }}>
                                        <TableCell padding="checkbox" sx={{ borderBottom: 0, py: '7px' }} />
                                        <TableCell sx={{ borderBottom: 0, py: '7px', width: 80 }} />
                                        <TableCell colSpan={2} align="center" sx={{ borderBottom: 0, borderLeft: '1px solid var(--line)', py: '7px', font: '500 10px var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                                            Debtor
                                        </TableCell>
                                        <TableCell colSpan={3} align="center" sx={{ borderBottom: 0, borderLeft: '1px solid var(--line)', py: '7px', font: '500 10px var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                                            Loan
                                        </TableCell>
                                        <TableCell colSpan={4} align="center" sx={{ borderBottom: 0, borderLeft: '1px solid var(--line)', py: '7px', font: '500 10px var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                                            Amounts
                                        </TableCell>
                                        <TableCell colSpan={3} align="center" sx={{ borderBottom: 0, borderLeft: '1px solid var(--line)', py: '7px', font: '500 10px var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                                            Status
                                        </TableCell>
                                    </TableRow>
                                    {/* ── Column row ── */}
                                    <TableRow sx={{ bgcolor: 'var(--paper-2)' }}>
                                        <TableCell padding="checkbox" sx={{ py: '6px' }}>
                                            <Checkbox
                                                size="small"
                                                indeterminate={selected.length > 0 && selected.length < filteredRows.length}
                                                checked={filteredRows.length > 0 && selected.length === filteredRows.length}
                                                onChange={handleSelectAll}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ py: '6px', width: 80, fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>Details</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Name</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                                            Email
                                            <Box component="span" sx={{ color: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-mono)', ml: '4px' }}>/ phone</Box>
                                        </TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>App</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Product</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Due</TableCell>
                                        <TableCell align="right" sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Contract</TableCell>
                                        <TableCell align="right" sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Total due</TableCell>
                                        <TableCell align="right" sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Overdue fee</TableCell>
                                        <TableCell align="right" sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Ext.</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Overdue</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Stage</TableCell>
                                        <TableCell sx={{ py: '6px', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>Last result</TableCell>
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
                                    {displayRows.length === 0 && (
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
                            count={filteredRows.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[50, 100, 250, 500]}
                            sx={{ bgcolor: 'var(--paper-2)', borderTop: '1px solid var(--line)' }}
                        />
                        </Box>
                        </>
                    )}
                </>
            )}
            </Box> {/* end content area */}

            <FollowUpDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                selectedTasks={rows.filter(r => selectedSet.has(r.taskId)).map(r => ({
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
                selectedUsers={rows.filter(r => selectedSet.has(r.taskId))}
                onSuccess={() => {
                    setSnackbar({ open: true, message: 'Emails sent successfully', severity: 'success' });
                    setIsEmailDialogOpen(false);
                }}
            />

            <Snackbar
                open={!!snackbar?.open}
                autoHideDuration={8000}
                onClose={() => setSnackbar(null)}
                action={snackbar?.action}
            >
                <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity || 'info'} action={snackbar?.action}>
                    {snackbar?.message}
                </Alert>
            </Snackbar>

            {/* Sticky selection bar */}
            {selected.length > 0 && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        minWidth: 640,
                        maxWidth: 900,
                        bgcolor: 'var(--ink)',
                        color: 'var(--paper)',
                        borderRadius: 'var(--r-md)',
                        boxShadow: 'var(--shadow-modal)',
                        px: '20px',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 1250,
                        animation: 'selectionBarIn var(--dur-base, 180ms) var(--ease, cubic-bezier(0.2,0,0,1)) both',
                        '@keyframes selectionBarIn': {
                            from: { opacity: 0, transform: 'translateX(-50%) translateY(12px)' },
                            to:   { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
                        },
                    }}
                >
                    <Box component="strong" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--paper)', whiteSpace: 'nowrap' }}>
                        {selected.length} selected
                    </Box>
                    <Box sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                        · total due{' '}
                        <Box component="strong" sx={{ color: 'var(--paper)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(selectionTotalDue)}
                        </Box>
                    </Box>
                    {selectionMissingEmail > 0 && (
                        <Box sx={{ fontSize: 12, color: 'oklch(82% 0.15 70)', whiteSpace: 'nowrap' }}>
                            · {selectionMissingEmail} without email
                        </Box>
                    )}
                    <Box sx={{ color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>|</Box>
                    <Button
                        size="small"
                        onClick={() => setIsDialogOpen(true)}
                        sx={{ color: 'var(--paper)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                        Follow up
                    </Button>
                    <Button
                        size="small"
                        onClick={() => setIsEmailDialogOpen(true)}
                        sx={{ color: 'var(--paper)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                        Send email
                    </Button>
                    <Button
                        size="small"
                        onClick={handleExportSelected}
                        sx={{ color: 'var(--paper)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                        Export selected
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button
                        size="small"
                        onClick={() => setSelected([])}
                        sx={{ color: 'var(--ink-3)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'var(--paper)' } }}
                    >
                        Clear
                    </Button>
                </Box>
            )}
        </Paper>
    );
}
