import { describe, it, expect } from 'vitest';
import { groupByUserId } from '../duplicateUtils';

const row = (taskId: number, userId?: number) => ({ taskId, userId });

describe('groupByUserId', () => {
    it('returns empty groups for empty input', () => {
        const { duplicateGroups, singleRows } = groupByUserId([]);
        expect(duplicateGroups).toEqual([]);
        expect(singleRows).toEqual([]);
    });

    it('puts a single unique row in singleRows', () => {
        const rows = [row(1, 100)];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(singleRows).toHaveLength(1);
        expect(duplicateGroups).toHaveLength(0);
    });

    it('groups two rows with the same userId as a duplicate group', () => {
        const rows = [row(1, 100), row(2, 100)];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(duplicateGroups).toHaveLength(1);
        expect(duplicateGroups[0]).toHaveLength(2);
        expect(singleRows).toHaveLength(0);
    });

    it('groups three rows with the same userId as one group', () => {
        const rows = [row(1, 42), row(2, 42), row(3, 42)];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(duplicateGroups).toHaveLength(1);
        expect(duplicateGroups[0]).toHaveLength(3);
    });

    it('correctly separates two duplicate groups from single rows', () => {
        const rows = [
            row(1, 10), row(2, 10),   // group A
            row(3, 20), row(4, 20),   // group B
            row(5, 30),               // single
            row(6, 40),               // single
        ];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(duplicateGroups).toHaveLength(2);
        expect(singleRows).toHaveLength(2);
    });

    it('treats rows with no userId as separate singleRows (not grouped)', () => {
        const rows = [row(1, undefined), row(2, undefined)];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        // Each gets a unique key based on taskId — no grouping
        expect(duplicateGroups).toHaveLength(0);
        expect(singleRows).toHaveLength(2);
    });

    it('does not confuse a row with no userId with a row that has a userId', () => {
        const rows = [row(1, undefined), row(2, 999)];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(duplicateGroups).toHaveLength(0);
        expect(singleRows).toHaveLength(2);
    });

    it('preserves all fields of the original row objects', () => {
        const rows = [
            { taskId: 1, userId: 5, userName: 'Alice', phone: '123' },
            { taskId: 2, userId: 5, userName: 'Alice', phone: '123' },
        ];
        const { duplicateGroups } = groupByUserId(rows);
        expect(duplicateGroups[0][0].userName).toBe('Alice');
        expect(duplicateGroups[0][1].taskId).toBe(2);
    });

    it('handles a mix of duplicates and singles with many rows', () => {
        const rows = [
            row(1, 1), row(2, 1), // dup
            row(3, 2),            // single
            row(4, 3), row(5, 3), row(6, 3), // dup of 3
            row(7, 4),            // single
        ];
        const { duplicateGroups, singleRows } = groupByUserId(rows);
        expect(duplicateGroups).toHaveLength(2);
        expect(singleRows).toHaveLength(2);
        const groupOf3 = duplicateGroups.find(g => g.length === 3);
        expect(groupOf3).toBeDefined();
    });
});
