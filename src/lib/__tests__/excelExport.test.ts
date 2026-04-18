import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildWorkbook, defaultFilename } from '../export/excelExport';
import { EXPORT_COLUMNS, type ExportUserData } from '../export/columns';

const makeUser = (overrides: Partial<ExportUserData> = {}): ExportUserData => ({
    taskId: 1,
    orderId: 100,
    userName: 'Alice',
    phone: '555-0000',
    email: 'alice@example.com',
    productName: 'Product X',
    appName: 'App Y',
    totalAmount: 1000,
    repayAmount: 1050,
    totalExtensionAmount: 30,
    overdueFee: 10,
    overdueDay: 3,
    repayTime: '2024-06-01',
    stageName: 'Stage A',
    followResult: 0,
    contact1Phone: '555-0001',
    contact2Phone: '',
    contact3Phone: '',
    note: 'test note',
    ...overrides,
});

function sheetRows(ws: XLSX.WorkSheet): unknown[][] {
    return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
}

describe('buildWorkbook', () => {
    it('creates a workbook with a "Users" sheet', () => {
        const wb = buildWorkbook([makeUser()]);
        expect(wb.SheetNames).toContain('Users');
    });

    it('first row contains all header labels from EXPORT_COLUMNS', () => {
        const wb = buildWorkbook([makeUser()]);
        const rows = sheetRows(wb.Sheets['Users']);
        const headers = rows[0];
        expect(headers).toEqual(EXPORT_COLUMNS.map(c => c.header));
    });

    it('pins "Contract Amount" at column index 7 (totalAmount quirk)', () => {
        const wb = buildWorkbook([makeUser()]);
        const rows = sheetRows(wb.Sheets['Users']);
        const headers = rows[0] as string[];
        expect(headers[7]).toBe('Contract Amount');
    });

    it('pins "Total Amount" at column index 8 (repayAmount quirk)', () => {
        const wb = buildWorkbook([makeUser()]);
        const rows = sheetRows(wb.Sheets['Users']);
        const headers = rows[0] as string[];
        expect(headers[8]).toBe('Total Amount');
    });

    it('row count equals users.length + 1 (header row)', () => {
        const users = [makeUser({ taskId: 1 }), makeUser({ taskId: 2 }), makeUser({ taskId: 3 })];
        const wb = buildWorkbook(users);
        const rows = sheetRows(wb.Sheets['Users']);
        expect(rows).toHaveLength(users.length + 1);
    });

    it('empty array produces header-only sheet (1 row)', () => {
        const wb = buildWorkbook([]);
        const rows = sheetRows(wb.Sheets['Users']);
        expect(rows).toHaveLength(1);
    });

    it('formula-injection strings are stored as literals, not evaluated', () => {
        const wb = buildWorkbook([makeUser({ userName: '=SUM(A1)', note: '=HYPERLINK("https://evil.com","click")' })]);
        const rows = sheetRows(wb.Sheets['Users']);
        const userNameIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'userName');
        const noteIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'note');
        expect(rows[1][userNameIdx]).toBe('=SUM(A1)');
        expect(rows[1][noteIdx]).toBe('=HYPERLINK("https://evil.com","click")');
    });

    it('special characters survive round-trip (commas, quotes, unicode)', () => {
        const wb = buildWorkbook([makeUser({ userName: 'José "El Toro", Jr.', note: '你好\nworld' })]);
        const rows = sheetRows(wb.Sheets['Users']);
        const userNameIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'userName');
        expect(rows[1][userNameIdx]).toBe('José "El Toro", Jr.');
    });

    it('sets column widths (!cols) on the sheet', () => {
        const wb = buildWorkbook([makeUser()]);
        const ws = wb.Sheets['Users'];
        expect(ws['!cols']).toBeDefined();
        expect((ws['!cols'] as XLSX.ColInfo[]).length).toBe(EXPORT_COLUMNS.length);
    });
});

describe('defaultFilename', () => {
    it('matches pattern user-list-YYYY-MM-DD.xlsx', () => {
        expect(defaultFilename()).toMatch(/^user-list-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });
});
