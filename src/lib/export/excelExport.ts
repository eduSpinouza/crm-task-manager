/**
 * Excel (.xlsx) export utilities for the user list.
 *
 * buildWorkbook is a pure function (no DOM, no browser APIs) and is safe
 * to call in Node.js for testing. downloadXlsx is browser-only.
 *
 * Large datasets (10k+ rows) will run synchronously on the main thread and
 * may briefly freeze the tab. This is acceptable for typical CRM export
 * sizes; move to a Web Worker if it becomes a problem.
 */

import * as XLSX from 'xlsx';
import { EXPORT_COLUMNS, toRow, type ExportUserData } from './columns';

/**
 * Build an xlsx WorkBook from a user list.
 * Returns a WorkBook with a single sheet named "Users".
 */
export function buildWorkbook(users: ExportUserData[]): XLSX.WorkBook {
    const headers = EXPORT_COLUMNS.map(c => c.header);
    const dataRows = users.map(toRow);
    const aoa = [headers, ...dataRows];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set approximate column widths based on header + data lengths (capped at 40)
    const colWidths = EXPORT_COLUMNS.map((col, i) => {
        let maxLen = col.header.length;
        for (const row of dataRows) {
            const cell = row[i];
            const len = cell === '' ? 0 : String(cell).length;
            if (len > maxLen) maxLen = len;
        }
        return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    return wb;
}

/**
 * Return a default filename for the export, e.g. "user-list-2024-01-15.xlsx".
 */
export function defaultFilename(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `user-list-${yyyy}-${mm}-${dd}.xlsx`;
}

/**
 * Trigger a browser download of the workbook.
 * Browser-only — do not call from server-side or test code.
 */
export function downloadXlsx(wb: XLSX.WorkBook, filename: string): void {
    XLSX.writeFile(wb, filename);
}
