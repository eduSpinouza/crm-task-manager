import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

export interface EmailAccount {
    id: string;
    label: string;        // user-editable, defaults to email address
    email: string;        // Gmail address from Google userinfo
    refreshToken: string; // long-lived, from Google OAuth2
    createdAt: number;    // epoch ms
    isDefault: boolean;
}

// Omit sensitive fields for client-facing responses
export type EmailAccountPublic = Omit<EmailAccount, 'refreshToken'>;

function getRedis(): Redis | null {
    const hasRedis =
        (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
        (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

    if (!hasRedis) return null;

    try {
        return Redis.fromEnv();
    } catch {
        const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) return null;
        return new Redis({ url, token });
    }
}

function accountsKey(username: string): string {
    return `emailaccounts:${username}`;
}

export async function listAccounts(username: string): Promise<EmailAccount[]> {
    const redis = getRedis();
    if (!redis) return [];
    const accounts = await redis.get<EmailAccount[]>(accountsKey(username));
    return accounts ?? [];
}

export async function getAccount(username: string, id: string): Promise<EmailAccount | null> {
    const accounts = await listAccounts(username);
    return accounts.find(a => a.id === id) ?? null;
}

export async function addAccount(
    username: string,
    data: { email: string; refreshToken: string; label?: string }
): Promise<EmailAccount> {
    const redis = getRedis();
    if (!redis) throw new Error('Redis not available');

    const accounts = await listAccounts(username);
    const isFirstAccount = accounts.length === 0;

    const newAccount: EmailAccount = {
        id: randomUUID(),
        label: data.label || data.email,
        email: data.email,
        refreshToken: data.refreshToken,
        createdAt: Date.now(),
        isDefault: isFirstAccount,
    };

    await redis.set(accountsKey(username), [...accounts, newAccount]);
    return newAccount;
}

export async function updateAccount(
    username: string,
    id: string,
    patch: Partial<Pick<EmailAccount, 'label' | 'refreshToken'>>
): Promise<EmailAccount | null> {
    const redis = getRedis();
    if (!redis) return null;

    const accounts = await listAccounts(username);
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return null;

    accounts[idx] = { ...accounts[idx], ...patch };
    await redis.set(accountsKey(username), accounts);
    return accounts[idx];
}

export async function deleteAccount(username: string, id: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    const accounts = await listAccounts(username);
    const filtered = accounts.filter(a => a.id !== id);
    if (filtered.length === accounts.length) return false; // not found

    // If the deleted account was default, make the first remaining one default
    const wasDefault = accounts.find(a => a.id === id)?.isDefault ?? false;
    if (wasDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
    }

    await redis.set(accountsKey(username), filtered);
    return true;
}

export async function setDefaultAccount(username: string, id: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    const accounts = await listAccounts(username);
    const target = accounts.find(a => a.id === id);
    if (!target) return false;

    const updated = accounts.map(a => ({ ...a, isDefault: a.id === id }));
    await redis.set(accountsKey(username), updated);
    return true;
}
