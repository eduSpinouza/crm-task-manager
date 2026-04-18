/**
 * Redis CRUD for the Google Sheets OAuth account.
 *
 * One account per CRM user (single-account model — unlike Gmail where
 * multiple sender addresses are useful, "export to my Drive" only ever
 * needs one Google account).
 *
 * Redis key: sheetsaccount:{username}
 */

import { Redis } from '@upstash/redis';

export interface SheetsAccount {
    email: string;
    refreshToken: string;
    createdAt: number; // epoch ms
}

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

function accountKey(username: string): string {
    return `sheetsaccount:${username}`;
}

export async function getSheetsAccount(username: string): Promise<SheetsAccount | null> {
    const redis = getRedis();
    if (!redis) return null;
    return redis.get<SheetsAccount>(accountKey(username));
}

export async function setSheetsAccount(username: string, acct: SheetsAccount): Promise<void> {
    const redis = getRedis();
    if (!redis) throw new Error('Redis not available');
    await redis.set(accountKey(username), acct);
}

export async function deleteSheetsAccount(username: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    const existing = await redis.get(accountKey(username));
    if (!existing) return false;
    await redis.del(accountKey(username));
    return true;
}
