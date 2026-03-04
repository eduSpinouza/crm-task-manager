import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
    hashPassword,
    verifyPassword,
    signJWT,
    verifyJWT,
    createSession,
    validateSession,
    destroySession,
    authenticateUser,
    authenticateUserAsync,
    findUser,
    getUsers,
    logLoginEvent,
    getLoginHistory,
    logKickEvent,
    getKickHistory,
    setUserBlocked,
} from '../auth';

// ============================================================
// Setup: Set required env vars before importing auth functions
// ============================================================
beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only';
});

// ============================================================
// Password Hashing
// ============================================================
describe('Password Hashing', () => {
    it('hashPassword produces salt:hash format', () => {
        const hash = hashPassword('testpassword');
        expect(hash).toContain(':');
        const parts = hash.split(':');
        expect(parts).toHaveLength(2);
        expect(parts[0].length).toBe(32); // 16 bytes hex = 32 chars
        expect(parts[1].length).toBe(128); // 64 bytes hex = 128 chars
    });

    it('hashPassword produces unique hashes for same password', () => {
        const hash1 = hashPassword('samepassword');
        const hash2 = hashPassword('samepassword');
        expect(hash1).not.toEqual(hash2); // Different salts
    });

    it('verifyPassword returns true for correct password', () => {
        const hash = hashPassword('correctpassword');
        expect(verifyPassword('correctpassword', hash)).toBe(true);
    });

    it('verifyPassword returns false for wrong password', () => {
        const hash = hashPassword('correctpassword');
        expect(verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('verifyPassword returns false for empty password', () => {
        const hash = hashPassword('correctpassword');
        expect(verifyPassword('', hash)).toBe(false);
    });
});

// ============================================================
// JWT
// ============================================================
describe('JWT', () => {
    it('signJWT + verifyJWT round-trip works', () => {
        const payload = { userId: 'testuser', sessionId: 'session123', role: 'user' as const };
        const token = signJWT(payload);
        const verified = verifyJWT(token);

        expect(verified).not.toBeNull();
        expect(verified!.userId).toBe('testuser');
        expect(verified!.sessionId).toBe('session123');
        expect(verified!.iat).toBeDefined();
        expect(verified!.exp).toBeDefined();
    });

    it('signJWT sets default 24h expiry', () => {
        const token = signJWT({ userId: 'u', sessionId: 's', role: 'user' });
        const payload = verifyJWT(token);

        expect(payload).not.toBeNull();
        expect(payload!.exp - payload!.iat).toBe(24 * 3600);
    });

    it('signJWT respects custom expiry', () => {
        const token = signJWT({ userId: 'u', sessionId: 's', role: 'user' }, 1); // 1 hour
        const payload = verifyJWT(token);

        expect(payload).not.toBeNull();
        expect(payload!.exp - payload!.iat).toBe(3600);
    });

    it('verifyJWT rejects expired token', () => {
        const originalNow = Date.now;
        Date.now = () => new Date('2020-01-01').getTime();
        const token = signJWT({ userId: 'u', sessionId: 's', role: 'user' }, 1);
        Date.now = originalNow; // Restore

        const payload = verifyJWT(token);
        expect(payload).toBeNull();
    });

    it('verifyJWT rejects tampered token', () => {
        const token = signJWT({ userId: 'u', sessionId: 's', role: 'user' });
        const tampered = token.slice(0, -5) + 'XXXXX';

        expect(verifyJWT(tampered)).toBeNull();
    });

    it('verifyJWT rejects malformed token', () => {
        expect(verifyJWT('')).toBeNull();
        expect(verifyJWT('not.a.valid.jwt')).toBeNull();
        expect(verifyJWT('onlyonepart')).toBeNull();
    });

    it('verifyJWT rejects token signed with different secret', () => {
        const token = signJWT({ userId: 'u', sessionId: 's', role: 'user' });

        // Change the secret
        process.env.JWT_SECRET = 'different-secret';
        expect(verifyJWT(token)).toBeNull();

        // Restore
        process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only';
    });
});

// ============================================================
// Session Management (InMemorySessionStore)
// ============================================================
describe('Session Management', () => {
    it('createSession returns session with expected fields', async () => {
        const session = await createSession('user1', '127.0.0.1', 'TestAgent');

        expect(session.sessionId).toBeDefined();
        expect(session.sessionId.length).toBe(64); // 32 bytes hex
        expect(session.userId).toBe('user1');
        expect(session.ip).toBe('127.0.0.1');
        expect(session.userAgent).toBe('TestAgent');
        expect(session.createdAt).toBeDefined();
    });

    it('validateSession returns true for active session', async () => {
        const session = await createSession('user2', '127.0.0.1', 'TestAgent');
        const isValid = await validateSession('user2', session.sessionId);

        expect(isValid).toBe(true);
    });

    it('validateSession returns false for wrong sessionId', async () => {
        await createSession('user3', '127.0.0.1', 'TestAgent');
        const isValid = await validateSession('user3', 'wrong-session-id');

        expect(isValid).toBe(false);
    });

    it('new session invalidates previous session (single-session enforcement)', async () => {
        const session1 = await createSession('user4', '1.1.1.1', 'Device1');
        const session2 = await createSession('user4', '2.2.2.2', 'Device2');

        // Session 1 should be invalid now
        expect(await validateSession('user4', session1.sessionId)).toBe(false);
        // Session 2 should be valid
        expect(await validateSession('user4', session2.sessionId)).toBe(true);
    });

    it('destroySession invalidates session', async () => {
        const session = await createSession('user5', '127.0.0.1', 'TestAgent');
        expect(await validateSession('user5', session.sessionId)).toBe(true);

        await destroySession('user5');
        expect(await validateSession('user5', session.sessionId)).toBe(false);
    });

    it('validateSession returns false for non-existent user', async () => {
        expect(await validateSession('nonexistent', 'any-session')).toBe(false);
    });
});

// ============================================================
// User Store (from USERS_CONFIG env var)
// ============================================================
describe('User Store', () => {
    const testHash = hashPassword('testpass');

    beforeAll(() => {
        process.env.USERS_CONFIG = JSON.stringify([
            { username: 'admin', passwordHash: testHash },
            { username: 'user1', passwordHash: hashPassword('user1pass') },
        ]);
    });

    it('getUsers returns parsed user array', () => {
        const users = getUsers();
        expect(users).toHaveLength(2);
        expect(users[0].username).toBe('admin');
        expect(users[1].username).toBe('user1');
    });

    it('findUser returns matching user', () => {
        const user = findUser('admin');
        expect(user).toBeDefined();
        expect(user!.username).toBe('admin');
    });

    it('findUser returns undefined for non-existent user', () => {
        expect(findUser('nonexistent')).toBeUndefined();
    });

    it('authenticateUser returns user for valid credentials', () => {
        const user = authenticateUser('admin', 'testpass');
        expect(user).not.toBeNull();
        expect(user!.username).toBe('admin');
    });

    it('authenticateUser returns null for wrong password', () => {
        expect(authenticateUser('admin', 'wrongpass')).toBeNull();
    });

    it('authenticateUser returns null for non-existent user', () => {
        expect(authenticateUser('ghost', 'anypass')).toBeNull();
    });

    it('getUsers returns empty array when env var not set', () => {
        const saved = process.env.USERS_CONFIG;
        delete process.env.USERS_CONFIG;

        expect(getUsers()).toEqual([]);

        process.env.USERS_CONFIG = saved;
    });

    it('getUsers returns empty array for invalid JSON', () => {
        const saved = process.env.USERS_CONFIG;
        process.env.USERS_CONFIG = 'not-valid-json';

        expect(getUsers()).toEqual([]);

        process.env.USERS_CONFIG = saved;
    });
});

// ============================================================
// Login History (in-memory fallback — no Redis env vars in tests)
// ============================================================
describe('Login History', () => {
    const testUser = `logintest-${Date.now()}`;

    it('logLoginEvent stores events, getLoginHistory returns newest-first', async () => {
        await logLoginEvent(testUser, '1.1.1.1', 'AgentA', true);
        await logLoginEvent(testUser, '2.2.2.2', 'AgentB', false);

        const history = await getLoginHistory(testUser);
        expect(history.length).toBe(2);
        // Newest first
        expect(history[0].ip).toBe('2.2.2.2');
        expect(history[0].success).toBe(false);
        expect(history[1].ip).toBe('1.1.1.1');
        expect(history[1].success).toBe(true);
    });

    it('logLoginEvent caps history at 20 entries', async () => {
        const capUser = `captest-${Date.now()}`;
        for (let i = 0; i < 25; i++) {
            await logLoginEvent(capUser, `10.0.0.${i}`, 'Bot', true);
        }
        const history = await getLoginHistory(capUser);
        expect(history.length).toBe(20);
        // Most recent entry (last logged) should be first
        expect(history[0].ip).toBe('10.0.0.24');
    });

    it('getLoginHistory returns empty array for unknown user', async () => {
        const history = await getLoginHistory('no-such-user-xyz');
        expect(history).toEqual([]);
    });
});

// ============================================================
// Kick Tracking (in-memory fallback)
// ============================================================
describe('Kick Tracking', () => {
    it('logKickEvent stores timestamps, getKickHistory returns newest-first', async () => {
        const kickUser = `kicktest-${Date.now()}`;

        const before = Date.now();
        await logKickEvent(kickUser);
        await logKickEvent(kickUser);
        const after = Date.now();

        const kicks = await getKickHistory(kickUser);
        expect(kicks.length).toBe(2);
        // Newest first: both timestamps should be in range
        expect(kicks[0]).toBeGreaterThanOrEqual(before);
        expect(kicks[0]).toBeLessThanOrEqual(after);
        expect(kicks[1]).toBeLessThanOrEqual(kicks[0]);
    });

    it('logKickEvent caps history at 50 entries', async () => {
        const capUser = `kickcap-${Date.now()}`;
        for (let i = 0; i < 55; i++) {
            await logKickEvent(capUser);
        }
        const kicks = await getKickHistory(capUser);
        expect(kicks.length).toBe(50);
    });

    it('getKickHistory returns empty array for unknown user', async () => {
        const kicks = await getKickHistory('no-such-user-xyz2');
        expect(kicks).toEqual([]);
    });
});

// ============================================================
// createSession kick integration
// ============================================================
describe('createSession — kick tracking', () => {
    it('createSession over existing session increments kick count', async () => {
        const kickIntegUser = `kick-integ-${Date.now()}`;
        // First session — no existing session, no kick
        await createSession(kickIntegUser, '1.1.1.1', 'Device1');
        const kicksAfterFirst = await getKickHistory(kickIntegUser);
        expect(kicksAfterFirst.length).toBe(0);

        // Second session — existing session found, kick logged
        await createSession(kickIntegUser, '2.2.2.2', 'Device2');
        const kicksAfterSecond = await getKickHistory(kickIntegUser);
        expect(kicksAfterSecond.length).toBe(1);

        // Third session — kick logged again
        await createSession(kickIntegUser, '3.3.3.3', 'Device3');
        const kicksAfterThird = await getKickHistory(kickIntegUser);
        expect(kicksAfterThird.length).toBe(2);
    });

    it('createSession without pre-existing session does NOT log a kick', async () => {
        const freshUser = `fresh-${Date.now()}`;
        await createSession(freshUser, '5.5.5.5', 'FreshDevice');
        const kicks = await getKickHistory(freshUser);
        expect(kicks.length).toBe(0);
    });
});

// ============================================================
// Blocked user (authenticateUserAsync + setUserBlocked)
// Uses in-memory via USERS_CONFIG env var (no Redis in tests)
// ============================================================
describe('Blocked user', () => {
    const blockedUsername = 'blockable';
    const blockedPassword = 'correctpass';

    beforeAll(() => {
        // Add blockable user to USERS_CONFIG
        const existing = JSON.parse(process.env.USERS_CONFIG || '[]');
        process.env.USERS_CONFIG = JSON.stringify([
            ...existing,
            { username: blockedUsername, passwordHash: hashPassword(blockedPassword), role: 'user' },
        ]);
    });

    it('authenticateUserAsync succeeds with correct credentials when not blocked', async () => {
        const user = await authenticateUserAsync(blockedUsername, blockedPassword);
        expect(user).not.toBeNull();
        expect(user!.username).toBe(blockedUsername);
    });

    it('authenticateUserAsync returns null for wrong password', async () => {
        const user = await authenticateUserAsync(blockedUsername, 'wrongpass');
        expect(user).toBeNull();
    });

    it('authenticateUserAsync returns null for unknown user', async () => {
        const user = await authenticateUserAsync('ghost99', 'anypass');
        expect(user).toBeNull();
    });

    it('authenticateUserAsync returns null for blocked user (correct password)', async () => {
        // Directly mark as blocked in USERS_CONFIG (simulate blocked field)
        const existing = JSON.parse(process.env.USERS_CONFIG || '[]');
        const updated = existing.map((u: any) =>
            u.username === blockedUsername ? { ...u, blocked: true } : u
        );
        process.env.USERS_CONFIG = JSON.stringify(updated);

        const user = await authenticateUserAsync(blockedUsername, blockedPassword);
        expect(user).toBeNull();

        // Restore
        const restored = updated.map((u: any) =>
            u.username === blockedUsername ? { ...u, blocked: false } : u
        );
        process.env.USERS_CONFIG = JSON.stringify(restored);
    });

    it('setUserBlocked requires Redis (throws without Redis env vars)', async () => {
        // No Redis env vars in test environment — should throw
        await expect(setUserBlocked(blockedUsername, true)).rejects.toThrow('Redis is required');
    });
});
