/**
 * Shared column definitions for the user-list export feature.
 * Used by both the Excel (.xlsx) and Google Sheets pipelines so column
 * order and header labels stay in sync with the on-screen table.
 *
 * NOTE: totalAmount is rendered on-screen as "Contract Amount" and
 * repayAmount as "Total Amount". These mappings are intentional and must
 * be preserved here.
 */

// Minimal UserData shape needed by the export (mirrors the interface in
// UserListTable.tsx without importing a client-only module into a lib file).
export interface ExportUserData {
    taskId: number;
    orderId: number;
    userName: string;
    phone: string;
    email?: string;
    productName: string;
    appName: string;
    totalAmount: number;
    repayAmount: number;
    totalExtensionAmount?: number;
    overdueFee: number;
    overdueDay: number;
    repayTime: string;
    stageName: string;
    followResult: number;
    contact1Phone?: string;
    contact2Phone?: string;
    contact3Phone?: string;
    note: string;
    // Additional fields from UserData — not included in export but present at runtime
    [key: string]: unknown;
}

export interface ExportColumn {
    key: keyof ExportUserData;
    header: string;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
    { key: 'taskId',               header: 'Task ID' },
    { key: 'orderId',              header: 'Order ID' },
    { key: 'userName',             header: 'User Name' },
    { key: 'phone',                header: 'Phone' },
    { key: 'email',                header: 'Email' },
    { key: 'productName',          header: 'Product' },
    { key: 'appName',              header: 'App Name' },
    { key: 'totalAmount',          header: 'Contract Amount' }, // label quirk preserved
    { key: 'repayAmount',          header: 'Total Amount' },    // label quirk preserved
    { key: 'totalExtensionAmount', header: 'Extension Amount' },
    { key: 'overdueFee',           header: 'Overdue Fee' },
    { key: 'overdueDay',           header: 'Overdue Days' },
    { key: 'repayTime',            header: 'Repay Time' },
    { key: 'stageName',            header: 'Stage' },
    { key: 'followResult',         header: 'Follow Result' },
    { key: 'contact1Phone',        header: 'Contact 1 Phone' },
    { key: 'contact2Phone',        header: 'Contact 2 Phone' },
    { key: 'contact3Phone',        header: 'Contact 3 Phone' },
    { key: 'note',                 header: 'Note' },
];

/**
 * Convert a user record to an ordered array of cell values matching
 * EXPORT_COLUMNS. Undefined/null values become empty string.
 */
export function toRow(u: ExportUserData): (string | number) [] {
    return EXPORT_COLUMNS.map(col => {
        const val = u[col.key];
        if (val === null || val === undefined) return '';
        return val as string | number;
    });
}
