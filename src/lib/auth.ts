import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'crypto';
import { Redis } from '@upstash/redis';

// ============================================================
// Password Hashing (scrypt - Node.js built-in, no dependencies)
// ============================================================

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedKey = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, derivedKey);
}

// ============================================================
// JWT (HMAC-SHA256 - Node.js built-in, no dependencies)
// ============================================================

export interface JWTPayload {
    userId: string;
    sessionId: string;
    role: 'admin' | 'user';
    iat: number;
    exp: number;
}

function getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
}

function base64UrlEncode(data: string): string {
    return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
    return Buffer.from(data, 'base64url').toString('utf-8');
}

export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInHours: number = 24): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
        ...payload,
        iat: now,
        exp: now + (expiresInHours * 3600),
    };

    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(fullPayload));
    const signature = createHmac('sha256', getJWTSecret())
        .update(`${header}.${body}`)
        .digest('base64url');

    return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
    try {
        const [header, body, signature] = token.split('.');
        if (!header || !body || !signature) return null;

        // Verify signature
        const expectedSignature = createHmac('sha256', getJWTSecret())
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== expectedSignature) return null;

        // Parse and validate expiry
        const payload: JWTPayload = JSON.parse(base64UrlDecode(body));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp < now) return null;

        return payload;
    } catch {
        return null;
    }
}

// ============================================================
// Session Store (Redis or In-Memory)
// ============================================================

export interface SessionInfo {
    sessionId: string;
    userId: string;
    ip: string;
    userAgent: string;
    createdAt: number;
}

export interface SessionStore {
    set(userId: string, session: SessionInfo): Promise<void>;
    get(userId: string): Promise<SessionInfo | undefined>;
    delete(userId: string): Promise<void>;
    isValid(userId: string, sessionId: string): Promise<boolean>;
}

class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, SessionInfo>();

    async set(userId: string, session: SessionInfo): Promise<void> {
        this.sessions.set(userId, session);
    }

    async get(userId: string): Promise<SessionInfo | undefined> {
        return this.sessions.get(userId);
    }

    async delete(userId: string): Promise<void> {
        this.sessions.delete(userId);
    }

    async isValid(userId: string, sessionId: string): Promise<boolean> {
        const session = this.sessions.get(userId);
        return session?.sessionId === sessionId;
    }
}

class RedisSessionStore implements SessionStore {
    private redis: Redis;

    constructor() {
        try {
            this.redis = Redis.fromEnv();
        } catch (e) {
            const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
            const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
            if (!url || !token) {
                throw new Error("Redis credentials missing");
            }
            this.redis = new Redis({ url, token });
        }
    }

    private getKey(userId: string): string {
        return `session:${userId}`;
    }

    async set(userId: string, session: SessionInfo): Promise<void> {
        await this.redis.set(this.getKey(userId), session, { ex: 86400 });
    }

    async get(userId: string): Promise<SessionInfo | undefined> {
        const session = await this.redis.get<SessionInfo>(this.getKey(userId));
        return session || undefined;
    }

    async delete(userId: string): Promise<void> {
        await this.redis.del(this.getKey(userId));
    }

    async isValid(userId: string, sessionId: string): Promise<boolean> {
        const session = await this.get(userId);
        return session?.sessionId === sessionId;
    }
}

// Factory to choose store
function createSessionStore(): SessionStore {
    const hasRedis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
        (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

    if (hasRedis) {
        console.log('Using RedisSessionStore');
        return new RedisSessionStore();
    } else {
        console.log('Using InMemorySessionStore (sessions will reset on deploy)');
        return new InMemorySessionStore();
    }
}

export const sessionStore: SessionStore = createSessionStore();

// ============================================================
// Session Management
// ============================================================

export async function createSession(userId: string, ip: string, userAgent: string): Promise<SessionInfo> {
    // If a session already exists, the existing user is being kicked — log it
    const existing = await sessionStore.get(userId);
    if (existing) {
        await logKickEvent(userId);
    }

    const session: SessionInfo = {
        sessionId: randomBytes(32).toString('hex'),
        userId,
        ip,
        userAgent,
        createdAt: Date.now(),
    };

    await sessionStore.set(userId, session);
    return session;
}

export async function validateSession(userId: string, sessionId: string): Promise<boolean> {
    return sessionStore.isValid(userId, sessionId);
}

export async function destroySession(userId: string): Promise<void> {
    await sessionStore.delete(userId);
}

// ============================================================
// Login History & Kick Tracking
// ============================================================

export interface LoginEvent {
    timestamp: number;
    ip: string;
    userAgent: string;
    success: boolean;
}

const LOG_KEY = (u: string) => `loginlog:${u}`;
const KICK_KEY = (u: string) => `kicklog:${u}`;
const MAX_LOG_ENTRIES = 20;
const MAX_KICK_ENTRIES = 50;

// In-memory fallbacks for login/kick logs when Redis is unavailable
const inMemoryLoginLogs = new Map<string, LoginEvent[]>();
const inMemoryKickLogs = new Map<string, number[]>();

export async function logLoginEvent(username: string, ip: string, userAgent: string, success: boolean): Promise<void> {
    const event: LoginEvent = { timestamp: Date.now(), ip, userAgent, success };
    const redis = getUserRedis();
    if (redis) {
        const existing = await redis.get<LoginEvent[]>(LOG_KEY(username)) || [];
        const updated = [event, ...existing].slice(0, MAX_LOG_ENTRIES);
        await redis.set(LOG_KEY(username), updated);
    } else {
        const existing = inMemoryLoginLogs.get(username) || [];
        inMemoryLoginLogs.set(username, [event, ...existing].slice(0, MAX_LOG_ENTRIES));
    }
}

export async function getLoginHistory(username: string): Promise<LoginEvent[]> {
    const redis = getUserRedis();
    if (redis) {
        return await redis.get<LoginEvent[]>(LOG_KEY(username)) || [];
    }
    return inMemoryLoginLogs.get(username) || [];
}

export async function logKickEvent(username: string): Promise<void> {
    const now = Date.now();
    const redis = getUserRedis();
    if (redis) {
        const existing = await redis.get<number[]>(KICK_KEY(username)) || [];
        const updated = [now, ...existing].slice(0, MAX_KICK_ENTRIES);
        await redis.set(KICK_KEY(username), updated);
    } else {
        const existing = inMemoryKickLogs.get(username) || [];
        inMemoryKickLogs.set(username, [now, ...existing].slice(0, MAX_KICK_ENTRIES));
    }
}

export async function getKickHistory(username: string): Promise<number[]> {
    const redis = getUserRedis();
    if (redis) {
        return await redis.get<number[]>(KICK_KEY(username)) || [];
    }
    return inMemoryKickLogs.get(username) || [];
}

// ============================================================
// User Store (Redis-backed with USERS_CONFIG env var fallback)
// ============================================================

export type UserRole = 'admin' | 'user';

export interface UserConfig {
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt?: number;
    createdBy?: string;
    blocked?: boolean;
}

// Get a Redis client for user storage (reuse session store's Redis if available)
function getUserRedis(): Redis | null {
    const hasRedis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
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

function userKey(username: string): string {
    return `user:${username}`;
}

// ---- Read operations (Redis-first, then env var fallback) ----

export async function findUserAsync(username: string): Promise<UserConfig | undefined> {
    // Try Redis first
    const redis = getUserRedis();
    if (redis) {
        const user = await redis.get<UserConfig>(userKey(username));
        if (user) return user;
    }

    // Fallback to USERS_CONFIG env var (assumes role: 'admin' for legacy users)
    const envUsers = getEnvUsers();
    const envUser = envUsers.find(u => u.username === username);
    if (envUser) return { ...envUser, role: envUser.role || 'admin' };

    return undefined;
}

export async function listUsersAsync(): Promise<UserConfig[]> {
    const redis = getUserRedis();
    if (!redis) {
        // No Redis — return env var users
        return getEnvUsers().map(u => ({ ...u, role: u.role || 'admin' as UserRole }));
    }

    // Get all user keys from Redis
    const keys = await redis.keys('user:*');
    if (keys.length === 0) {
        // No users in Redis yet — return env var users as fallback
        return getEnvUsers().map(u => ({ ...u, role: u.role || 'admin' as UserRole }));
    }

    const users: UserConfig[] = [];
    for (const key of keys) {
        const user = await redis.get<UserConfig>(key);
        if (user) users.push(user);
    }
    return users;
}

// ---- Write operations (Redis only) ----

export async function createUser(
    username: string,
    password: string,
    role: UserRole,
    createdBy: string
): Promise<UserConfig> {
    const redis = getUserRedis();
    if (!redis) {
        throw new Error('Redis is required for user management. Configure Upstash Redis env vars.');
    }

    // Check if user already exists
    const existing = await redis.get(userKey(username));
    if (existing) {
        throw new Error(`User "${username}" already exists`);
    }

    const user: UserConfig = {
        username,
        passwordHash: hashPassword(password),
        role,
        createdAt: Date.now(),
        createdBy,
    };

    await redis.set(userKey(username), user);
    return user;
}

export async function deleteUserAsync(username: string, requestedBy: string): Promise<void> {
    const redis = getUserRedis();
    if (!redis) {
        throw new Error('Redis is required for user management.');
    }

    if (username === requestedBy) {
        throw new Error('Cannot delete your own account');
    }

    const existing = await redis.get(userKey(username));
    if (!existing) {
        throw new Error(`User "${username}" not found`);
    }

    await redis.del(userKey(username));

    // Also destroy their session if active
    await destroySession(username);
}

export async function seedUsersFromEnv(adminPassword?: string): Promise<{ seeded: string[], skipped: string[], admin?: string }> {
    const redis = getUserRedis();
    if (!redis) {
        throw new Error('Redis is required for seeding.');
    }

    const seeded: string[] = [];
    const skipped: string[] = [];
    let adminCreated: string | undefined;

    // 1. Create default superadmin if password provided and doesn't exist yet
    if (adminPassword) {
        const adminUsername = 'superadmin';
        const existingAdmin = await redis.get(userKey(adminUsername));
        if (existingAdmin) {
            skipped.push(adminUsername);
        } else {
            const admin: UserConfig = {
                username: adminUsername,
                passwordHash: hashPassword(adminPassword),
                role: 'admin',
                createdAt: Date.now(),
                createdBy: 'seed',
            };
            await redis.set(userKey(adminUsername), admin);
            seeded.push(adminUsername);
            adminCreated = adminUsername;
        }
    }

    // 2. Seed USERS_CONFIG users as regular 'user' role
    const envUsers = getEnvUsers();
    for (const user of envUsers) {
        const existing = await redis.get(userKey(user.username));
        if (existing) {
            skipped.push(user.username);
            continue;
        }

        const fullUser: UserConfig = {
            ...user,
            role: 'user',
            createdAt: Date.now(),
            createdBy: 'seed',
        };

        await redis.set(userKey(user.username), fullUser);
        seeded.push(user.username);
    }

    return { seeded, skipped, admin: adminCreated };
}

// ---- Sync functions (backward-compatible, used by login) ----

function getEnvUsers(): UserConfig[] {
    const usersJson = process.env.USERS_CONFIG;
    if (!usersJson) return [];
    try {
        return JSON.parse(usersJson);
    } catch (e) {
        console.error('Failed to parse USERS_CONFIG:', e);
        return [];
    }
}

// Legacy sync functions — still used by tests and backward compat
export function getUsers(): UserConfig[] {
    return getEnvUsers().map(u => ({ ...u, role: u.role || 'admin' as UserRole }));
}

export function findUser(username: string): UserConfig | undefined {
    const users = getUsers();
    return users.find(u => u.username === username);
}

export function authenticateUser(username: string, password: string): UserConfig | null {
    const user = findUser(username);
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return user;
}

// Async version — checks Redis first, then env var
export async function authenticateUserAsync(username: string, password: string): Promise<UserConfig | null> {
    const user = await findUserAsync(username);
    if (!user) return null;
    if (user.blocked) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return user;
}

export async function setUserBlocked(username: string, blocked: boolean): Promise<void> {
    const redis = getUserRedis();
    if (!redis) {
        throw new Error('Redis is required for user management.');
    }

    const user = await redis.get<UserConfig>(userKey(username));
    if (!user) {
        throw new Error(`User "${username}" not found`);
    }

    await redis.set(userKey(username), { ...user, blocked });
}
