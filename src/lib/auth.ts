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

interface JWTPayload {
    userId: string;
    sessionId: string;
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
        // Try creating from standard Upstash env vars
        // If not set, it will throw, but we only instantiate this if they ARE set
        try {
            this.redis = Redis.fromEnv();
        } catch (e) {
            // Fallback for Vercel KV legacy env vars if needed, or manual config
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
        // Store session with 24h hard expiry to match JWT
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
    // Check for Upstash/Vercel KV env vars
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
    const session: SessionInfo = {
        sessionId: randomBytes(32).toString('hex'),
        userId,
        ip,
        userAgent,
        createdAt: Date.now(),
    };

    // This automatically invalidates any previous session for this user (by overwriting)
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
// User Store (reads from environment variable)
// ============================================================

export interface UserConfig {
    username: string;
    passwordHash: string;
}

export function getUsers(): UserConfig[] {
    const usersJson = process.env.USERS_CONFIG;
    if (!usersJson) {
        console.warn('USERS_CONFIG env var not set, no users configured');
        return [];
    }
    try {
        return JSON.parse(usersJson);
    } catch (e) {
        console.error('Failed to parse USERS_CONFIG:', e);
        return [];
    }
}

export function findUser(username: string): UserConfig | undefined {
    return getUsers().find(u => u.username === username);
}

export function authenticateUser(username: string, password: string): UserConfig | null {
    const user = findUser(username);
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return user;
}
