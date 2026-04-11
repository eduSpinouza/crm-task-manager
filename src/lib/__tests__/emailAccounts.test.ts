import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @upstash/redis ────────────────────────────────────────────────────
// We use a simple in-memory store so the tests never hit a real Redis instance.

const store = new Map<string, unknown>();

const redisMock = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); return 'OK'; }),
};

vi.mock('@upstash/redis', () => ({
    Redis: {
        fromEnv: vi.fn(() => redisMock),
    },
}));

// Provide the env vars that getRedis() checks for
process.env.KV_REST_API_URL = 'https://fake.upstash.io';
process.env.KV_REST_API_TOKEN = 'fake-token';

// Import AFTER mocks are in place
import {
    listAccounts,
    getAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
} from '../emailAccounts';

// ── Helpers ───────────────────────────────────────────────────────────────

const USER = 'testuser';

function clearStore() {
    store.clear();
    redisMock.get.mockClear();
    redisMock.set.mockClear();
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('listAccounts', () => {
    beforeEach(clearStore);

    it('returns empty array when no accounts exist', async () => {
        const result = await listAccounts(USER);
        expect(result).toEqual([]);
    });
});

describe('addAccount', () => {
    beforeEach(clearStore);

    it('adds the first account and marks it as default', async () => {
        const acct = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        expect(acct.email).toBe('a@gmail.com');
        expect(acct.isDefault).toBe(true);
        expect(acct.label).toBe('a@gmail.com'); // defaults to email
        expect(acct.id).toBeTruthy();
    });

    it('second account is NOT default by default', async () => {
        await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        const b = await addAccount(USER, { email: 'b@gmail.com', refreshToken: 'token-b' });
        expect(b.isDefault).toBe(false);
    });

    it('respects a custom label', async () => {
        const acct = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a', label: 'Work' });
        expect(acct.label).toBe('Work');
    });

    it('persists both accounts in listAccounts', async () => {
        await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        await addAccount(USER, { email: 'b@gmail.com', refreshToken: 'token-b' });
        const all = await listAccounts(USER);
        expect(all).toHaveLength(2);
    });
});

describe('getAccount', () => {
    beforeEach(clearStore);

    it('retrieves an account by id', async () => {
        const added = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        const found = await getAccount(USER, added.id);
        expect(found?.email).toBe('a@gmail.com');
    });

    it('returns null for unknown id', async () => {
        const found = await getAccount(USER, 'nonexistent');
        expect(found).toBeNull();
    });
});

describe('updateAccount', () => {
    beforeEach(clearStore);

    it('updates the label', async () => {
        const acct = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        await updateAccount(USER, acct.id, { label: 'Personal' });
        const found = await getAccount(USER, acct.id);
        expect(found?.label).toBe('Personal');
    });

    it('returns null for unknown id', async () => {
        const result = await updateAccount(USER, 'nope', { label: 'X' });
        expect(result).toBeNull();
    });
});

describe('deleteAccount', () => {
    beforeEach(clearStore);

    it('removes the account', async () => {
        const acct = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        const ok = await deleteAccount(USER, acct.id);
        expect(ok).toBe(true);
        expect(await listAccounts(USER)).toHaveLength(0);
    });

    it('returns false for unknown id', async () => {
        const ok = await deleteAccount(USER, 'nope');
        expect(ok).toBe(false);
    });

    it('auto-promotes the next account to default when the default is deleted', async () => {
        const a = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        await addAccount(USER, { email: 'b@gmail.com', refreshToken: 'token-b' });

        // a is default; delete it
        await deleteAccount(USER, a.id);
        const remaining = await listAccounts(USER);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].isDefault).toBe(true);
        expect(remaining[0].email).toBe('b@gmail.com');
    });
});

describe('setDefaultAccount', () => {
    beforeEach(clearStore);

    it('makes the chosen account default and clears others', async () => {
        const a = await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        const b = await addAccount(USER, { email: 'b@gmail.com', refreshToken: 'token-b' });

        await setDefaultAccount(USER, b.id);

        const all = await listAccounts(USER);
        const aUpdated = all.find(x => x.id === a.id)!;
        const bUpdated = all.find(x => x.id === b.id)!;

        expect(aUpdated.isDefault).toBe(false);
        expect(bUpdated.isDefault).toBe(true);
    });

    it('returns false for unknown id', async () => {
        const ok = await setDefaultAccount(USER, 'nope');
        expect(ok).toBe(false);
    });

    it('only one account is default at a time', async () => {
        await addAccount(USER, { email: 'a@gmail.com', refreshToken: 'token-a' });
        const b = await addAccount(USER, { email: 'b@gmail.com', refreshToken: 'token-b' });
        await addAccount(USER, { email: 'c@gmail.com', refreshToken: 'token-c' });

        await setDefaultAccount(USER, b.id);

        const all = await listAccounts(USER);
        const defaults = all.filter(x => x.isDefault);
        expect(defaults).toHaveLength(1);
        expect(defaults[0].id).toBe(b.id);
    });
});
