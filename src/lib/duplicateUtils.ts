export interface DuplicateRow {
    userId?: number;
    taskId: number;
}

export interface DuplicateGroups<T extends DuplicateRow> {
    duplicateGroups: T[][];
    singleRows: T[];
}

/**
 * Groups rows by userId. Rows sharing the same userId are considered duplicates
 * (same debtor with multiple repayment plans). Duplicate groups are separated
 * from single rows so they can be floated to the top of the table.
 */
export function groupByUserId<T extends DuplicateRow>(rows: T[]): DuplicateGroups<T> {
    const byUserId = new Map<string, T[]>();

    for (const row of rows) {
        const key = row.userId != null ? String(row.userId) : `__no_uid_${row.taskId}`;
        if (!byUserId.has(key)) byUserId.set(key, []);
        byUserId.get(key)!.push(row);
    }

    const duplicateGroups: T[][] = [];
    const singleRows: T[] = [];

    for (const group of byUserId.values()) {
        if (group.length > 1) duplicateGroups.push(group);
        else singleRows.push(group[0]);
    }

    return { duplicateGroups, singleRows };
}
