import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'crypto';

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
// Session Store (in-memory, swappable interface for future persistence)
// ============================================================

export interface SessionInfo {
    sessionId: string;
    userId: string;
    ip: string;
    userAgent: string;
    createdAt: number;
}

// Interface for future swap to Redis/Postgres
export interface SessionStore {
    set(userId: string, session: SessionInfo): void;
    get(userId: string): SessionInfo | undefined;
    delete(userId: string): void;
    isValid(userId: string, sessionId: string): boolean;
}

class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, SessionInfo>();

    set(userId: string, session: SessionInfo): void {
        this.sessions.set(userId, session);
    }

    get(userId: string): SessionInfo | undefined {
        return this.sessions.get(userId);
    }

    delete(userId: string): void {
        this.sessions.delete(userId);
    }

    isValid(userId: string, sessionId: string): boolean {
        const session = this.sessions.get(userId);
        return session?.sessionId === sessionId;
    }
}

// Singleton session store
export const sessionStore: SessionStore = new InMemorySessionStore();

// ============================================================
// Session Management
// ============================================================

export function createSession(userId: string, ip: string, userAgent: string): SessionInfo {
    const session: SessionInfo = {
        sessionId: randomBytes(32).toString('hex'),
        userId,
        ip,
        userAgent,
        createdAt: Date.now(),
    };

    // This automatically invalidates any previous session for this user
    sessionStore.set(userId, session);

    return session;
}

export function validateSession(userId: string, sessionId: string): boolean {
    return sessionStore.isValid(userId, sessionId);
}

export function destroySession(userId: string): void {
    sessionStore.delete(userId);
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
