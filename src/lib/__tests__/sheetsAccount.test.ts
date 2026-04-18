import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @upstash/redis ────────────────────────────────────────────────────
const store = new Map<string, unknown>();

const redisMock = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); return 'OK'; }),
    del: vi.fn(async (key: string) => { const existed = store.has(key); store.delete(key); return existed ? 1 : 0; }),
};

vi.mock('@upstash/redis', () => ({
    Redis: {
        fromEnv: vi.fn(() => redisMock),
    },
}));

process.env.KV_REST_API_URL = 'https://fake.upstash.io';
process.env.KV_REST_API_TOKEN = 'fake-token';

// Import AFTER mocks are in place
import { getSheetsAccount, setSheetsAccount, deleteSheetsAccount } from '../sheetsAccount';

const USER = 'testuser';

const sampleAccount = {
    email: 'test@gmail.com',
    refreshToken: 'rt_abc123',
    createdAt: 1700000000000,
};

function clearStore() {
    store.clear();
    redisMock.get.mockClear();
    redisMock.set.mockClear();
    redisMock.del.mockClear();
}

describe('getSheetsAccount', () => {
    beforeEach(clearStore);

    it('returns null when no account exists', async () => {
        const result = await getSheetsAccount(USER);
        expect(result).toBeNull();
    });

    it('returns the stored account after set', async () => {
        await setSheetsAccount(USER, sampleAccount);
        const result = await getSheetsAccount(USER);
        expect(result).toEqual(sampleAccount);
    });

    it('uses the correct Redis key pattern', async () => {
        await getSheetsAccount(USER);
        expect(redisMock.get).toHaveBeenCalledWith(`sheetsaccount:${USER}`);
    });
});

describe('setSheetsAccount', () => {
    beforeEach(clearStore);

    it('stores the account at the correct key', async () => {
        await setSheetsAccount(USER, sampleAccount);
        expect(store.get(`sheetsaccount:${USER}`)).toEqual(sampleAccount);
    });

    it('overwrites an existing account', async () => {
        await setSheetsAccount(USER, sampleAccount);
        const updated = { ...sampleAccount, email: 'new@gmail.com', refreshToken: 'rt_new' };
        await setSheetsAccount(USER, updated);
        const result = await getSheetsAccount(USER);
        expect(result?.email).toBe('new@gmail.com');
        expect(result?.refreshToken).toBe('rt_new');
    });
});

describe('deleteSheetsAccount', () => {
    beforeEach(clearStore);

    it('returns true and removes the account', async () => {
        await setSheetsAccount(USER, sampleAccount);
        const deleted = await deleteSheetsAccount(USER);
        expect(deleted).toBe(true);
        expect(await getSheetsAccount(USER)).toBeNull();
    });

    it('returns false when no account exists', async () => {
        const deleted = await deleteSheetsAccount(USER);
        expect(deleted).toBe(false);
    });
});
