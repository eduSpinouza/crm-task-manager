import { describe, it, expect } from 'vitest';
import { EXPORT_COLUMNS, toRow, type ExportUserData } from '../export/columns';

const baseUser: ExportUserData = {
    taskId: 1,
    orderId: 100,
    userName: 'John Doe',
    phone: '555-1234',
    email: 'john@example.com',
    productName: 'Loan A',
    appName: 'CashApp',
    totalAmount: 5000,
    repayAmount: 5200,
    totalExtensionAmount: 150,
    overdueFee: 50,
    overdueDay: 7,
    repayTime: '2024-03-01',
    stageName: 'Stage 1',
    followResult: 1,
    contact1Phone: '555-0001',
    contact2Phone: '555-0002',
    contact3Phone: '555-0003',
    note: 'some note',
};

describe('EXPORT_COLUMNS', () => {
    it('has 19 columns', () => {
        expect(EXPORT_COLUMNS).toHaveLength(19);
    });

    it('maps totalAmount to "Contract Amount" (label quirk)', () => {
        const col = EXPORT_COLUMNS.find(c => c.key === 'totalAmount');
        expect(col?.header).toBe('Contract Amount');
    });

    it('maps repayAmount to "Total Amount" (label quirk)', () => {
        const col = EXPORT_COLUMNS.find(c => c.key === 'repayAmount');
        expect(col?.header).toBe('Total Amount');
    });

    it('includes email column', () => {
        const col = EXPORT_COLUMNS.find(c => c.key === 'email');
        expect(col?.header).toBe('Email');
    });

    it('includes contact phone columns', () => {
        const keys = EXPORT_COLUMNS.map(c => c.key);
        expect(keys).toContain('contact1Phone');
        expect(keys).toContain('contact2Phone');
        expect(keys).toContain('contact3Phone');
    });
});

describe('toRow', () => {
    it('returns values in EXPORT_COLUMNS key order', () => {
        const row = toRow(baseUser);
        EXPORT_COLUMNS.forEach((col, i) => {
            const expected = baseUser[col.key];
            expect(row[i]).toBe(expected === null || expected === undefined ? '' : expected);
        });
    });

    it('converts undefined optional fields to empty string', () => {
        const user: ExportUserData = {
            ...baseUser,
            email: undefined,
            totalExtensionAmount: undefined,
            contact1Phone: undefined,
            contact2Phone: undefined,
            contact3Phone: undefined,
        };
        const row = toRow(user);
        const emailIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'email');
        const extIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'totalExtensionAmount');
        const c1Idx = EXPORT_COLUMNS.findIndex(c => c.key === 'contact1Phone');
        expect(row[emailIdx]).toBe('');
        expect(row[extIdx]).toBe('');
        expect(row[c1Idx]).toBe('');
    });

    it('converts null to empty string', () => {
        const user = { ...baseUser, email: null as unknown as string };
        const row = toRow(user);
        const emailIdx = EXPORT_COLUMNS.findIndex(c => c.key === 'email');
        expect(row[emailIdx]).toBe('');
    });

    it('preserves numeric zero values', () => {
        const user = { ...baseUser, totalExtensionAmount: 0 };
        const row = toRow(user);
        const idx = EXPORT_COLUMNS.findIndex(c => c.key === 'totalExtensionAmount');
        expect(row[idx]).toBe(0);
    });

    it('returns row of same length as EXPORT_COLUMNS', () => {
        expect(toRow(baseUser)).toHaveLength(EXPORT_COLUMNS.length);
    });
});
